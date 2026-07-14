import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
    from: vi.fn(),
    rpc: vi.fn(),
    channel: vi.fn(),
    removeChannel: vi.fn(),
  },
}))

const { supabase } = await import('../lib/supabaseClient')
const { useAuthStore } = await import('../store/authStore')
const { getConversationStats, getUserStats, getProgressByDay } = await import('../services/analyticsService')
const { default: ConversationStats } = await import('../pages/ConversationStats')
const { default: Dashboard } = await import('../pages/Dashboard')

type SupabaseResult = { data: unknown; error: unknown }

// Mesmos helpers de mock usados em chat-messaging.spec.tsx/ai-correction.spec.tsx.
function makeBuilder(result: SupabaseResult) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.or = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.in = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.gte = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.lt = vi.fn(chain)
  builder.insert = vi.fn(chain)
  builder.single = vi.fn(() => Promise.resolve(result))
  builder.then = (
    resolve: (value: SupabaseResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return builder
}

type ChangeCallback = (payload: { new: Record<string, unknown> }) => void

function makeChannelMock() {
  const callbacksByEvent = new Map<string, ChangeCallback>()

  const channel: Record<string, unknown> = {}
  channel.on = vi.fn((_event: string, filter: { event: string }, callback: ChangeCallback) => {
    callbacksByEvent.set(filter.event, callback)
    return channel
  })
  channel.subscribe = vi.fn(() => channel)
  channel.emit = (event: 'INSERT' | 'UPDATE', row: Record<string, unknown> = {}) => {
    callbacksByEvent.get(event)?.({ new: row })
  }

  return channel as Record<string, unknown> & { emit: (event: 'INSERT' | 'UPDATE', row?: Record<string, unknown>) => void }
}

const fromQueuesByTable = new Map<string, Array<() => unknown>>()

function queueFromOnce(table: string, factory: () => unknown) {
  const queue = fromQueuesByTable.get(table) ?? []
  queue.push(factory)
  fromQueuesByTable.set(table, queue)
}

const channelMocksByName = new Map<string, ReturnType<typeof makeChannelMock>>()

function getChannelMock(name: string) {
  return channelMocksByName.get(name)
}

function mockLoggedInUser(id = 'user-1', email = 'me@example.com') {
  vi.mocked(supabase.auth.getSession).mockResolvedValue({
    data: {
      session: {
        user: { id, email, created_at: '2026-01-01T00:00:00Z' },
      },
    },
    error: null,
  } as never)
}

/** Queues a full `listConversations` round-trip: conversations + friend rpc + message preview. */
function queueListConversations(conversationRows: Record<string, unknown>[]) {
  queueFromOnce('conversations', () => makeBuilder({ data: conversationRows, error: null }))
  queueFromOnce('messages', () => makeBuilder({ data: [], error: null }))
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, isLoading: true })
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as never)
  vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never)

  channelMocksByName.clear()
  vi.mocked(supabase.channel).mockImplementation((name: string) => {
    const mock = makeChannelMock()
    channelMocksByName.set(name, mock)
    return mock as never
  })

  fromQueuesByTable.clear()
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const queue = fromQueuesByTable.get(table)
    if (queue && queue.length > 0) {
      return queue.shift()!() as never
    }
    return makeBuilder({ data: [], error: null }) as never
  })
})

describe('analyticsService.getConversationStats (Fatia 1 + 2)', () => {
  it('calcula acurácia, top erros e comparação você vs amigo', async () => {
    queueFromOnce('messages', () =>
      makeBuilder({ data: Array.from({ length: 20 }, (_, i) => ({ id: `msg-${i}` })), error: null }),
    )
    queueFromOnce('corrections', () =>
      makeBuilder({
        data: [
          { error_type: 'VERB_TENSE', error_category: 'grammar', sender_id: 'user-1' },
          { error_type: 'VERB_TENSE', error_category: 'grammar', sender_id: 'friend-1' },
          { error_type: 'SPELLING_WEATHER', error_category: 'spelling', sender_id: 'user-1' },
        ],
        error: null,
      }),
    )

    const stats = await getConversationStats('conv-1', 'user-1')

    expect(stats.totalMessages).toBe(20)
    // 20 mensagens, 3 com erro -> (20-3)/20 * 100 = 85%
    expect(stats.accuracy).toBe(85)
    expect(stats.topErrors).toEqual([
      { errorType: 'VERB_TENSE', category: 'grammar', label: 'Verb Tense', count: 2 },
      { errorType: 'SPELLING_WEATHER', category: 'spelling', label: 'Spelling Weather', count: 1 },
    ])
    expect(stats.yourErrorCount).toBe(2)
    expect(stats.friendErrorCount).toBe(1)
  })

  it('conversa sem mensagens tem acurácia 100% (sem divisão por zero)', async () => {
    queueFromOnce('messages', () => makeBuilder({ data: [], error: null }))
    queueFromOnce('corrections', () => makeBuilder({ data: [], error: null }))

    const stats = await getConversationStats('conv-empty', 'user-1')

    expect(stats.totalMessages).toBe(0)
    expect(stats.accuracy).toBe(100)
    expect(stats.topErrors).toEqual([])
  })

  it('múltiplos erros na MESMA mensagem contam como 1 erro (limitação já garantida por message_id unique)', async () => {
    queueFromOnce('messages', () => makeBuilder({ data: [{ id: 'msg-1' }, { id: 'msg-2' }], error: null }))
    // corrections só tem 1 linha por mensagem (constraint unique em message_id) —
    // mesmo que a mensagem tivesse "vários erros" na LanguageTool, só o
    // primeiro Grammar/Spelling vira uma correção salva.
    queueFromOnce('corrections', () =>
      makeBuilder({ data: [{ error_type: 'A', error_category: 'grammar', sender_id: 'user-1' }], error: null }),
    )

    const stats = await getConversationStats('conv-1', 'user-1')

    expect(stats.accuracy).toBe(50)
  })
})

describe('analyticsService.getUserStats (Fatia 3)', () => {
  it('agrega mensagens/corrections de TODAS as conversas, só contando as que o usuário enviou', async () => {
    queueListConversations([
      { id: 'conv-1', user1_id: 'user-1', user2_id: 'friend-1', learning_language: 'en-US', created_at: '2026-01-01T00:00:00Z' },
      { id: 'conv-2', user1_id: 'user-1', user2_id: 'friend-2', learning_language: 'pt-BR', created_at: '2026-01-02T00:00:00Z' },
    ])
    queueFromOnce('messages', () =>
      makeBuilder({
        data: Array.from({ length: 10 }, (_, i) => ({ id: `msg-${i}`, created_at: '2026-07-01T00:00:00Z' })),
        error: null,
      }),
    )
    queueFromOnce('corrections', () =>
      makeBuilder({
        data: [
          { error_type: 'A', error_category: 'grammar', created_at: '2026-07-01T00:00:00Z' },
          { error_type: 'B', error_category: 'spelling', created_at: '2026-07-01T00:00:00Z' },
        ],
        error: null,
      }),
    )

    const stats = await getUserStats('user-1')

    expect(stats.totalMessages).toBe(10)
    expect(stats.accuracy).toBe(80)
    expect(stats.topErrors).toHaveLength(2)
    expect(stats.languages.sort()).toEqual(['en-US', 'pt-BR'])
  })

  it('filtra por idioma: só considera conversas daquele idioma', async () => {
    queueListConversations([
      { id: 'conv-1', user1_id: 'user-1', user2_id: 'friend-1', learning_language: 'en-US', created_at: '2026-01-01T00:00:00Z' },
      { id: 'conv-2', user1_id: 'user-1', user2_id: 'friend-2', learning_language: 'pt-BR', created_at: '2026-01-02T00:00:00Z' },
    ])
    const messagesInSpy = vi.fn(function inCall(this: Record<string, unknown>) {
      return this
    })
    queueFromOnce('messages', () => {
      const builder = makeBuilder({ data: [{ id: 'msg-1', created_at: '2026-07-01T00:00:00Z' }], error: null })
      builder.in = messagesInSpy.bind(builder)
      return builder
    })
    queueFromOnce('corrections', () => makeBuilder({ data: [], error: null }))

    const stats = await getUserStats('user-1', 'pt-BR')

    expect(messagesInSpy).toHaveBeenCalledWith('conversation_id', ['conv-2'])
    // languages continua mostrando os DOIS idiomas praticados, mesmo filtrado
    expect(stats.languages.sort()).toEqual(['en-US', 'pt-BR'])
  })

  it('usuário sem conversas retorna estatísticas vazias, sem erro', async () => {
    queueListConversations([])

    const stats = await getUserStats('user-1')

    expect(stats).toEqual({ totalMessages: 0, accuracy: 100, topErrors: [], progressByDay: [], languages: [] })
  })
})

describe('analyticsService progresso diário (Fatia 4)', () => {
  it('agrupa mensagens/corrections por dia e omite dias sem mensagens', async () => {
    queueListConversations([
      { id: 'conv-1', user1_id: 'user-1', user2_id: 'friend-1', learning_language: 'en-US', created_at: '2026-01-01T00:00:00Z' },
    ])
    queueFromOnce('messages', () =>
      makeBuilder({
        data: [
          { id: 'm1', created_at: '2026-07-01T10:00:00Z' },
          { id: 'm2', created_at: '2026-07-01T11:00:00Z' },
          { id: 'm3', created_at: '2026-07-03T10:00:00Z' },
        ],
        error: null,
      }),
    )
    queueFromOnce('corrections', () =>
      makeBuilder({ data: [{ error_type: 'A', error_category: 'grammar', created_at: '2026-07-01T10:00:00Z' }], error: null }),
    )

    const stats = await getUserStats('user-1')

    expect(stats.progressByDay).toEqual([
      { date: '2026-07-01', totalMessages: 2, correctMessages: 1, accuracy: 50 },
      { date: '2026-07-03', totalMessages: 1, correctMessages: 1, accuracy: 100 },
    ])
    // não existe entrada para 07-02: nenhuma mensagem naquele dia
    expect(stats.progressByDay.find((day) => day.date === '2026-07-02')).toBeUndefined()
  })

  it('getProgressByDay busca só os últimos N dias, filtrado por sender_id', async () => {
    queueListConversations([
      { id: 'conv-1', user1_id: 'user-1', user2_id: 'friend-1', learning_language: 'en-US', created_at: '2026-01-01T00:00:00Z' },
    ])
    const eqSpy = vi.fn(function eqCall(this: Record<string, unknown>) {
      return this
    })
    const gteSpy = vi.fn(function gteCall(this: Record<string, unknown>) {
      return this
    })
    queueFromOnce('messages', () => {
      const builder = makeBuilder({ data: [], error: null })
      builder.eq = eqSpy.bind(builder)
      builder.gte = gteSpy.bind(builder)
      return builder
    })
    queueFromOnce('corrections', () => makeBuilder({ data: [], error: null }))

    await getProgressByDay('user-1', 7)

    expect(eqSpy).toHaveBeenCalledWith('sender_id', 'user-1')
    expect(gteSpy).toHaveBeenCalledWith('created_at', expect.any(String))
  })
})

describe('Página de estatísticas da conversa (Fatia 2)', () => {
  function renderConversationStats(conversationId = 'conv-1') {
    return render(
      <MemoryRouter initialEntries={[`/chat/${conversationId}/stats`]}>
        <Routes>
          <Route path="/chat/:conversationId/stats" element={<ConversationStats />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('mostra acurácia, top erros e comparação você vs amigo', async () => {
    mockLoggedInUser('user-1')
    queueFromOnce('messages', () =>
      makeBuilder({ data: Array.from({ length: 20 }, (_, i) => ({ id: `msg-${i}` })), error: null }),
    )
    queueFromOnce('corrections', () =>
      makeBuilder({
        data: [
          { error_type: 'VERB_TENSE', error_category: 'grammar', sender_id: 'user-1' },
          { error_type: 'VERB_TENSE', error_category: 'grammar', sender_id: 'user-1' },
          { error_type: 'VERB_TENSE', error_category: 'grammar', sender_id: 'friend-1' },
        ],
        error: null,
      }),
    )

    renderConversationStats()

    expect(await screen.findByText('85%')).toBeInTheDocument()
    expect(screen.getByText('20 messages')).toBeInTheDocument()
    expect(screen.getByText('Verb Tense')).toBeInTheDocument()
    expect(screen.getByText('3x')).toBeInTheDocument()
    // comparação: 2 erros do usuário logado, 1 do amigo
    const comparisonHeading = screen.getByText('Errors this conversation')
    const comparisonCard = comparisonHeading.closest('div')!
    expect(within(comparisonCard).getByText('2')).toBeInTheDocument()
    expect(within(comparisonCard).getByText('1')).toBeInTheDocument()
  })

  it('dados atualizam em tempo real quando uma correção nova chega (Realtime)', async () => {
    mockLoggedInUser('user-1')
    queueFromOnce('messages', () => makeBuilder({ data: [{ id: 'msg-1' }, { id: 'msg-2' }], error: null }))
    queueFromOnce('corrections', () => makeBuilder({ data: [], error: null }))

    renderConversationStats()

    expect(await screen.findByText('100%')).toBeInTheDocument()

    // Refetch após o evento Realtime: agora 1 das 2 mensagens tem erro
    queueFromOnce('messages', () => makeBuilder({ data: [{ id: 'msg-1' }, { id: 'msg-2' }], error: null }))
    queueFromOnce('corrections', () =>
      makeBuilder({ data: [{ error_type: 'A', error_category: 'grammar', sender_id: 'friend-1' }], error: null }),
    )

    getChannelMock('corrections:conv-1')!.emit('INSERT', {})

    expect(await screen.findByText('50%')).toBeInTheDocument()
  })
})

describe('Dashboard pessoal (Fatia 3 + 4)', () => {
  function renderDashboard() {
    return render(
      <MemoryRouter initialEntries={['/stats']}>
        <Routes>
          <Route path="/stats" element={<Dashboard />} />
        </Routes>
      </MemoryRouter>,
    )
  }

  it('mostra acurácia geral, top 5 erros e idiomas praticados', async () => {
    mockLoggedInUser('user-1')
    queueListConversations([
      { id: 'conv-1', user1_id: 'user-1', user2_id: 'friend-1', learning_language: 'en-US', created_at: '2026-01-01T00:00:00Z' },
      { id: 'conv-2', user1_id: 'user-1', user2_id: 'friend-2', learning_language: 'pt-BR', created_at: '2026-01-02T00:00:00Z' },
    ])
    queueFromOnce('messages', () =>
      makeBuilder({
        data: Array.from({ length: 10 }, (_, i) => ({ id: `msg-${i}`, created_at: '2026-07-01T00:00:00Z' })),
        error: null,
      }),
    )
    queueFromOnce('corrections', () =>
      makeBuilder({
        data: [{ error_type: 'A', error_category: 'grammar', created_at: '2026-07-01T00:00:00Z' }],
        error: null,
      }),
    )

    renderDashboard()

    expect(await screen.findByText('90%')).toBeInTheDocument()
    expect(screen.getByText('A')).toBeInTheDocument()
    expect(screen.getByText(/English/)).toBeInTheDocument()
    expect(screen.getByText(/Português \(Brasil\)/)).toBeInTheDocument()
  })

  it('clicar num idioma filtra as estatísticas para aquele idioma', async () => {
    mockLoggedInUser('user-1')
    queueListConversations([
      { id: 'conv-1', user1_id: 'user-1', user2_id: 'friend-1', learning_language: 'en-US', created_at: '2026-01-01T00:00:00Z' },
      { id: 'conv-2', user1_id: 'user-1', user2_id: 'friend-2', learning_language: 'pt-BR', created_at: '2026-01-02T00:00:00Z' },
    ])
    queueFromOnce('messages', () =>
      makeBuilder({
        data: Array.from({ length: 10 }, (_, i) => ({ id: `msg-${i}`, created_at: '2026-07-01T00:00:00Z' })),
        error: null,
      }),
    )
    queueFromOnce('corrections', () => makeBuilder({ data: [], error: null }))

    const user = userEvent.setup()
    renderDashboard()

    expect(await screen.findByText('100%')).toBeInTheDocument()

    // Filtrando por Português: só 2 mensagens, 1 com erro -> 50%
    queueListConversations([
      { id: 'conv-1', user1_id: 'user-1', user2_id: 'friend-1', learning_language: 'en-US', created_at: '2026-01-01T00:00:00Z' },
      { id: 'conv-2', user1_id: 'user-1', user2_id: 'friend-2', learning_language: 'pt-BR', created_at: '2026-01-02T00:00:00Z' },
    ])
    queueFromOnce('messages', () =>
      makeBuilder({
        data: [
          { id: 'm1', created_at: '2026-07-01T00:00:00Z' },
          { id: 'm2', created_at: '2026-07-01T00:00:00Z' },
        ],
        error: null,
      }),
    )
    queueFromOnce('corrections', () =>
      makeBuilder({ data: [{ error_type: 'B', error_category: 'spelling', created_at: '2026-07-01T00:00:00Z' }], error: null }),
    )

    await user.click(screen.getByRole('button', { name: /Português \(Brasil\)/ }))

    expect(await screen.findByText('50%')).toBeInTheDocument()
  })

  it('mostra mensagem de progresso vazio quando não há dados suficientes', async () => {
    mockLoggedInUser('user-1')
    queueListConversations([
      { id: 'conv-1', user1_id: 'user-1', user2_id: 'friend-1', learning_language: 'en-US', created_at: '2026-01-01T00:00:00Z' },
    ])
    queueFromOnce('messages', () => makeBuilder({ data: [], error: null }))
    queueFromOnce('corrections', () => makeBuilder({ data: [], error: null }))

    renderDashboard()

    expect(await screen.findByTestId('progress-chart')).toHaveTextContent('Not enough data yet')
  })
})

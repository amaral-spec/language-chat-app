import { render, screen, waitFor } from '@testing-library/react'
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
    functions: {
      invoke: vi.fn(() => Promise.resolve({ data: { correction: null }, error: null })),
    },
  },
}))

const { supabase } = await import('../lib/supabaseClient')
const { useAuthStore } = await import('../store/authStore')
const { requestCorrection } = await import('../services/correctionService')
const { default: ChatRoom } = await import('../pages/ChatRoom')

type SupabaseResult = { data: unknown; error: unknown }

// Mesmos helpers de mock usados em chat-messaging.spec.tsx: builder
// genérico encadeável/thenable, e mocks de `supabase.from`/`supabase.channel`
// despachados por tabela/nome de canal (uma correção sempre convive com a
// subscription de mensagens no mesmo ChatRoom, então não dá pra assumir
// "a única chamada").
function makeBuilder(result: SupabaseResult) {
  const builder: Record<string, unknown> = {}
  const chain = () => builder
  builder.select = vi.fn(chain)
  builder.or = vi.fn(chain)
  builder.order = vi.fn(chain)
  builder.in = vi.fn(chain)
  builder.eq = vi.fn(chain)
  builder.limit = vi.fn(chain)
  builder.lt = vi.fn(chain)
  builder.insert = vi.fn(chain)
  builder.update = vi.fn(chain)
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
  channel.emit = (event: 'INSERT' | 'UPDATE', row: Record<string, unknown>) => {
    callbacksByEvent.get(event)?.({ new: row })
  }

  return channel as Record<string, unknown> & {
    emit: (event: 'INSERT' | 'UPDATE', row: Record<string, unknown>) => void
  }
}

const fromQueuesByTable = new Map<string, Array<() => unknown>>()

function queueFromOnce(table: string, factory: () => unknown) {
  const queue = fromQueuesByTable.get(table) ?? []
  queue.push(factory)
  fromQueuesByTable.set(table, queue)
}

const channelMocksByName = new Map<string, ReturnType<typeof makeChannelMock>>()

function getCorrectionsChannelMock(conversationId = 'conv-1') {
  return channelMocksByName.get(`corrections:${conversationId}`)
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

function renderChatRoom(conversationId = 'conv-1') {
  return render(
    <MemoryRouter initialEntries={[`/chat/${conversationId}`]}>
      <Routes>
        <Route path="/chat/:conversationId" element={<ChatRoom />} />
      </Routes>
    </MemoryRouter>,
  )
}

const originalMessageRow = {
  id: 'msg-1',
  conversation_id: 'conv-1',
  sender_id: 'friend-1',
  content: 'I goed to the store',
  created_at: '2026-01-01T00:00:00Z',
}

const correctionRow = {
  id: 'corr-1',
  message_id: 'msg-1',
  conversation_id: 'conv-1',
  corrected_text: 'I went to the store',
  explanation: "Past tense of 'go' is 'went'",
  confidence: 0.92,
  accepted_by_user: false,
  created_at: '2026-01-01T00:00:01Z',
}

function mockOneMessage() {
  mockLoggedInUser()
  queueFromOnce('messages', () => makeBuilder({ data: [originalMessageRow], error: null }))
}

beforeEach(() => {
  vi.clearAllMocks()
  useAuthStore.setState({ user: null, isLoading: true })
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as never)

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

  vi.mocked(supabase.functions.invoke).mockResolvedValue({ data: { correction: null }, error: null } as never)
})

describe('correctionService.requestCorrection (regra de negócio: 5+ caracteres)', () => {
  it('não chama a Edge Function para mensagens com menos de 5 caracteres', () => {
    requestCorrection('msg-1', 'Hi')
    expect(supabase.functions.invoke).not.toHaveBeenCalled()
  })

  it('chama a Edge Function correct-message para mensagens com 5+ caracteres', () => {
    requestCorrection('msg-1', 'Hello there')
    expect(supabase.functions.invoke).toHaveBeenCalledWith('correct-message', {
      body: { messageId: 'msg-1', text: 'Hello there' },
    })
  })
})

describe('Mostrar correções no UI (Fatia 3)', () => {
  it('correção já existente (histórico) aparece com badge, texto corrigido e explicação', async () => {
    mockOneMessage()
    queueFromOnce('corrections', () => makeBuilder({ data: [correctionRow], error: null }))

    renderChatRoom()

    expect(await screen.findByText('Correction')).toBeInTheDocument()
    expect(screen.getByText('I went to the store')).toBeInTheDocument()
    expect(screen.getByText("Past tense of 'go' is 'went'")).toBeInTheDocument()
  })

  it('mensagem sem correção não mostra nenhum CorrectionPanel', async () => {
    mockOneMessage()
    queueFromOnce('corrections', () => makeBuilder({ data: [], error: null }))

    renderChatRoom()

    await screen.findByText('I goed to the store')
    expect(screen.queryByText('Correction')).not.toBeInTheDocument()
  })

  it('correção chega via Realtime (INSERT) e aparece com animação de fade-in', async () => {
    mockOneMessage()
    queueFromOnce('corrections', () => makeBuilder({ data: [], error: null }))

    renderChatRoom()
    await screen.findByText('I goed to the store')
    expect(screen.queryByText('Correction')).not.toBeInTheDocument()

    getCorrectionsChannelMock()!.emit('INSERT', correctionRow)

    expect(await screen.findByText('Correction')).toBeInTheDocument()
    expect(screen.getByTestId('correction-panel').className).toContain('animate-fade-in')
  })
})

describe('Aceitar/Rejeitar correção (Fatia 4)', () => {
  it('click em "Accept" marca accepted_by_user no banco e esconde o painel', async () => {
    mockOneMessage()
    queueFromOnce('corrections', () => makeBuilder({ data: [correctionRow], error: null }))

    const updateSpy = vi.fn(function update(this: Record<string, unknown>, _payload: Record<string, unknown>) {
      return this
    })
    const eqSpy = vi.fn(() => Promise.resolve({ data: null, error: null }))
    queueFromOnce('corrections', () => {
      const builder: Record<string, unknown> = {}
      builder.update = updateSpy.bind(builder)
      builder.eq = eqSpy
      return builder
    })

    const user = userEvent.setup()
    renderChatRoom()

    await screen.findByText('Correction')
    await user.click(screen.getByRole('button', { name: 'Accept' }))

    expect(updateSpy).toHaveBeenCalledWith({ accepted_by_user: true })
    expect(eqSpy).toHaveBeenCalledWith('id', 'corr-1')
    await waitFor(() => {
      expect(screen.queryByText('Correction')).not.toBeInTheDocument()
    })
  })

  it('click em "Dismiss" esconde o painel sem chamar update', async () => {
    mockOneMessage()
    queueFromOnce('corrections', () => makeBuilder({ data: [correctionRow], error: null }))

    const user = userEvent.setup()
    renderChatRoom()

    await screen.findByText('Correction')
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.queryByText('Correction')).not.toBeInTheDocument()
  })

  it('correção já aceita (carregada do histórico) não mostra o painel novamente', async () => {
    mockOneMessage()
    queueFromOnce('corrections', () =>
      makeBuilder({ data: [{ ...correctionRow, accepted_by_user: true }], error: null }),
    )

    renderChatRoom()

    await screen.findByText('I goed to the store')
    expect(screen.queryByText('Correction')).not.toBeInTheDocument()
  })

  it('estado de aceite chega via Realtime (UPDATE) e some para o outro participante também', async () => {
    mockOneMessage()
    queueFromOnce('corrections', () => makeBuilder({ data: [correctionRow], error: null }))

    renderChatRoom()
    await screen.findByText('Correction')

    getCorrectionsChannelMock()!.emit('UPDATE', { ...correctionRow, accepted_by_user: true })

    await waitFor(() => {
      expect(screen.queryByText('Correction')).not.toBeInTheDocument()
    })
  })
})

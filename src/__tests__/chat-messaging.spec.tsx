import { fireEvent, render, screen, waitFor } from '@testing-library/react'
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
const chatService = await import('../services/chatService')
const { useAuthStore } = await import('../store/authStore')
const { default: Conversations } = await import('../pages/Conversations')
const { default: ChatRoom } = await import('../pages/ChatRoom')

type SupabaseResult = { data: unknown; error: unknown }

// Fake Supabase query builder: every chain method returns itself, and the
// builder is awaitable (resolves to `result`) — mirrors how the real
// supabase-js query builder behaves (thenable + chainable).
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
  builder.single = vi.fn(() => Promise.resolve(result))
  builder.then = (
    resolve: (value: SupabaseResult) => unknown,
    reject?: (reason: unknown) => unknown,
  ) => Promise.resolve(result).then(resolve, reject)
  return builder
}

type InsertCallback = (payload: { new: Record<string, unknown> }) => void

/**
 * Canal Realtime falso: encadeável como o real (`channel().on(...).subscribe()`),
 * e captura o callback passado a `.on('postgres_changes', ...)` em
 * `emitInsert`, para que os testes disparem manualmente um INSERT simulado.
 */
function makeChannelMock() {
  let insertCallback: InsertCallback | undefined

  const channel: Record<string, unknown> = {}
  channel.on = vi.fn((_event: string, _filter: unknown, callback: InsertCallback) => {
    insertCallback = callback
    return channel
  })
  channel.subscribe = vi.fn(() => channel)
  channel.emitInsert = (row: Record<string, unknown>) => {
    insertCallback?.({ new: row })
  }

  return channel as Record<string, unknown> & { emitInsert: (row: Record<string, unknown>) => void }
}

// Desde que ChatRoom passou a também assinar corrections (useCorrections),
// `supabase.from`/`supabase.channel` são chamados mais de uma vez por
// render, para tabelas/canais diferentes — não dá mais para assumir "a
// única/última chamada" como os testes antigos faziam. Os mocks abaixo
// despacham por nome de tabela/canal em vez de por ordem de chamada, e
// caem num builder/canal vazio por padrão para chamadas que o teste não
// se importa em controlar (ex: a correction list de um teste que só quer
// testar mensagens).
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

function getMessagesChannelMock(conversationId = 'conv-1') {
  return getChannelMock(`messages:${conversationId}`)
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

function renderConversations() {
  return render(
    <MemoryRouter initialEntries={['/conversations']}>
      <Routes>
        <Route path="/conversations" element={<Conversations />} />
        <Route path="/chat/:conversationId" element={<div>Chat Room</div>} />
      </Routes>
    </MemoryRouter>,
  )
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

/** Promise controlável externamente — usada para segurar a resposta do
 * Supabase e observar o estado otimista antes dela resolver. */
function createDeferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

beforeEach(() => {
  vi.clearAllMocks()
  // useAuthStore é um singleton (Zustand) que sobrevive entre testes; sem
  // resetá-lo aqui, o usuário logado de um teste "vaza" para o próximo.
  useAuthStore.setState({ user: null, isLoading: true })
  vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
    data: { subscription: { unsubscribe: vi.fn() } },
  } as never)

  // Todo render de ChatRoom assina Realtime tanto para mensagens quanto
  // para corrections (dois canais distintos); sem um mock padrão aqui,
  // qualquer teste que não se importa com Realtime quebraria ao montar o
  // chat. Cada canal é guardado por nome, para os testes pegarem o certo.
  channelMocksByName.clear()
  vi.mocked(supabase.channel).mockImplementation((name: string) => {
    const mock = makeChannelMock()
    channelMocksByName.set(name, mock)
    return mock as never
  })

  // `supabase.from` despachado por tabela: um teste que só queira controlar
  // a resposta de `messages` (via queueFromOnce) não precisa se preocupar
  // com a chamada extra a `corrections` feita por useCorrections — ela cai
  // no builder vazio padrão.
  fromQueuesByTable.clear()
  vi.mocked(supabase.from).mockImplementation((table: string) => {
    const queue = fromQueuesByTable.get(table)
    if (queue && queue.length > 0) {
      return queue.shift()!() as never
    }
    return makeBuilder({ data: [], error: null }) as never
  })
})

describe('Dashboard de conversas', () => {
  function mockOneConversationWithMessage() {
    mockLoggedInUser()

    vi.mocked(supabase.from)
      // 1st call: listConversations -> conversations table
      .mockImplementationOnce(
        () =>
          makeBuilder({
            data: [
              {
                id: 'conv-1',
                user1_id: 'user-1',
                user2_id: 'friend-1',
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
            error: null,
          }) as never,
      )
      // 2nd call: listConversations -> messages table
      .mockImplementationOnce(
        () =>
          makeBuilder({
            data: [
              {
                conversation_id: 'conv-1',
                content: 'Hello there',
                created_at: '2026-01-02T00:00:00Z',
              },
            ],
            error: null,
          }) as never,
      )

    vi.mocked(supabase.rpc).mockImplementation((fn: string) => {
      if (fn === 'get_users_by_ids') {
        return Promise.resolve({
          data: [{ id: 'friend-1', email: 'friend@example.com' }],
          error: null,
        }) as never
      }
      return Promise.resolve({ data: null, error: null }) as never
    })
  }

  it('mostra todas as conversas do usuário logado', async () => {
    mockOneConversationWithMessage()

    renderConversations()

    expect(await screen.findByRole('heading', { name: 'Conversations' })).toBeInTheDocument()
    expect(await screen.findByText('friend@example.com')).toBeInTheDocument()
  })

  it('cada conversa mostra avatar do amigo, nome (email) e último preview', async () => {
    mockOneConversationWithMessage()

    renderConversations()

    await screen.findByText('friend@example.com')

    expect(screen.getByText('Hello there')).toBeInTheDocument()

    const avatar = screen.getByTitle('friend@example.com')
    expect(avatar).toHaveTextContent('F')
  })

  it('conversa sem mensagens mostra placeholder de preview', async () => {
    mockLoggedInUser()

    vi.mocked(supabase.from)
      .mockImplementationOnce(
        () =>
          makeBuilder({
            data: [
              {
                id: 'conv-1',
                user1_id: 'user-1',
                user2_id: 'friend-1',
                created_at: '2026-01-01T00:00:00Z',
              },
            ],
            error: null,
          }) as never,
      )
      .mockImplementationOnce(() => makeBuilder({ data: [], error: null }) as never)

    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ id: 'friend-1', email: 'friend@example.com' }],
      error: null,
    } as never)

    renderConversations()

    expect(await screen.findByText('No messages yet')).toBeInTheDocument()
  })

  it('click em uma conversa navega para /chat/:conversationId', async () => {
    mockOneConversationWithMessage()
    const user = userEvent.setup()

    renderConversations()

    const card = await screen.findByRole('button', { name: /friend@example.com/ })
    await user.click(card)

    expect(await screen.findByText('Chat Room')).toBeInTheDocument()
  })
})

describe('Nova conversa', () => {
  it('click em "New Conversation" abre o modal', async () => {
    mockLoggedInUser()
    vi.mocked(supabase.from).mockImplementationOnce(() => makeBuilder({ data: [], error: null }) as never)
    const user = userEvent.setup()

    renderConversations()

    await screen.findByRole('heading', { name: 'Conversations' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New Conversation' }))

    expect(screen.getByRole('dialog', { name: 'New Conversation' })).toBeInTheDocument()
  })

  it('seleciona amigo por email no modal → conversa é criada e navega para o chat', async () => {
    mockLoggedInUser()

    // Dashboard inicial vazio
    vi.mocked(supabase.from).mockImplementationOnce(() => makeBuilder({ data: [], error: null }) as never)

    vi.mocked(supabase.rpc).mockImplementation((fn: string) => {
      if (fn === 'find_user_by_email') {
        return Promise.resolve({
          data: [{ id: 'friend-2', email: 'newfriend@example.com' }],
          error: null,
        }) as never
      }
      return Promise.resolve({ data: [], error: null }) as never
    })

    const user = userEvent.setup()
    renderConversations()

    await screen.findByRole('heading', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: 'New Conversation' }))

    // createConversation: 1) checa existente (vazio) 2) insere
    vi.mocked(supabase.from)
      .mockImplementationOnce(() => makeBuilder({ data: [], error: null }) as never)
      .mockImplementationOnce(
        () =>
          makeBuilder({
            data: {
              id: 'conv-2',
              user1_id: 'user-1',
              user2_id: 'friend-2',
              created_at: '2026-01-03T00:00:00Z',
            },
            error: null,
          }) as never,
      )

    await user.type(screen.getByLabelText("Friend's email"), 'newfriend@example.com')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByText('Chat Room')).toBeInTheDocument()
  })
})

describe('Seleção de idioma ao criar conversa (spec 004, Fatia 2)', () => {
  async function openModal() {
    mockLoggedInUser()
    vi.mocked(supabase.from).mockImplementationOnce(() => makeBuilder({ data: [], error: null }) as never)
    const user = userEvent.setup()

    renderConversations()
    await screen.findByRole('heading', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: 'New Conversation' }))

    return user
  }

  it('modal mostra os 7 idiomas suportados', async () => {
    await openModal()

    expect(screen.getByRole('radio', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Português (Brasil)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Português (Portugal)' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Español' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Français' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Deutsch' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Italiano' })).toBeInTheDocument()
  })

  it('English vem pré-selecionado por padrão', async () => {
    await openModal()

    expect(screen.getByRole('radio', { name: 'English' })).toBeChecked()
  })

  it('seleciona "Português (Brasil)" → conversa é criada com learning_language pt-BR', async () => {
    const user = await openModal()

    vi.mocked(supabase.rpc).mockImplementation((fn: string) => {
      if (fn === 'find_user_by_email') {
        return Promise.resolve({
          data: [{ id: 'friend-3', email: 'friend3@example.com' }],
          error: null,
        }) as never
      }
      return Promise.resolve({ data: [], error: null }) as never
    })

    const insertSpy = vi.fn(function insert(this: Record<string, unknown>, _payload: Record<string, unknown>) {
      return this
    })
    vi.mocked(supabase.from)
      .mockImplementationOnce(() => makeBuilder({ data: [], error: null }) as never)
      .mockImplementationOnce(() => {
        const builder: Record<string, unknown> = {}
        builder.insert = insertSpy.bind(builder)
        builder.select = vi.fn(() => builder)
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 'conv-3',
              user1_id: 'user-1',
              user2_id: 'friend-3',
              learning_language: 'pt-BR',
              created_at: '2026-01-06T00:00:00Z',
            },
            error: null,
          }),
        )
        return builder as never
      })

    await user.type(screen.getByLabelText("Friend's email"), 'friend3@example.com')
    await user.click(screen.getByRole('radio', { name: 'Português (Brasil)' }))
    await user.click(screen.getByRole('button', { name: 'Create' }))

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith({
        user1_id: 'user-1',
        user2_id: 'friend-3',
        learning_language: 'pt-BR',
      })
    })
    expect(await screen.findByText('Chat Room')).toBeInTheDocument()
  })
})

describe('Idioma da conversa no chat (spec 004, Fatia 3)', () => {
  it('mostra "Learning: English 🇺🇸" para conversa com learning_language en-US', async () => {
    mockLoggedInUser()
    queueFromOnce('conversations', () =>
      makeBuilder({
        data: {
          id: 'conv-1',
          user1_id: 'user-1',
          user2_id: 'friend-1',
          learning_language: 'en-US',
          created_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      }),
    )
    queueFromOnce('messages', () => makeBuilder({ data: [], error: null }))

    renderChatRoom()

    expect(await screen.findByText('Learning: English 🇺🇸')).toBeInTheDocument()
  })

  it('mostra "Learning: Português (Brasil) 🇧🇷" para conversa com learning_language pt-BR', async () => {
    mockLoggedInUser()
    queueFromOnce('conversations', () =>
      makeBuilder({
        data: {
          id: 'conv-1',
          user1_id: 'user-1',
          user2_id: 'friend-1',
          learning_language: 'pt-BR',
          created_at: '2026-01-01T00:00:00Z',
        },
        error: null,
      }),
    )
    queueFromOnce('messages', () => makeBuilder({ data: [], error: null }))

    renderChatRoom()

    expect(await screen.findByText('Learning: Português (Brasil) 🇧🇷')).toBeInTheDocument()
  })
})

describe('chatService.createConversation — deduplicação', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('não cria conversa duplicada quando já existe uma entre os dois usuários', async () => {
    vi.mocked(supabase.rpc).mockImplementation((fn: string) => {
      if (fn === 'find_user_by_email') {
        return Promise.resolve({
          data: [{ id: 'friend-1', email: 'friend@example.com' }],
          error: null,
        }) as never
      }
      return Promise.resolve({ data: null, error: null }) as never
    })

    const existingConversation = {
      id: 'conv-existing',
      user1_id: 'user-1',
      user2_id: 'friend-1',
      learning_language: 'pt-BR',
      created_at: '2026-01-01T00:00:00Z',
    }

    vi.mocked(supabase.from).mockImplementationOnce(
      () => makeBuilder({ data: [existingConversation], error: null }) as never,
    )

    // languageCode 'es-ES' é ignorado: já existe uma conversa entre os dois,
    // e o idioma acordado (pt-BR) não pode mudar (spec 004).
    const result = await chatService.createConversation('user-1', 'friend@example.com', 'es-ES')

    expect(result.error).toBeNull()
    expect(result.conversation).toEqual({
      id: 'conv-existing',
      user1Id: 'user-1',
      user2Id: 'friend-1',
      learningLanguage: 'pt-BR',
      createdAt: '2026-01-01T00:00:00Z',
    })
    // Só a query de checagem de existência foi feita — nenhum insert.
    expect(supabase.from).toHaveBeenCalledTimes(1)
  })

  it('cria conversa nova quando não existe uma entre os dois usuários', async () => {
    vi.mocked(supabase.rpc).mockImplementation((fn: string) => {
      if (fn === 'find_user_by_email') {
        return Promise.resolve({
          data: [{ id: 'friend-1', email: 'friend@example.com' }],
          error: null,
        }) as never
      }
      return Promise.resolve({ data: null, error: null }) as never
    })

    const insertSpy = vi.fn(function insert(this: Record<string, unknown>, _payload: Record<string, unknown>) {
      return this
    })
    vi.mocked(supabase.from)
      .mockImplementationOnce(() => makeBuilder({ data: [], error: null }) as never)
      .mockImplementationOnce(() => {
        const builder: Record<string, unknown> = {}
        builder.insert = insertSpy.bind(builder)
        builder.select = vi.fn(() => builder)
        builder.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 'conv-new',
              user1_id: 'user-1',
              user2_id: 'friend-1',
              learning_language: 'en-US',
              created_at: '2026-01-05T00:00:00Z',
            },
            error: null,
          }),
        )
        return builder as never
      })

    // Sem languageCode explícito: padrão é English (regra de negócio da spec 004).
    const result = await chatService.createConversation('user-1', 'friend@example.com')

    expect(result.error).toBeNull()
    expect(result.conversation?.id).toBe('conv-new')
    expect(insertSpy).toHaveBeenCalledWith({
      user1_id: 'user-1',
      user2_id: 'friend-1',
      learning_language: 'en-US',
    })
    expect(supabase.from).toHaveBeenCalledTimes(2)
  })

  it('rejeita email inválido sem chamar o Supabase', async () => {
    const result = await chatService.createConversation('user-1', 'not-an-email')

    expect(result.error).toBe('Invalid email format')
    expect(result.conversation).toBeNull()
    expect(supabase.rpc).not.toHaveBeenCalled()
  })

  it('rejeita quando o email pertence ao próprio usuário', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: [{ id: 'user-1', email: 'me@example.com' }],
      error: null,
    } as never)

    const result = await chatService.createConversation('user-1', 'me@example.com')

    expect(result.error).toBe('You cannot start a conversation with yourself')
    expect(result.conversation).toBeNull()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('retorna erro genérico quando o amigo não é encontrado', async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never)

    const result = await chatService.createConversation('user-1', 'ghost@example.com')

    expect(result.error).toBe('User not found')
    expect(result.conversation).toBeNull()
  })
})

// Sanity check extra: garante que erros no modal aparecem inline sem navegar.
describe('Nova conversa — erro', () => {
  it('mostra erro inline quando o amigo não é encontrado e não navega', async () => {
    mockLoggedInUser()
    vi.mocked(supabase.from).mockImplementationOnce(() => makeBuilder({ data: [], error: null }) as never)
    vi.mocked(supabase.rpc).mockResolvedValue({ data: [], error: null } as never)

    const user = userEvent.setup()
    renderConversations()

    await screen.findByRole('heading', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: 'New Conversation' }))

    await user.type(screen.getByLabelText("Friend's email"), 'ghost@example.com')
    await user.click(screen.getByRole('button', { name: 'Create' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('User not found')
    expect(screen.queryByText('Chat Room')).not.toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByRole('dialog', { name: 'New Conversation' })).toBeInTheDocument()
    })
  })
})

describe('Chat / Envio de mensagens (Fatia 3)', () => {
  function mockEmptyHistory() {
    mockLoggedInUser()
    // useMessages -> getMessages('conv-1')
    queueFromOnce('messages', () => makeBuilder({ data: [], error: null }))
  }

  it('digita mensagem e envia → aparece imediatamente no chat, antes do Supabase responder (otimista)', async () => {
    mockEmptyHistory()

    const deferred = createDeferred<SupabaseResult>()
    queueFromOnce('messages', () => {
      const builder: Record<string, unknown> = {}
      builder.insert = vi.fn(() => builder)
      builder.select = vi.fn(() => builder)
      builder.single = vi.fn(() => deferred.promise)
      return builder
    })

    const user = userEvent.setup()
    renderChatRoom()

    await screen.findByText('No messages yet. Say hello!')

    await user.type(screen.getByLabelText('Message'), 'Hello world')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    // A mensagem aparece imediatamente, mesmo com o insert ainda pendente.
    // `selector: 'p'` evita casar com o próprio <textarea>, que ainda contém
    // o texto digitado nesse ponto (o campo só é limpo após o envio resolver).
    expect(await screen.findByText('Hello world', { selector: 'p' })).toBeInTheDocument()

    // Resolve o insert só depois, para não deixar a promise pendurada.
    deferred.resolve({
      data: {
        id: 'msg-1',
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hello world',
        created_at: '2026-01-01T00:00:05Z',
      },
      error: null,
    })

    await waitFor(() => {
      expect(screen.queryByText('Hello world', { selector: 'p' })).toBeInTheDocument()
    })
  })

  it('mensagem enviada é persistida no banco: insert chamado com conversation_id, sender_id e content corretos', async () => {
    mockEmptyHistory()

    const insertSpy = vi.fn(function insert(this: Record<string, unknown>, _payload: Record<string, unknown>) {
      return this
    })
    queueFromOnce('messages', () => {
      const builder: Record<string, unknown> = {}
      builder.insert = insertSpy.bind(builder)
      builder.select = vi.fn(() => builder)
      builder.single = vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'msg-1',
            conversation_id: 'conv-1',
            sender_id: 'user-1',
            content: 'Hello world',
            created_at: '2026-01-01T00:00:05Z',
          },
          error: null,
        }),
      )
      return builder
    })

    const user = userEvent.setup()
    renderChatRoom()

    await screen.findByText('No messages yet. Say hello!')
    await user.type(screen.getByLabelText('Message'), 'Hello world')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => {
      expect(insertSpy).toHaveBeenCalledWith({
        conversation_id: 'conv-1',
        sender_id: 'user-1',
        content: 'Hello world',
      })
    })
  })

  it('timestamp vem do servidor: o payload enviado ao Supabase não inclui created_at/createdAt', async () => {
    mockEmptyHistory()

    const insertSpy = vi.fn(function insert(this: Record<string, unknown>, _payload: Record<string, unknown>) {
      return this
    })
    queueFromOnce('messages', () => {
      const builder: Record<string, unknown> = {}
      builder.insert = insertSpy.bind(builder)
      builder.select = vi.fn(() => builder)
      builder.single = vi.fn(() =>
        Promise.resolve({
          data: {
            id: 'msg-1',
            conversation_id: 'conv-1',
            sender_id: 'user-1',
            content: 'Hi',
            created_at: '2026-01-01T00:00:05Z',
          },
          error: null,
        }),
      )
      return builder
    })

    const user = userEvent.setup()
    renderChatRoom()

    await screen.findByText('No messages yet. Say hello!')
    await user.type(screen.getByLabelText('Message'), 'Hi')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() => expect(insertSpy).toHaveBeenCalled())
    const insertedPayload = insertSpy.mock.calls[0][0] as Record<string, unknown>
    expect(insertedPayload).not.toHaveProperty('created_at')
    expect(insertedPayload).not.toHaveProperty('createdAt')
  })

  it('ao montar a página do zero (equivalente a recarregar) → histórico carrega via loadHistory', async () => {
    mockLoggedInUser()
    queueFromOnce('messages', () =>
      makeBuilder({
        data: [
          {
            id: 'msg-1',
            conversation_id: 'conv-1',
            sender_id: 'friend-1',
            content: 'Hey there',
            created_at: '2026-01-01T00:00:00Z',
          },
          {
            id: 'msg-2',
            conversation_id: 'conv-1',
            sender_id: 'user-1',
            content: 'Hi back',
            created_at: '2026-01-01T00:00:05Z',
          },
        ],
        error: null,
      }),
    )

    renderChatRoom()

    expect(await screen.findByText('Hey there')).toBeInTheDocument()
    expect(screen.getByText('Hi back')).toBeInTheDocument()
  })

  it('mensagem vazia ou só whitespace é rejeitada no client, sem chamar o Supabase', async () => {
    const result = await chatService.sendMessage('user-1', {
      conversationId: 'conv-1',
      content: '   ',
    })

    expect(result.message).toBeNull()
    expect(result.error).toBeTruthy()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('mensagem com mais de 5000 caracteres é rejeitada no client, sem chamar o Supabase', async () => {
    const tooLong = 'a'.repeat(5001)

    const result = await chatService.sendMessage('user-1', {
      conversationId: 'conv-1',
      content: tooLong,
    })

    expect(result.message).toBeNull()
    expect(result.error).toBeTruthy()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('botão de enviar fica desabilitado quando o campo está vazio ou só com espaços', async () => {
    mockEmptyHistory()
    const user = userEvent.setup()
    renderChatRoom()

    await screen.findByText('No messages yet. Say hello!')

    const sendButton = screen.getByRole('button', { name: 'Send' })
    expect(sendButton).toBeDisabled()

    await user.type(screen.getByLabelText('Message'), '   ')
    expect(sendButton).toBeDisabled()
  })
})

describe('Realtime + Histórico (Fatia 4)', () => {
  function mockEmptyHistory() {
    mockLoggedInUser()
    // useMessages -> loadHistory('conv-1', { limit: 50 })
    queueFromOnce('messages', () => makeBuilder({ data: [], error: null }))
  }

  /** Gera `count` linhas de mensagem em ordem cronológica ASCENDENTE,
   * com ids/timestamps sequenciais a partir de `startIndex`. */
  function buildAscendingMessageRows(count: number, startIndex: number, senderId = 'friend-1') {
    return Array.from({ length: count }, (_, i) => {
      const idx = startIndex + i
      return {
        id: `msg-${idx}`,
        conversation_id: 'conv-1',
        sender_id: senderId,
        content: `Message ${idx}`,
        created_at: new Date(2026, 0, 1, 0, 0, idx).toISOString(),
      }
    })
  }

  it('mensagem enviada por outro usuário aparece via Realtime, sem recarregar a página', async () => {
    mockEmptyHistory()

    renderChatRoom()
    await screen.findByText('No messages yet. Say hello!')

    expect(getMessagesChannelMock()).toBeDefined()

    getMessagesChannelMock()!.emitInsert({
      id: 'msg-remote-1',
      conversation_id: 'conv-1',
      sender_id: 'friend-1',
      content: 'Oi, tudo bem?',
      created_at: '2026-01-01T00:00:10Z',
    })

    expect(await screen.findByText('Oi, tudo bem?')).toBeInTheDocument()
  })

  it('não duplica a própria mensagem quando ela também chega via Realtime', async () => {
    mockEmptyHistory()

    const deferred = createDeferred<SupabaseResult>()
    queueFromOnce('messages', () => {
      const builder: Record<string, unknown> = {}
      builder.insert = vi.fn(() => builder)
      builder.select = vi.fn(() => builder)
      builder.single = vi.fn(() => deferred.promise)
      return builder
    })

    const user = userEvent.setup()
    renderChatRoom()

    await screen.findByText('No messages yet. Say hello!')
    await user.type(screen.getByLabelText('Message'), 'Hello world')
    await user.click(screen.getByRole('button', { name: 'Send' }))

    // Mensagem otimista já está na tela, insert ainda pendente.
    expect(await screen.findByText('Hello world', { selector: 'p' })).toBeInTheDocument()

    const confirmedRow = {
      id: 'msg-1',
      conversation_id: 'conv-1',
      sender_id: 'user-1',
      content: 'Hello world',
      created_at: '2026-01-01T00:00:05Z',
    }

    // O evento Realtime chega ANTES da resposta do insert resolver — o
    // mesmo id não pode gerar uma segunda bolha de mensagem.
    getMessagesChannelMock()!.emitInsert(confirmedRow)
    await waitFor(() => {
      expect(screen.getAllByText('Hello world', { selector: 'p' })).toHaveLength(1)
    })

    // Resolve o insert depois: a otimista deve ser removida (já existe a
    // versão real, entregue pelo Realtime), sem duplicar.
    deferred.resolve({ data: confirmedRow, error: null })
    await waitFor(() => {
      expect(screen.getAllByText('Hello world', { selector: 'p' })).toHaveLength(1)
    })
  })

  it('ao abrir o chat, carrega o histórico via loadHistory com limit 50', async () => {
    mockLoggedInUser()

    const builder = makeBuilder({ data: [], error: null })
    queueFromOnce('messages', () => builder)

    renderChatRoom()

    await screen.findByText('No messages yet. Say hello!')

    expect(builder.eq).toHaveBeenCalledWith('conversation_id', 'conv-1')
    expect(builder.order).toHaveBeenCalledWith('created_at', { ascending: false })
    expect(builder.limit).toHaveBeenCalledWith(50)
  })

  it('scroll para o topo carrega mais 50 mensagens antigas e as adiciona no início, em ordem cronológica ascendente', async () => {
    mockLoggedInUser()

    // Página inicial: 50 mensagens (msg-3..msg-52) — o banco retorna em
    // ordem DESC, loadHistory reverte para ASC antes de devolver.
    const initialAscending = buildAscendingMessageRows(50, 3)
    const olderAscending = buildAscendingMessageRows(3, 0)
    const olderBuilder = makeBuilder({ data: [...olderAscending].reverse(), error: null })

    queueFromOnce('messages', () => makeBuilder({ data: [...initialAscending].reverse(), error: null }))
    queueFromOnce('messages', () => olderBuilder)

    renderChatRoom()

    await screen.findByText('Message 52')
    expect(screen.queryByText('Message 0')).not.toBeInTheDocument()

    const scrollContainer = screen.getByTestId('chat-scroll-container')
    fireEvent.scroll(scrollContainer, { target: { scrollTop: 0 } })

    await screen.findByText('Message 0')

    // Cursor usado para buscar a página seguinte = created_at da mensagem
    // mais antiga já carregada (msg-3).
    expect(olderBuilder.lt).toHaveBeenCalledWith('created_at', initialAscending[0].created_at)

    // Ordem final é cronológica ascendente: 0, 1, 2 (recém-carregadas), 3..52.
    const renderedTexts = screen
      .getAllByText(/^Message \d+$/, { selector: 'p' })
      .map((element) => element.textContent)
    const expectedOrder = [...olderAscending, ...initialAscending].map((row) => row.content)
    expect(renderedTexts).toEqual(expectedOrder)
  })

  it('chama unsubscribe (remove o canal Realtime) ao desmontar o chat', async () => {
    mockEmptyHistory()

    const { unmount } = renderChatRoom()
    await screen.findByText('No messages yet. Say hello!')

    const channelUsed = getMessagesChannelMock()
    expect(channelUsed).toBeDefined()
    expect(supabase.removeChannel).not.toHaveBeenCalled()

    unmount()

    expect(supabase.removeChannel).toHaveBeenCalledWith(channelUsed)
  })
})

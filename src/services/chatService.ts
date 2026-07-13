import { supabase } from '../lib/supabaseClient'
import { validateEmail } from './authService'
import { DEFAULT_LANGUAGE_CODE } from '../constants/languages'
import type {
  Conversation,
  ConversationWithPreview,
  Correction,
  CreateConversationResponse,
  CreateMessagePayload,
  LanguageCode,
  Message,
  SendMessageResponse,
} from '../types'

const MAX_MESSAGE_LENGTH = 5000
const DEFAULT_HISTORY_LIMIT = 50
const CONVERSATION_COLUMNS = 'id, user1_id, user2_id, learning_language, created_at'

interface ConversationRow {
  id: string
  user1_id: string
  user2_id: string
  learning_language: string
  created_at: string
}

interface MessagePreviewRow {
  conversation_id: string
  content: string
  created_at: string
}

interface MessageRow {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  created_at: string
}

interface UserRow {
  id: string
  email: string
}

interface CorrectionRow {
  id: string
  message_id: string
  conversation_id: string
  original_text: string
  corrected_text: string
  explanation: string
  confidence: number
  accepted_by_user: boolean
  created_at: string
}

function mapConversation(row: ConversationRow): Conversation {
  return {
    id: row.id,
    user1Id: row.user1_id,
    user2Id: row.user2_id,
    learningLanguage: row.learning_language as LanguageCode,
    createdAt: row.created_at,
  }
}

function mapCorrection(row: CorrectionRow): Correction {
  return {
    id: row.id,
    messageId: row.message_id,
    conversationId: row.conversation_id,
    originalText: row.original_text,
    correctedText: row.corrected_text,
    explanation: row.explanation,
    confidence: row.confidence,
    acceptedByUser: row.accepted_by_user,
    createdAt: row.created_at,
  }
}

function mapMessage(row: MessageRow): Message {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    senderId: row.sender_id,
    content: row.content,
    createdAt: row.created_at,
  }
}

function getFriendId(conversation: Conversation, userId: string): string {
  return conversation.user1Id === userId ? conversation.user2Id : conversation.user1Id
}

/**
 * Busca as conversas do usuário logado, com o email do "amigo" (o outro
 * participante) e o preview da última mensagem de cada conversa.
 *
 * Não existe uma tabela pública de usuários navegável por id (RLS de
 * `public.users` só permite ver a própria linha), então o email do amigo é
 * resolvido via a RPC `get_users_by_ids` (SECURITY DEFINER, lê `auth.users`
 * apenas para os ids solicitados — ver migration 005).
 */
export async function listConversations(userId: string): Promise<ConversationWithPreview[]> {
  const { data: conversationRows, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
    .order('created_at', { ascending: false })

  if (error || !conversationRows) {
    return []
  }

  const conversations = (conversationRows as ConversationRow[]).map(mapConversation)

  if (conversations.length === 0) {
    return []
  }

  const friendIds = Array.from(new Set(conversations.map((conversation) => getFriendId(conversation, userId))))
  const conversationIds = conversations.map((conversation) => conversation.id)

  const [{ data: friendRows }, { data: messageRows }] = await Promise.all([
    supabase.rpc('get_users_by_ids', { user_ids: friendIds }),
    supabase
      .from('messages')
      .select('conversation_id, content, created_at')
      .in('conversation_id', conversationIds)
      .order('created_at', { ascending: false }),
  ])

  const friendEmailById = new Map<string, string>(
    ((friendRows ?? []) as UserRow[]).map((row) => [row.id, row.email]),
  )

  // Mensagens vêm ordenadas da mais recente para a mais antiga; guardamos
  // apenas a primeira ocorrência por conversa (= a mais recente de cada uma).
  const latestMessageByConversationId = new Map<string, string>()
  for (const message of (messageRows ?? []) as MessagePreviewRow[]) {
    if (!latestMessageByConversationId.has(message.conversation_id)) {
      latestMessageByConversationId.set(message.conversation_id, message.content)
    }
  }

  return conversations.map((conversation) => ({
    ...conversation,
    friendEmail: friendEmailById.get(getFriendId(conversation, userId)) ?? 'Unknown user',
    lastMessagePreview: latestMessageByConversationId.get(conversation.id) ?? null,
  }))
}

/**
 * Cria uma conversa entre `userId` e o usuário dono de `friendEmail`, com
 * `languageCode` como idioma de aprendizado (imutável depois de criada —
 * ver spec 004). Se já existir uma conversa entre os dois (em qualquer
 * ordem de par), retorna a existente em vez de criar uma duplicada — e,
 * nesse caso, `languageCode` é ignorado: o idioma já acordado prevalece.
 */
export async function createConversation(
  userId: string,
  friendEmail: string,
  languageCode: LanguageCode = DEFAULT_LANGUAGE_CODE,
): Promise<CreateConversationResponse> {
  if (!validateEmail(friendEmail)) {
    return { conversation: null, error: 'Invalid email format' }
  }

  const { data: friendRows, error: lookupError } = await supabase.rpc('find_user_by_email', {
    lookup_email: friendEmail,
  })

  if (lookupError || !friendRows || friendRows.length === 0) {
    return { conversation: null, error: 'User not found' }
  }

  const friendId = (friendRows as UserRow[])[0].id

  if (friendId === userId) {
    return { conversation: null, error: 'You cannot start a conversation with yourself' }
  }

  const { data: existingRows, error: existingError } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .or(
      `and(user1_id.eq.${userId},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${userId})`,
    )
    .limit(1)

  if (existingError) {
    return { conversation: null, error: existingError.message }
  }

  if (existingRows && existingRows.length > 0) {
    return { conversation: mapConversation((existingRows as ConversationRow[])[0]), error: null }
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from('conversations')
    .insert({ user1_id: userId, user2_id: friendId, learning_language: languageCode })
    .select(CONVERSATION_COLUMNS)
    .single()

  if (insertError || !insertedRow) {
    return { conversation: null, error: insertError?.message ?? 'Failed to create conversation' }
  }

  return { conversation: mapConversation(insertedRow as ConversationRow), error: null }
}

/**
 * Busca uma conversa pelo id (ex: para mostrar o idioma de aprendizado no
 * header do chat). RLS já restringe a leitura a participantes.
 */
export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const { data, error } = await supabase
    .from('conversations')
    .select(CONVERSATION_COLUMNS)
    .eq('id', conversationId)
    .single()

  if (error || !data) {
    return null
  }

  return mapConversation(data as ConversationRow)
}

/**
 * Valida o conteúdo de uma mensagem antes de qualquer round-trip ao
 * Supabase (fail fast). As mesmas regras existem como constraints no banco
 * (ver migration 003), mas validamos no client para dar feedback imediato e
 * evitar uma chamada de rede desnecessária.
 */
function validateMessageContent(content: string): string | null {
  if (content.trim().length === 0) {
    return 'Message cannot be empty'
  }
  if (content.length > MAX_MESSAGE_LENGTH) {
    return 'Message is too long'
  }
  return null
}

/**
 * Envia uma mensagem para uma conversa. `created_at` nunca é enviado pelo
 * client — o banco preenche via `default now()`, evitando clock skew entre
 * browsers (ver Decisões de Design na spec).
 */
export async function sendMessage(
  senderId: string,
  payload: CreateMessagePayload,
): Promise<SendMessageResponse> {
  const validationError = validateMessageContent(payload.content)
  if (validationError) {
    return { message: null, error: validationError }
  }

  const { data: insertedRow, error: insertError } = await supabase
    .from('messages')
    .insert({
      conversation_id: payload.conversationId,
      sender_id: senderId,
      content: payload.content,
    })
    .select('id, conversation_id, sender_id, content, created_at')
    .single()

  if (insertError || !insertedRow) {
    return { message: null, error: insertError?.message ?? 'Failed to send message' }
  }

  return { message: mapMessage(insertedRow as MessageRow), error: null }
}

/**
 * Busca TODO o histórico de mensagens de uma conversa de uma vez, em ordem
 * cronológica ascendente. Mantida por compatibilidade com quem já a usa;
 * para carregamento paginado (chat com histórico potencialmente grande),
 * prefira `loadHistory`.
 */
export async function getMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  if (error || !data) {
    return []
  }

  return (data as MessageRow[]).map(mapMessage)
}

/**
 * Busca uma página do histórico de uma conversa (paginação por cursor).
 *
 * Busca no banco em ordem DESCENDENTE (mais recentes primeiro) para pegar
 * as `limit` mensagens mais recentes anteriores a `options.before` — e
 * então reverte o resultado antes de retornar, para manter a ordem
 * cronológica ascendente usada em todo o app (mais antigas primeiro).
 *
 * Sem `before`: retorna as `limit` mensagens mais recentes da conversa
 * (uso típico: carregar o chat pela primeira vez).
 * Com `before`: retorna as `limit` mensagens imediatamente anteriores a
 * esse timestamp (uso típico: scroll para cima / "carregar mais antigas").
 */
export async function loadHistory(
  conversationId: string,
  options?: { before?: string; limit?: number },
): Promise<Message[]> {
  const limit = options?.limit ?? DEFAULT_HISTORY_LIMIT

  let query = supabase
    .from('messages')
    .select('id, conversation_id, sender_id, content, created_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (options?.before) {
    query = query.lt('created_at', options.before)
  }

  const { data, error } = await query

  if (error || !data) {
    return []
  }

  return (data as MessageRow[]).map(mapMessage).reverse()
}

/**
 * Assina INSERTs na tabela `messages` filtrados por conversa, via Supabase
 * Realtime (Postgres changes). Dispara `onInsert` para toda linha nova —
 * inclusive mensagens enviadas pelo próprio usuário (o INSERT notifica
 * todos os assinantes do canal, não só "os outros"); cabe ao chamador
 * deduplicar contra a atualização otimista local, se houver.
 *
 * Retorna uma função de unsubscribe que remove o canal — deve ser chamada
 * no cleanup do efeito que criou a subscription (ex: ao desmontar o chat
 * ou trocar de conversa), para não vazar conexões abertas.
 */
export function subscribeToMessages(
  conversationId: string,
  onInsert: (message: Message) => void,
): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: { new: MessageRow }) => {
        onInsert(mapMessage(payload.new))
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

/**
 * Assina INSERT (nova correção) e UPDATE (accepted_by_user mudou) na
 * tabela `corrections`, filtrados por conversa. Os dois eventos disparam o
 * mesmo callback — quem chama trata ambos como "esta é a versão atual da
 * correção da mensagem X", sem distinguir criação de atualização.
 *
 * Retorna uma função de unsubscribe, a ser chamada no cleanup do efeito
 * que criou a subscription.
 */
export function subscribeToCorrections(
  conversationId: string,
  onChange: (correction: Correction) => void,
): () => void {
  const channel = supabase
    .channel(`corrections:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'corrections',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: { new: CorrectionRow }) => {
        onChange(mapCorrection(payload.new))
      },
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'corrections',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload: { new: CorrectionRow }) => {
        onChange(mapCorrection(payload.new))
      },
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

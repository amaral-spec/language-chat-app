import { supabase } from '../lib/supabaseClient'
import { listConversations } from './chatService'
import type { ConversationStats, DailyAccuracy, ErrorCategory, ErrorFrequency, LanguageCode, UserStats } from '../types'

const CONVERSATION_TOP_ERRORS_LIMIT = 3
const USER_TOP_ERRORS_LIMIT = 5
const DEFAULT_PROGRESS_DAYS = 30

interface CorrectionStatsRow {
  error_type: string
  error_category: ErrorCategory
}

interface DatedRow {
  created_at: string
}

function isWithinLastDays(iso: string, days: number): boolean {
  return iso >= daysAgoIso(days)
}

/**
 * Acurácia = (mensagens sem erro / total de mensagens) * 100 (regra de
 * negócio da spec). Conversa/usuário sem nenhuma mensagem ainda mostra
 * 100% em vez de dividir por zero — não há erro nenhum registrado.
 */
function computeAccuracy(totalMessages: number, errorMessages: number): number {
  if (totalMessages === 0) return 100
  return Math.round(((totalMessages - errorMessages) / totalMessages) * 100)
}

/** "MORFOLOGIK_RULE_EN_US" -> "Morfologik Rule En Us" — legível na UI. */
function formatErrorLabel(errorType: string): string {
  return errorType
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Agrupa correções por `error_type` (regra específica da LanguageTool, ex:
 * "MORFOLOGIK_RULE_EN_US") e retorna as `limit` mais frequentes, ordenadas
 * por contagem decrescente (regra de negócio: "Top N erros são aqueles com
 * MAIS ocorrências"). Cada mensagem tem no máximo uma correção (constraint
 * unique em `corrections.message_id`), então contar linhas já satisfaz
 * "mensagens com múltiplos erros contam como 1 erro".
 */
function groupTopErrors(corrections: CorrectionStatsRow[], limit: number): ErrorFrequency[] {
  const countByType = new Map<string, { category: ErrorCategory; count: number }>()

  for (const correction of corrections) {
    const current = countByType.get(correction.error_type)
    if (current) {
      current.count += 1
    } else {
      countByType.set(correction.error_type, { category: correction.error_category, count: 1 })
    }
  }

  return Array.from(countByType.entries())
    .map(([errorType, { category, count }]) => ({ errorType, category, label: formatErrorLabel(errorType), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

function toDateKey(iso: string): string {
  return iso.slice(0, 10)
}

/**
 * Agrupa mensagens/correções por dia (granularidade escolhida na spec, ver
 * Decisões de Design) e calcula a acurácia de cada dia. Um dia sem nenhuma
 * mensagem simplesmente não aparece no resultado (regra de negócio: "Sem
 * dados em dia → ponto não aparece"), em vez de aparecer com 0%.
 */
function buildProgressByDay(messages: DatedRow[], corrections: DatedRow[]): DailyAccuracy[] {
  const totalByDay = new Map<string, number>()
  for (const message of messages) {
    const day = toDateKey(message.created_at)
    totalByDay.set(day, (totalByDay.get(day) ?? 0) + 1)
  }

  const errorsByDay = new Map<string, number>()
  for (const correction of corrections) {
    const day = toDateKey(correction.created_at)
    errorsByDay.set(day, (errorsByDay.get(day) ?? 0) + 1)
  }

  return Array.from(totalByDay.entries())
    .map(([date, totalMessages]) => {
      const errorMessages = errorsByDay.get(date) ?? 0
      return {
        date,
        totalMessages,
        correctMessages: totalMessages - errorMessages,
        accuracy: computeAccuracy(totalMessages, errorMessages),
      }
    })
    .sort((a, b) => a.date.localeCompare(b.date))
}

function daysAgoIso(days: number): string {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)
  return cutoff.toISOString()
}

/**
 * Estatísticas de UMA conversa (spec 005, Fatia 2): acurácia sobre TODAS as
 * mensagens da conversa (os dois participantes), top erros mais comuns, e
 * a comparação "você vs amigo" (contagem de erros por `sender_id`,
 * denormalizado em `corrections` — ver migration 013).
 */
export async function getConversationStats(conversationId: string, currentUserId: string): Promise<ConversationStats> {
  const [{ data: messageRows }, { data: correctionRows }] = await Promise.all([
    supabase.from('messages').select('id').eq('conversation_id', conversationId),
    supabase.from('corrections').select('error_type, error_category, sender_id').eq('conversation_id', conversationId),
  ])

  const totalMessages = messageRows?.length ?? 0
  const corrections = (correctionRows ?? []) as (CorrectionStatsRow & { sender_id: string })[]
  const yourErrorCount = corrections.filter((correction) => correction.sender_id === currentUserId).length

  return {
    totalMessages,
    accuracy: computeAccuracy(totalMessages, corrections.length),
    topErrors: groupTopErrors(corrections, CONVERSATION_TOP_ERRORS_LIMIT),
    yourErrorCount,
    friendErrorCount: corrections.length - yourErrorCount,
  }
}

/**
 * Progresso diário de acurácia dos últimos `days` dias (spec 005, Fatia 4),
 * considerando só as mensagens enviadas por `userId` (é o progresso PESSOAL
 * dele, não da conversa inteira). `languageCode` restringe às conversas
 * daquele idioma (usado pelo filtro por idioma do dashboard, Fatia 3).
 */
export async function getProgressByDay(
  userId: string,
  days = DEFAULT_PROGRESS_DAYS,
  languageCode?: LanguageCode,
): Promise<DailyAccuracy[]> {
  const conversations = await listConversations(userId)
  const filteredConversations = languageCode
    ? conversations.filter((conversation) => conversation.learningLanguage === languageCode)
    : conversations
  if (filteredConversations.length === 0) return []

  const conversationIds = filteredConversations.map((conversation) => conversation.id)
  const cutoffIso = daysAgoIso(days)

  const [{ data: messageRows }, { data: correctionRows }] = await Promise.all([
    supabase
      .from('messages')
      .select('created_at')
      .eq('sender_id', userId)
      .in('conversation_id', conversationIds)
      .gte('created_at', cutoffIso),
    supabase
      .from('corrections')
      .select('created_at')
      .eq('sender_id', userId)
      .in('conversation_id', conversationIds)
      .gte('created_at', cutoffIso),
  ])

  return buildProgressByDay((messageRows ?? []) as DatedRow[], (correctionRows ?? []) as DatedRow[])
}

/**
 * Dashboard pessoal (spec 005, Fatia 3): agrega TODAS as conversas do
 * usuário, mas só as mensagens que ELE enviou (é o progresso pessoal dele
 * aprendendo o idioma, não o desempenho do amigo). `languageCode` filtra
 * para um idioma específico (clique num card de idioma, ver Fatia 3) — a
 * lista de `languages` em si nunca é filtrada, para o filtro continuar
 * disponível depois de aplicado.
 */
export async function getUserStats(userId: string, languageCode?: LanguageCode): Promise<UserStats> {
  const conversations = await listConversations(userId)
  const languages = Array.from(new Set(conversations.map((conversation) => conversation.learningLanguage)))
  const filteredConversations = languageCode
    ? conversations.filter((conversation) => conversation.learningLanguage === languageCode)
    : conversations

  if (filteredConversations.length === 0) {
    return { totalMessages: 0, accuracy: 100, topErrors: [], progressByDay: [], languages }
  }

  const conversationIds = filteredConversations.map((conversation) => conversation.id)

  // Uma única busca (sem filtro de data) serve tanto os totais/acurácia
  // "de todos os tempos" quanto o gráfico dos últimos 30 dias (filtrado
  // aqui mesmo, em memória) — evita repetir a query de `listConversations`
  // que `getProgressByDay` faria se fosse chamado separadamente.
  const [{ data: messageRows }, { data: correctionRows }] = await Promise.all([
    supabase.from('messages').select('id, created_at').eq('sender_id', userId).in('conversation_id', conversationIds),
    supabase
      .from('corrections')
      .select('error_type, error_category, created_at')
      .eq('sender_id', userId)
      .in('conversation_id', conversationIds),
  ])

  const messages = (messageRows ?? []) as DatedRow[]
  const corrections = (correctionRows ?? []) as (CorrectionStatsRow & DatedRow)[]

  return {
    totalMessages: messages.length,
    accuracy: computeAccuracy(messages.length, corrections.length),
    topErrors: groupTopErrors(corrections, USER_TOP_ERRORS_LIMIT),
    progressByDay: buildProgressByDay(
      messages.filter((message) => isWithinLastDays(message.created_at, DEFAULT_PROGRESS_DAYS)),
      corrections.filter((correction) => isWithinLastDays(correction.created_at, DEFAULT_PROGRESS_DAYS)),
    ),
    languages,
  }
}

import { supabase } from '../lib/supabaseClient'
import type { Correction, LanguageToolMatch } from '../types'

const MIN_MESSAGE_LENGTH = 5
const MAX_EXPLANATION_LENGTH = 200
const LANGUAGETOOL_TIMEOUT_MS = 3000
const LANGUAGETOOL_API_URL = 'https://api.languagetool.org/v2/check'
const DEFAULT_LANGUAGE = 'en-US'
// LanguageTool não retorna um score de confiança — usamos um valor fixo
// alto, já que só chegamos aqui depois de filtrar por Grammar/Spelling
// (ver Decisões de Design da spec).
const DEFAULT_CONFIDENCE = 0.95
// Só esses dois issueTypes contam como "correção relevante" — Style e
// outras categorias são ignoradas (regra de negócio da spec).
const RELEVANT_ISSUE_TYPES = new Set(['grammar', 'misspelling'])
const UNIQUE_VIOLATION_CODE = '23505'

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

interface ParsedCorrection {
  original: string
  corrected: string
  explanation: string
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

/**
 * Chama a LanguageTool API (pública, sem auth, direto do frontend — ver
 * Decisões de Design da spec) com timeout de `LANGUAGETOOL_TIMEOUT_MS`.
 * Qualquer falha (timeout, rede, resposta malformada) retorna `null` em
 * vez de lançar: falha é sempre silenciosa, nunca mostramos erro de
 * correção ao usuário.
 */
async function callLanguageTool(text: string, language: string): Promise<LanguageToolMatch[] | null> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), LANGUAGETOOL_TIMEOUT_MS)

  try {
    const response = await fetch(LANGUAGETOOL_API_URL, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ text, language }),
      signal: controller.signal,
    })

    if (!response.ok) return null

    const data = (await response.json()) as { matches?: LanguageToolMatch[] }
    return data.matches ?? []
  } catch {
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

/** A mensagem pode ter vários erros; mostramos só o primeiro Grammar/Spelling. */
function pickBestMatch(matches: LanguageToolMatch[]): LanguageToolMatch | null {
  return matches.find((match) => RELEVANT_ISSUE_TYPES.has(match.rule.issueType)) ?? null
}

function toParsedCorrection(text: string, match: LanguageToolMatch): ParsedCorrection | null {
  const replacement = match.replacements[0]?.value
  if (!replacement) return null

  return {
    original: text.substring(match.offset, match.offset + match.length),
    corrected: replacement,
    explanation: match.message.slice(0, MAX_EXPLANATION_LENGTH),
  }
}

/**
 * Verifica a mensagem via LanguageTool e retorna a correção mais
 * relevante (ou `null` se não houver erro de Grammar/Spelling, se a
 * mensagem for curta demais, ou se a chamada falhar/der timeout).
 */
export async function correctMessage(
  text: string,
  language: string = DEFAULT_LANGUAGE,
): Promise<ParsedCorrection | null> {
  if (text.trim().length < MIN_MESSAGE_LENGTH) return null

  const matches = await callLanguageTool(text, language)
  if (!matches) return null

  const bestMatch = pickBestMatch(matches)
  if (!bestMatch) return null

  return toParsedCorrection(text, bestMatch)
}

/**
 * Verifica a mensagem e, se houver correção relevante, grava em
 * `corrections`. Fire-and-forget: quem chama não espera — a correção (se
 * houver) chega aos clients assinados via Realtime (ver
 * `chatService.subscribeToCorrections`). Nunca lança: qualquer falha
 * (rede, timeout, insert) é silenciosa para o usuário.
 */
export function requestCorrection(messageId: string, conversationId: string, text: string): void {
  correctMessage(text).then(async (correction) => {
    if (!correction) return

    const { error } = await supabase.from('corrections').insert({
      message_id: messageId,
      conversation_id: conversationId,
      original_text: correction.original,
      corrected_text: correction.corrected,
      explanation: correction.explanation,
      confidence: DEFAULT_CONFIDENCE,
    })

    // Uma mensagem só pode ter UMA correção: se já existir (ex: chamada
    // duplicada), ignora o conflito sem erro.
    if (error && error.code !== UNIQUE_VIOLATION_CODE) {
      console.error('Failed to save correction', error.message)
    }
  })
}

/**
 * Marca uma correção como aceita (métrica de UI). O client só tem
 * permissão de UPDATE na coluna `accepted_by_user` (ver migration 008) —
 * texto original/corrigido, explicação e confidence nunca são editáveis
 * depois de criados.
 */
export async function markCorrectionAsAccepted(correctionId: string): Promise<void> {
  await supabase.from('corrections').update({ accepted_by_user: true }).eq('id', correctionId)
}

/**
 * Busca todas as correções já geradas para uma conversa (carregamento
 * inicial do histórico) — novas correções chegam via Realtime depois.
 */
export async function listCorrections(conversationId: string): Promise<Correction[]> {
  const { data, error } = await supabase
    .from('corrections')
    .select(
      'id, message_id, conversation_id, original_text, corrected_text, explanation, confidence, accepted_by_user, created_at',
    )
    .eq('conversation_id', conversationId)

  if (error || !data) {
    return []
  }

  return (data as CorrectionRow[]).map(mapCorrection)
}

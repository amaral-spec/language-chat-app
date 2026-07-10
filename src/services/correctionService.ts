import { supabase } from '../lib/supabaseClient'
import type { ClaudeAPIResponse, Correction } from '../types'

const MIN_MESSAGE_LENGTH = 5

interface CorrectionRow {
  id: string
  message_id: string
  conversation_id: string
  corrected_text: string
  explanation: string
  confidence: number
  accepted_by_user: boolean
  created_at: string
}

function mapCorrection(row: CorrectionRow): Correction {
  return {
    id: row.id,
    messageId: row.message_id,
    conversationId: row.conversation_id,
    correctedText: row.corrected_text,
    explanation: row.explanation,
    confidence: row.confidence,
    acceptedByUser: row.accepted_by_user,
    createdAt: row.created_at,
  }
}

/**
 * Dispara a correção de uma mensagem via Edge Function. Fire-and-forget:
 * quem chama não espera a IA responder — a correção (se houver) chega aos
 * clients assinados via Realtime (ver `chatService.subscribeToCorrections`).
 * Qualquer falha (rede, timeout, Edge Function fora do ar) é sempre
 * silenciosa para o usuário, conforme a regra de negócio da spec.
 */
export function requestCorrection(messageId: string, text: string): void {
  if (text.trim().length < MIN_MESSAGE_LENGTH) return

  supabase.functions
    .invoke<ClaudeAPIResponse>('correct-message', {
      body: { messageId, text },
    })
    .catch((error) => {
      console.error('Correction request failed', error)
    })
}

/**
 * Marca uma correção como aceita (métrica de UI). O client só tem
 * permissão de UPDATE na coluna `accepted_by_user` (ver migration 008) —
 * texto corrigido/explicação/confidence só são graváveis pela Edge
 * Function.
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
    .select('id, message_id, conversation_id, corrected_text, explanation, confidence, accepted_by_user, created_at')
    .eq('conversation_id', conversationId)

  if (error || !data) {
    return []
  }

  return (data as CorrectionRow[]).map(mapCorrection)
}

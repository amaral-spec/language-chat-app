import { useEffect, useState } from 'react'
import { subscribeToCorrections } from '../services/chatService'
import { listCorrections } from '../services/correctionService'
import type { Correction } from '../types'

/**
 * Carrega as correções já existentes de uma conversa e assina Realtime
 * para receber novas correções e atualizações de `accepted_by_user` (de
 * qualquer participante, não só o próprio usuário — a correção é
 * educativa para os dois, ver spec).
 *
 * Expõe um map `messageId -> Correction`, já que cada mensagem tem no
 * máximo uma correção (ver constraint unique em `corrections.message_id`).
 */
export function useCorrections(conversationId: string | undefined) {
  const [correctionsByMessageId, setCorrectionsByMessageId] = useState<Record<string, Correction>>({})

  useEffect(() => {
    if (!conversationId) {
      setCorrectionsByMessageId({})
      return
    }

    let isMounted = true

    listCorrections(conversationId).then((corrections) => {
      if (!isMounted) return
      setCorrectionsByMessageId(
        Object.fromEntries(corrections.map((correction) => [correction.messageId, correction])),
      )
    })

    return () => {
      isMounted = false
    }
  }, [conversationId])

  // Subscription separada do carregamento inicial: não deve ser recriada
  // quando `correctionsByMessageId` muda, só quando a conversa muda.
  useEffect(() => {
    if (!conversationId) return

    const unsubscribe = subscribeToCorrections(conversationId, (correction) => {
      setCorrectionsByMessageId((current) => ({ ...current, [correction.messageId]: correction }))
    })

    return unsubscribe
  }, [conversationId])

  return { correctionsByMessageId }
}

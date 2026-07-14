import { useCallback, useEffect, useState } from 'react'
import { subscribeToCorrections } from '../services/chatService'
import { getConversationStats } from '../services/analyticsService'
import type { ConversationStats } from '../types'

/**
 * Carrega as estatísticas de uma conversa e refaz o cálculo sempre que uma
 * correção é criada/atualizada nela (aceitar/rejeitar não muda o número —
 * só accepted_by_user muda — mas recalcular do zero é mais simples e
 * sempre correto do que manter um contador incremental em sincronia com o
 * Realtime, ver regra de negócio "dados aparecem em real-time").
 */
export function useConversationStats(conversationId: string | undefined, currentUserId: string | undefined) {
  const [stats, setStats] = useState<ConversationStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(() => {
    if (!conversationId || !currentUserId) return
    getConversationStats(conversationId, currentUserId).then((result) => {
      setStats(result)
      setIsLoading(false)
    })
  }, [conversationId, currentUserId])

  useEffect(() => {
    if (!conversationId || !currentUserId) {
      setStats(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    refetch()
  }, [conversationId, currentUserId, refetch])

  useEffect(() => {
    if (!conversationId) return
    return subscribeToCorrections(conversationId, () => refetch())
  }, [conversationId, refetch])

  return { stats, isLoading }
}

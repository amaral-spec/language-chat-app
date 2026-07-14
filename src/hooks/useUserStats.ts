import { useCallback, useEffect, useState } from 'react'
import { subscribeToUserCorrections } from '../services/chatService'
import { getUserStats } from '../services/analyticsService'
import type { LanguageCode, UserStats } from '../types'

/**
 * Carrega o dashboard pessoal (todas as conversas do usuário) e refaz o
 * cálculo sempre que uma correção dele muda em QUALQUER conversa — a
 * subscription filtra por `sender_id`, não por uma conversa específica
 * (ver `subscribeToUserCorrections`).
 */
export function useUserStats(userId: string | undefined, languageCode?: LanguageCode) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refetch = useCallback(() => {
    if (!userId) return
    getUserStats(userId, languageCode).then((result) => {
      setStats(result)
      setIsLoading(false)
    })
  }, [userId, languageCode])

  useEffect(() => {
    if (!userId) {
      setStats(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    refetch()
  }, [userId, refetch])

  useEffect(() => {
    if (!userId) return
    return subscribeToUserCorrections(userId, () => refetch())
  }, [userId, refetch])

  return { stats, isLoading }
}

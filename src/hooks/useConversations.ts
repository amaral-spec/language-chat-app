import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { createConversation, listConversations } from '../services/chatService'
import type { ConversationWithPreview, CreateConversationResponse, LanguageCode } from '../types'

export function useConversations() {
  const { user } = useAuth()
  const [conversations, setConversations] = useState<ConversationWithPreview[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const userId = user?.id

  useEffect(() => {
    if (!userId) {
      setConversations([])
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    listConversations(userId).then((result) => {
      if (!isMounted) return
      setConversations(result)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
    // Depende só do id (estável) e não do objeto `user` inteiro: o objeto é
    // recriado a cada resolução de sessão (getSession/onAuthStateChange),
    // o que causaria refetch duplicado mesmo quando o usuário é o mesmo.
  }, [userId])

  const handleCreateConversation = useCallback(
    async (friendEmail: string, languageCode: LanguageCode): Promise<CreateConversationResponse> => {
      if (!user) {
        return { conversation: null, error: 'Not authenticated' }
      }

      const result = await createConversation(user.id, friendEmail, languageCode)

      if (result.conversation) {
        const conversation = result.conversation
        setError(null)
        setConversations((current) => {
          if (current.some((existing) => existing.id === conversation.id)) {
            return current
          }
          return [{ ...conversation, friendEmail, lastMessagePreview: null }, ...current]
        })
      } else if (result.error) {
        setError(result.error)
      }

      return result
    },
    [user],
  )

  return {
    conversations,
    isLoading,
    error,
    createConversation: handleCreateConversation,
  }
}

import { useEffect, useState } from 'react'
import { getConversation } from '../services/chatService'
import type { Conversation } from '../types'

/** Carrega os dados de uma conversa (ex: idioma de aprendizado para o badge do chat). */
export function useConversation(conversationId: string | undefined) {
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!conversationId) {
      setConversation(null)
      setIsLoading(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    getConversation(conversationId).then((result) => {
      if (!isMounted) return
      setConversation(result)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [conversationId])

  return { conversation, isLoading }
}

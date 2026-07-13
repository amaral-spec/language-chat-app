import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { loadHistory, sendMessage as sendMessageToService, subscribeToMessages } from '../services/chatService'
import { requestCorrection } from '../services/correctionService'
import type { Message } from '../types'

const OPTIMISTIC_ID_PREFIX = 'optimistic-'
const HISTORY_PAGE_SIZE = 50

function createOptimisticMessage(conversationId: string, senderId: string, content: string): Message {
  return {
    id: `${OPTIMISTIC_ID_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`,
    conversationId,
    senderId,
    content,
    // Timestamp local só para exibição otimista; é substituído pelo
    // `created_at` real (do servidor) assim que o insert responde.
    createdAt: new Date().toISOString(),
  }
}

/**
 * Adiciona `incoming` à lista se ainda não existir uma mensagem com o
 * mesmo id. Usada tanto pelo handler do Realtime quanto pela confirmação
 * do envio otimista — nos dois casos a mesma mensagem pode chegar por dois
 * caminhos (INSERT notifica o próprio remetente também), então o id é a
 * única fonte de verdade para deduplicar.
 */
function addIfNotPresent(current: Message[], incoming: Message): Message[] {
  if (current.some((message) => message.id === incoming.id)) {
    return current
  }
  return [...current, incoming]
}

/**
 * Carrega o histórico de uma conversa (últimas `HISTORY_PAGE_SIZE`
 * mensagens), assina Realtime para receber mensagens novas de qualquer
 * participante, e expõe `sendMessage` com atualização otimista: a mensagem
 * aparece na lista imediatamente, antes da resposta do banco, e é
 * substituída pela versão real (id/created_at do servidor) ao confirmar —
 * ou removida em caso de erro.
 *
 * Também expõe `loadMoreHistory` para scroll infinito: busca a próxima
 * página de mensagens mais antigas (cursor = `created_at` da mensagem mais
 * antiga já carregada) e prepend na lista.
 */
export function useMessages(conversationId: string | undefined) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMoreHistory, setHasMoreHistory] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!conversationId) {
      setMessages([])
      setIsLoading(false)
      setHasMoreHistory(false)
      return
    }

    let isMounted = true
    setIsLoading(true)

    loadHistory(conversationId, { limit: HISTORY_PAGE_SIZE }).then((result) => {
      if (!isMounted) return
      setMessages(result)
      setHasMoreHistory(result.length === HISTORY_PAGE_SIZE)
      setIsLoading(false)
    })

    return () => {
      isMounted = false
    }
  }, [conversationId])

  // Subscription Realtime separada do carregamento de histórico: assim ela
  // não é recriada quando `messages` muda, só quando a conversa muda.
  useEffect(() => {
    if (!conversationId) return

    const unsubscribe = subscribeToMessages(conversationId, (incoming) => {
      setMessages((current) => addIfNotPresent(current, incoming))
    })

    return unsubscribe
  }, [conversationId])

  const loadMoreHistory = useCallback(async () => {
    if (!conversationId || isLoadingMore || !hasMoreHistory) return

    const oldestMessage = messages[0]
    if (!oldestMessage) return

    setIsLoadingMore(true)
    const olderMessages = await loadHistory(conversationId, {
      before: oldestMessage.createdAt,
      limit: HISTORY_PAGE_SIZE,
    })

    setMessages((current) => [...olderMessages, ...current])
    setHasMoreHistory(olderMessages.length === HISTORY_PAGE_SIZE)
    setIsLoadingMore(false)
  }, [conversationId, isLoadingMore, hasMoreHistory, messages])

  const handleSendMessage = useCallback(
    async (content: string) => {
      if (!user || !conversationId) {
        setError('Not authenticated')
        return
      }

      setError(null)
      const optimisticMessage = createOptimisticMessage(conversationId, user.id, content)
      setMessages((current) => [...current, optimisticMessage])

      const result = await sendMessageToService(user.id, { conversationId, content })

      if (result.message) {
        const confirmedMessage = result.message
        // Dispara a correção (LanguageTool) em paralelo, sem bloquear o
        // envio — a sugestão (se houver) chega via Realtime quando estiver
        // pronta.
        requestCorrection(confirmedMessage.id, conversationId, confirmedMessage.content)
        setMessages((current) => {
          // O Realtime pode ter entregue esta mesma mensagem (mesmo id,
          // via INSERT) antes desta resposta chegar — nesse caso já existe
          // uma cópia "real" na lista; só remove a otimista.
          const deliveredByRealtime = current.some(
            (message) => message.id === confirmedMessage.id && message.id !== optimisticMessage.id,
          )
          if (deliveredByRealtime) {
            return current.filter((message) => message.id !== optimisticMessage.id)
          }
          return current.map((message) => (message.id === optimisticMessage.id ? confirmedMessage : message))
        })
      } else {
        setMessages((current) => current.filter((message) => message.id !== optimisticMessage.id))
        setError(result.error ?? 'Failed to send message')
      }
    },
    [user, conversationId],
  )

  return {
    messages,
    isLoading,
    isLoadingMore,
    hasMoreHistory,
    error,
    sendMessage: handleSendMessage,
    loadMoreHistory,
  }
}

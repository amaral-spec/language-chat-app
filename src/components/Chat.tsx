import { useRef, type UIEvent } from 'react'
import MessageBubble from './MessageBubble'
import type { Message } from '../types'

// Distância (em px) do topo do container a partir da qual consideramos que
// o usuário "chegou perto do topo" e disparamos o carregamento de mais
// histórico. Uma pequena margem evita depender de scrollTop === 0 exato.
const LOAD_MORE_SCROLL_THRESHOLD = 50

interface ChatProps {
  messages: Message[]
  currentUserId: string | undefined
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
}

function Chat({ messages, currentUserId, onLoadMore, hasMore = false, isLoadingMore = false }: ChatProps) {
  const hasHandledTopRef = useRef(false)

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const nearTop = event.currentTarget.scrollTop <= LOAD_MORE_SCROLL_THRESHOLD

    if (!nearTop) {
      hasHandledTopRef.current = false
      return
    }

    // Evita disparar `onLoadMore` repetidamente enquanto o usuário
    // permanece parado perto do topo (ex: vários eventos de scroll).
    if (hasHandledTopRef.current) return
    hasHandledTopRef.current = true

    if (hasMore && !isLoadingMore) {
      onLoadMore?.()
    }
  }

  if (messages.length === 0) {
    return <p>No messages yet. Say hello!</p>
  }

  return (
    <div className="flex h-full flex-col gap-2 overflow-y-auto" onScroll={handleScroll} data-testid="chat-scroll-container">
      {isLoadingMore && <p className="text-center text-sm text-gray-500">Loading more messages...</p>}
      {messages.map((message) => (
        <MessageBubble key={message.id} message={message} isOwnMessage={message.senderId === currentUserId} />
      ))}
    </div>
  )
}

export default Chat

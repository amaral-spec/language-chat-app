import { MessageCircle } from 'lucide-react'
import { useRef, type UIEvent } from 'react'
import MessageBubble from './MessageBubble'
import Spinner from './ui/Spinner'
import type { Correction, Message } from '../types'

/**
 * Decide se uma mensagem deve tocar a animação de "chegou agora"
 * (`animate-message-in`, ver MessageBubble). A entrada só faz sentido pra
 * mensagens que realmente chegam uma de cada vez (Realtime ou envio) —
 * um lote inteiro de histórico aparecendo de uma vez (carregamento
 * inicial OU "carregar mais antigas" ao rolar pra cima) nunca deve
 * animar, senão vira o antipadrão de "tudo aparecendo ao mesmo tempo".
 *
 * Por isso "novo" não é "id que eu nunca vi" — é "id que apareceu fora de
 * um lote de histórico". Absorve o lote inteiro como "já conhecido" no
 * exato render em que `isLoadingMore` volta a `false`, antes de qualquer
 * chamada a `isNew` nesse render.
 */
function useMessageArrivalTracking(messages: Message[], isLoadingMore: boolean) {
  const knownIdsRef = useRef<Set<string> | null>(null)
  const wasLoadingMoreRef = useRef(false)

  if (knownIdsRef.current === null) {
    knownIdsRef.current = new Set(messages.map((message) => message.id))
  } else if (wasLoadingMoreRef.current && !isLoadingMore) {
    for (const message of messages) {
      knownIdsRef.current.add(message.id)
    }
  }

  wasLoadingMoreRef.current = isLoadingMore

  return (messageId: string): boolean => {
    const isNew = !knownIdsRef.current!.has(messageId)
    knownIdsRef.current!.add(messageId)
    return isNew
  }
}

// Distância (em px) do topo do container a partir da qual consideramos que
// o usuário "chegou perto do topo" e disparamos o carregamento de mais
// histórico. Uma pequena margem evita depender de scrollTop === 0 exato.
const LOAD_MORE_SCROLL_THRESHOLD = 50

interface ChatProps {
  messages: Message[]
  currentUserId: string | undefined
  correctionsByMessageId?: Record<string, Correction>
  onLoadMore?: () => void
  hasMore?: boolean
  isLoadingMore?: boolean
}

function Chat({
  messages,
  currentUserId,
  correctionsByMessageId,
  onLoadMore,
  hasMore = false,
  isLoadingMore = false,
}: ChatProps) {
  const hasHandledTopRef = useRef(false)
  const isNewArrival = useMessageArrivalTracking(messages, isLoadingMore)

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
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 text-brand-500">
          <MessageCircle size={22} aria-hidden="true" />
        </div>
        <p className="font-display text-sm font-semibold text-ink-700">No messages yet. Say hello!</p>
      </div>
    )
  }

  return (
    <div
      className="scrollbar-thin flex h-full flex-col gap-2.5 overflow-y-auto px-1"
      onScroll={handleScroll}
      data-testid="chat-scroll-container"
    >
      {isLoadingMore && <Spinner label="Loading more messages…" className="mx-auto py-2" />}
      {messages.map((message) => (
        <MessageBubble
          key={message.id}
          message={message}
          isOwnMessage={message.senderId === currentUserId}
          isNew={isNewArrival(message.id)}
          correction={correctionsByMessageId?.[message.id]}
        />
      ))}
    </div>
  )
}

export default Chat

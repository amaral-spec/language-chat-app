import { ArrowLeft, BarChart3 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Chat from '../components/Chat'
import MessageInput from '../components/MessageInput'
import Avatar from '../components/ui/Avatar'
import ErrorText from '../components/ui/ErrorText'
import Skeleton from '../components/ui/Skeleton'
import { getLanguageByCode } from '../constants/languages'
import { useAuth } from '../hooks/useAuth'
import { useConversation } from '../hooks/useConversation'
import { useCorrections } from '../hooks/useCorrections'
import { useMessages } from '../hooks/useMessages'

// Larguras variadas pra não parecer uma grade repetitiva de barrinhas idênticas.
const BUBBLE_WIDTHS = ['w-40', 'w-56', 'w-32', 'w-48']

/** Placeholder no formato de bolhas alternadas (você/amigo) — em vez de um spinner genérico. */
function MessagesSkeleton() {
  return (
    <div className="flex h-full flex-col justify-end gap-2.5 px-1" aria-busy="true" aria-label="Loading messages">
      {BUBBLE_WIDTHS.map((width, index) => (
        <div key={width} className={`flex ${index % 2 === 0 ? 'justify-start' : 'justify-end'}`}>
          <Skeleton className={`h-10 ${width} rounded-2xl`} />
        </div>
      ))}
    </div>
  )
}

function ChatRoom() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const { conversation } = useConversation(conversationId)
  const learningLanguage = getLanguageByCode(conversation?.learningLanguage ?? 'en-US')
  const { messages, isLoading, hasMoreHistory, isLoadingMore, error, sendMessage, loadMoreHistory } = useMessages(
    conversationId,
    learningLanguage.code,
  )
  const { correctionsByMessageId } = useCorrections(conversationId)

  return (
    <div className="flex h-screen flex-col bg-ink-50">
      {/* A barra (header/footer) usa fundo full-bleed, mas o conteúdo fica
          centrado numa coluna de leitura — sem isso, num monitor largo as
          bolhas de mensagem ficariam coladas nas bordas extremas da tela,
          com um vão enorme entre "você" e "seu amigo". */}
      <header className="border-b border-ink-200/70 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-3 py-2.5">
          <Link
            to="/conversations"
            aria-label="Back to conversations"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition-[background-color,color,transform] duration-150 ease-out-strong hover:bg-ink-100 hover:text-ink-800 active:scale-90"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>

          <Avatar label={conversation?.id ?? 'chat'} size="sm" className="hidden sm:flex" />

          <div className="min-w-0 flex-1">
            <h1 className="truncate font-display text-base font-bold text-ink-900">Chat</h1>
            <span className="block text-xs font-medium text-ink-500">
              Learning: {learningLanguage.name} {learningLanguage.flag}
            </span>
          </div>

          <Link
            to={`/chat/${conversationId}/stats`}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition-[background-color,color,transform] duration-150 ease-out-strong hover:bg-brand-50 hover:text-brand-600 active:scale-90"
            aria-label="View stats"
          >
            <BarChart3 size={18} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">
        <div className="mx-auto h-full max-w-2xl p-3">
          {isLoading ? (
            <MessagesSkeleton />
          ) : (
            <Chat
              messages={messages}
              currentUserId={user?.id}
              correctionsByMessageId={correctionsByMessageId}
              onLoadMore={loadMoreHistory}
              hasMore={hasMoreHistory}
              isLoadingMore={isLoadingMore}
            />
          )}
        </div>
      </main>

      {error && (
        <div className="mx-auto w-full max-w-2xl px-3">
          <ErrorText className="pb-2">{error}</ErrorText>
        </div>
      )}

      <footer className="border-t border-ink-200/70 bg-white">
        <div className="mx-auto max-w-2xl p-3">
          <MessageInput onSend={sendMessage} />
        </div>
      </footer>
    </div>
  )
}

export default ChatRoom

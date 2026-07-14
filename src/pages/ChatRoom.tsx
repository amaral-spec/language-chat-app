import { ArrowLeft, BarChart3 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import Chat from '../components/Chat'
import MessageInput from '../components/MessageInput'
import Avatar from '../components/ui/Avatar'
import ErrorText from '../components/ui/ErrorText'
import Spinner from '../components/ui/Spinner'
import { getLanguageByCode } from '../constants/languages'
import { useAuth } from '../hooks/useAuth'
import { useConversation } from '../hooks/useConversation'
import { useCorrections } from '../hooks/useCorrections'
import { useMessages } from '../hooks/useMessages'

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
      <header className="flex items-center gap-3 border-b border-ink-200/70 bg-white/95 px-3 py-2.5 backdrop-blur-sm">
        <Link
          to="/conversations"
          aria-label="Back to conversations"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-ink-100 hover:text-ink-800"
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
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-600"
          aria-label="View stats"
        >
          <BarChart3 size={18} aria-hidden="true" />
        </Link>
      </header>

      <main className="flex-1 overflow-hidden p-3">
        {isLoading ? <Spinner label="Loading messages…" /> : (
          <Chat
            messages={messages}
            currentUserId={user?.id}
            correctionsByMessageId={correctionsByMessageId}
            onLoadMore={loadMoreHistory}
            hasMore={hasMoreHistory}
            isLoadingMore={isLoadingMore}
          />
        )}
      </main>

      {error && <ErrorText className="px-3 pb-2">{error}</ErrorText>}

      <footer className="border-t border-ink-200/70 bg-white p-3">
        <MessageInput onSend={sendMessage} />
      </footer>
    </div>
  )
}

export default ChatRoom

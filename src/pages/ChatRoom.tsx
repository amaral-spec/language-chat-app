import { Link, useParams } from 'react-router-dom'
import Chat from '../components/Chat'
import MessageInput from '../components/MessageInput'
import { useAuth } from '../hooks/useAuth'
import { useMessages } from '../hooks/useMessages'

function ChatRoom() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const { messages, isLoading, hasMoreHistory, isLoadingMore, error, sendMessage, loadMoreHistory } =
    useMessages(conversationId)

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white p-3">
        <Link to="/conversations" className="text-sm font-medium text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Chat</h1>
      </header>

      <main className="flex-1 overflow-hidden p-3">
        {isLoading ? (
          <p className="text-sm text-gray-500">Loading messages...</p>
        ) : (
          <Chat
            messages={messages}
            currentUserId={user?.id}
            onLoadMore={loadMoreHistory}
            hasMore={hasMoreHistory}
            isLoadingMore={isLoadingMore}
          />
        )}
      </main>

      {error && (
        <p role="alert" className="px-3 text-sm text-red-600">
          {error}
        </p>
      )}

      <footer className="border-t border-gray-200 bg-white p-3">
        <MessageInput onSend={sendMessage} />
      </footer>
    </div>
  )
}

export default ChatRoom

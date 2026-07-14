import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ConversationCard from '../components/ConversationCard'
import NewConversationModal from '../components/NewConversationModal'
import { useAuth } from '../hooks/useAuth'
import { useConversations } from '../hooks/useConversations'
import type { LanguageCode } from '../types'

function Conversations() {
  const { logout } = useAuth()
  const { conversations, isLoading, error, createConversation } = useConversations()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  async function handleCreateConversation(friendEmail: string, languageCode: LanguageCode): Promise<string | null> {
    const result = await createConversation(friendEmail, languageCode)

    if (result.error || !result.conversation) {
      return result.error ?? 'Failed to create conversation'
    }

    setIsModalOpen(false)
    navigate(`/chat/${result.conversation.id}`)
    return null
  }

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 p-4">
      <header className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">Conversations</h1>
        <div className="flex items-center gap-1">
          <Link
            to="/stats"
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Stats
          </Link>
          <button
            type="button"
            onClick={() => logout()}
            className="rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Logout
          </button>
        </div>
      </header>

      <button
        type="button"
        onClick={() => setIsModalOpen(true)}
        className="mb-4 w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
      >
        New Conversation
      </button>

      {/* Erros de criação de conversa já aparecem inline no modal; só
          mostramos este banner para erros de fundo (ex: falha ao listar)
          quando o modal não está cobrindo a tela. */}
      {error && !isModalOpen && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          {error}
        </p>
      )}

      {isLoading ? (
        <p className="text-sm text-gray-500">Loading conversations...</p>
      ) : conversations.length === 0 ? (
        <p className="text-sm text-gray-500">No conversations yet. Start one!</p>
      ) : (
        <ul className="space-y-2">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <ConversationCard conversation={conversation} />
            </li>
          ))}
        </ul>
      )}

      <NewConversationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleCreateConversation}
      />
    </div>
  )
}

export default Conversations

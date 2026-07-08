import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ConversationCard from '../components/ConversationCard'
import NewConversationModal from '../components/NewConversationModal'
import { useAuth } from '../hooks/useAuth'
import { useConversations } from '../hooks/useConversations'

function Conversations() {
  const { logout } = useAuth()
  const { conversations, isLoading, error, createConversation } = useConversations()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const navigate = useNavigate()

  async function handleCreateConversation(friendEmail: string): Promise<string | null> {
    const result = await createConversation(friendEmail)

    if (result.error || !result.conversation) {
      return result.error ?? 'Failed to create conversation'
    }

    setIsModalOpen(false)
    navigate(`/chat/${result.conversation.id}`)
    return null
  }

  return (
    <div>
      <header className="flex items-center justify-between">
        <h1>Conversations</h1>
        <button type="button" onClick={() => logout()}>
          Logout
        </button>
      </header>

      <button type="button" onClick={() => setIsModalOpen(true)}>
        New Conversation
      </button>

      {/* Erros de criação de conversa já aparecem inline no modal; só
          mostramos este banner para erros de fundo (ex: falha ao listar)
          quando o modal não está cobrindo a tela. */}
      {error && !isModalOpen && <p role="alert">{error}</p>}

      {isLoading ? (
        <p>Loading conversations...</p>
      ) : conversations.length === 0 ? (
        <p>No conversations yet. Start one!</p>
      ) : (
        <ul>
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

import { BarChart3, LogOut, MessageCirclePlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ConversationCard from '../components/ConversationCard'
import NewConversationModal from '../components/NewConversationModal'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import ErrorText from '../components/ui/ErrorText'
import Spinner from '../components/ui/Spinner'
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
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-lg px-4 py-5">
        <header className="mb-5 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink-900">Conversations</h1>
          <div className="flex items-center gap-1">
            <Link
              to="/stats"
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-white hover:text-brand-600"
            >
              <BarChart3 size={16} aria-hidden="true" />
              Stats
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-ink-600 transition-colors hover:bg-white hover:text-rose-600"
            >
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
          </div>
        </header>

        <Button onClick={() => setIsModalOpen(true)} fullWidth icon={<MessageCirclePlus size={17} aria-hidden="true" />}>
          New Conversation
        </Button>

        {error && !isModalOpen && <ErrorText className="mt-4">{error}</ErrorText>}

        <div className="mt-5">
          {isLoading ? (
            <Spinner label="Loading conversations…" />
          ) : conversations.length === 0 ? (
            <EmptyState
              icon={<Users size={20} aria-hidden="true" />}
              title="No conversations yet. Start one!"
              description="Invite a friend by email and pick a language to start practicing together."
            />
          ) : (
            <ul className="space-y-2">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <ConversationCard conversation={conversation} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <NewConversationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateConversation} />
    </div>
  )
}

export default Conversations

import { BarChart3, LogOut, MessageCirclePlus, Users } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ConversationCard from '../components/ConversationCard'
import NewConversationModal from '../components/NewConversationModal'
import Button from '../components/ui/Button'
import EmptyState from '../components/ui/EmptyState'
import ErrorText from '../components/ui/ErrorText'
import Skeleton from '../components/ui/Skeleton'
import { useAuth } from '../hooks/useAuth'
import { useConversations } from '../hooks/useConversations'
import type { LanguageCode } from '../types'

/** Mesmo formato do ConversationCard real (avatar + duas linhas + seta) — em vez de um spinner genérico. */
function ConversationCardSkeleton() {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-3">
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-3/5" />
      </div>
    </div>
  )
}

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
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-ink-600 transition-[background-color,color,transform] duration-150 ease-out-strong hover:bg-white hover:text-brand-600 active:scale-[0.96]"
            >
              <BarChart3 size={16} aria-hidden="true" />
              Stats
            </Link>
            <button
              type="button"
              onClick={() => logout()}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium text-ink-600 transition-[background-color,color,transform] duration-150 ease-out-strong hover:bg-white hover:text-rose-600 active:scale-[0.96]"
            >
              <LogOut size={16} aria-hidden="true" />
              Logout
            </button>
          </div>
        </header>

        <main>
          <Button onClick={() => setIsModalOpen(true)} fullWidth icon={<MessageCirclePlus size={17} aria-hidden="true" />}>
            New Conversation
          </Button>

          {error && !isModalOpen && <ErrorText className="mt-4">{error}</ErrorText>}

          <div className="mt-5">
            {isLoading ? (
              <ul className="space-y-2" aria-busy="true" aria-label="Loading conversations">
                {[0, 1, 2].map((key) => (
                  <li key={key}>
                    <ConversationCardSkeleton />
                  </li>
                ))}
              </ul>
            ) : conversations.length === 0 ? (
              <EmptyState
                icon={<Users size={20} aria-hidden="true" />}
                title="No conversations yet. Start one!"
                description="Invite a friend by email and pick a language to start practicing together."
              />
            ) : (
              <ul className="space-y-2">
                {conversations.map((conversation, index) => (
                  <li key={conversation.id}>
                    <ConversationCard conversation={conversation} index={index} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>

      <NewConversationModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleCreateConversation} />
    </div>
  )
}

export default Conversations

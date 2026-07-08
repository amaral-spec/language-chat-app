import { useNavigate } from 'react-router-dom'
import type { ConversationWithPreview } from '../types'

interface ConversationCardProps {
  conversation: ConversationWithPreview
}

function ConversationCard({ conversation }: ConversationCardProps) {
  const navigate = useNavigate()
  const avatarLetter = conversation.friendEmail.charAt(0).toUpperCase()

  return (
    <button
      type="button"
      onClick={() => navigate(`/chat/${conversation.id}`)}
      className="flex w-full items-center gap-3 rounded-lg border border-gray-200 p-3 text-left hover:bg-gray-50"
    >
      <span
        title={conversation.friendEmail}
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-300 font-semibold text-gray-700"
      >
        {avatarLetter}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="truncate font-medium">{conversation.friendEmail}</span>
        <span className="truncate text-sm text-gray-500">
          {conversation.lastMessagePreview ?? 'No messages yet'}
        </span>
      </span>
    </button>
  )
}

export default ConversationCard

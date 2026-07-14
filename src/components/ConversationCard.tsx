import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from './ui/Avatar'
import { getLanguageByCode } from '../constants/languages'
import type { ConversationWithPreview } from '../types'

interface ConversationCardProps {
  conversation: ConversationWithPreview
}

function ConversationCard({ conversation }: ConversationCardProps) {
  const navigate = useNavigate()
  const language = getLanguageByCode(conversation.learningLanguage)

  return (
    <button
      type="button"
      onClick={() => navigate(`/chat/${conversation.id}`)}
      className="group flex w-full items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-3 text-left shadow-sm shadow-ink-900/[0.03] transition-all hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md hover:shadow-brand-900/5"
    >
      <Avatar label={conversation.friendEmail} />

      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex items-center gap-1.5 truncate font-display text-sm font-semibold text-ink-900">
          {conversation.friendEmail}
          <span aria-hidden="true" className="text-sm leading-none">
            {language.flag}
          </span>
          <span className="sr-only">Learning: {language.name}</span>
        </span>
        <span className="truncate text-sm text-ink-500">{conversation.lastMessagePreview ?? 'No messages yet'}</span>
      </span>

      <ChevronRight
        aria-hidden="true"
        size={18}
        className="shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-brand-400"
      />
    </button>
  )
}

export default ConversationCard

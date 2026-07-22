import { ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Avatar from './ui/Avatar'
import { getLanguageByCode } from '../constants/languages'
import type { ConversationWithPreview } from '../types'

interface ConversationCardProps {
  conversation: ConversationWithPreview
  index?: number
}

// Delay curto (ver skill emil-design-eng: 30-80ms entre itens) — a lista
// inteira nunca deve demorar mais que ~250ms pra terminar de entrar.
const STAGGER_STEP_MS = 40

function ConversationCard({ conversation, index = 0 }: ConversationCardProps) {
  const navigate = useNavigate()
  const language = getLanguageByCode(conversation.learningLanguage)

  return (
    <button
      type="button"
      onClick={() => navigate(`/chat/${conversation.id}`)}
      style={{ animationDelay: `${index * STAGGER_STEP_MS}ms` }}
      className="group flex w-full animate-stagger-in items-center gap-3 rounded-2xl border border-ink-200/70 bg-white p-3 text-left shadow-sm shadow-ink-900/[0.03] transition-[transform,border-color,box-shadow] duration-200 ease-out-strong hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md hover:shadow-brand-900/5 active:scale-[0.985] active:duration-100"
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
        className="shrink-0 text-ink-400 transition-transform duration-200 ease-out-strong group-hover:translate-x-0.5 group-hover:text-brand-400"
      />
    </button>
  )
}

export default ConversationCard

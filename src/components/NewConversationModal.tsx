import { X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import LanguageSelector from './LanguageSelector'
import Button from './ui/Button'
import ErrorText from './ui/ErrorText'
import Field from './ui/Field'
import { DEFAULT_LANGUAGE_CODE } from '../constants/languages'
import type { LanguageCode } from '../types'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (friendEmail: string, languageCode: LanguageCode) => Promise<string | null>
}

function NewConversationModal({ isOpen, onClose, onSubmit }: NewConversationModalProps) {
  const [friendEmail, setFriendEmail] = useState('')
  const [languageCode, setLanguageCode] = useState<LanguageCode>(DEFAULT_LANGUAGE_CODE)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const submitError = await onSubmit(friendEmail, languageCode)

    setIsSubmitting(false)

    if (submitError) {
      setError(submitError)
      return
    }

    setFriendEmail('')
    setLanguageCode(DEFAULT_LANGUAGE_CODE)
  }

  function handleClose() {
    setFriendEmail('')
    setLanguageCode(DEFAULT_LANGUAGE_CODE)
    setError(null)
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="New Conversation"
      className="fixed inset-0 z-10 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm animate-scale-in space-y-5 rounded-3xl bg-white p-6 shadow-2xl shadow-ink-950/20"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">New Conversation</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-600"
          >
            <X size={18} />
          </button>
        </div>

        <Field
          id="friend-email"
          label="Friend's email"
          type="email"
          value={friendEmail}
          onChange={(event) => setFriendEmail(event.target.value)}
          required
          autoComplete="email"
        />

        <LanguageSelector value={languageCode} onChange={setLanguageCode} />

        {error && <ErrorText>{error}</ErrorText>}

        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Creating…' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  )
}

export default NewConversationModal

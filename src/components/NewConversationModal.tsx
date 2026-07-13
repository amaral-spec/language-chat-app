import { useState, type FormEvent } from 'react'
import LanguageSelector from './LanguageSelector'
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
      className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg bg-white p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold text-gray-900">New Conversation</h2>

        <div className="space-y-1">
          <label htmlFor="friend-email" className="block text-sm font-medium text-gray-700">
            Friend's email
          </label>
          <input
            id="friend-email"
            type="email"
            value={friendEmail}
            onChange={(event) => setFriendEmail(event.target.value)}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        <LanguageSelector value={languageCode} onChange={setLanguageCode} />

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded-md px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </div>
  )
}

export default NewConversationModal

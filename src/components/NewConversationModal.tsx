import { useState, type FormEvent } from 'react'

interface NewConversationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (friendEmail: string) => Promise<string | null>
}

function NewConversationModal({ isOpen, onClose, onSubmit }: NewConversationModalProps) {
  const [friendEmail, setFriendEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (!isOpen) return null

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const submitError = await onSubmit(friendEmail)

    setIsSubmitting(false)

    if (submitError) {
      setError(submitError)
      return
    }

    setFriendEmail('')
  }

  function handleClose() {
    setFriendEmail('')
    setError(null)
    onClose()
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="New Conversation">
      <form onSubmit={handleSubmit}>
        <h2>New Conversation</h2>

        <label htmlFor="friend-email">Friend's email</label>
        <input
          id="friend-email"
          type="email"
          value={friendEmail}
          onChange={(event) => setFriendEmail(event.target.value)}
          required
        />

        {error && <p role="alert">{error}</p>}

        <button type="submit" disabled={isSubmitting}>
          Create
        </button>
        <button type="button" onClick={handleClose}>
          Cancel
        </button>
      </form>
    </div>
  )
}

export default NewConversationModal

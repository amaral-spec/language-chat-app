import { X } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
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

const EXIT_DURATION_MS = 150

/**
 * Mantém o modal montado por mais `exitDurationMs` depois que `isOpen`
 * vira `false`, pra dar tempo da transição de saída tocar (sem isso, o
 * elemento some do DOM instantaneamente e não dá pra ver nenhuma
 * animação de fechamento). Abrir continua instantâneo — o ajuste de
 * estado acontece durante o próprio render (padrão oficial do React pra
 * "derivar estado de uma prop que mudou"), sem esperar um efeito.
 */
function useDelayedUnmount(isOpen: boolean, exitDurationMs: number): boolean {
  const [shouldRender, setShouldRender] = useState(isOpen)

  if (isOpen && !shouldRender) {
    setShouldRender(true)
  }

  useEffect(() => {
    if (isOpen || !shouldRender) return
    const timeout = setTimeout(() => setShouldRender(false), exitDurationMs)
    return () => clearTimeout(timeout)
  }, [isOpen, shouldRender, exitDurationMs])

  return shouldRender
}

function NewConversationModal({ isOpen, onClose, onSubmit }: NewConversationModalProps) {
  const [friendEmail, setFriendEmail] = useState('')
  const [languageCode, setLanguageCode] = useState<LanguageCode>(DEFAULT_LANGUAGE_CODE)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const shouldRender = useDelayedUnmount(isOpen, EXIT_DURATION_MS)
  const isClosing = shouldRender && !isOpen

  if (!shouldRender) return null

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
      className={`fixed inset-0 z-10 flex items-center justify-center bg-ink-950/50 p-4 backdrop-blur-sm transition-opacity duration-150 ease-out-strong starting:opacity-0 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <form
        onSubmit={handleSubmit}
        className={`w-full max-w-sm space-y-5 rounded-3xl bg-white p-6 shadow-2xl shadow-ink-950/20 transition-[transform,opacity] ease-out-strong starting:scale-95 starting:opacity-0 ${
          isClosing ? 'scale-95 opacity-0 duration-150' : 'scale-100 opacity-100 duration-200'
        }`}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ink-900">New Conversation</h2>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="-mr-2 flex h-11 w-11 items-center justify-center rounded-full text-ink-500 transition-[background-color,color,transform] duration-150 ease-out-strong hover:bg-ink-100 hover:text-ink-600 active:scale-90"
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

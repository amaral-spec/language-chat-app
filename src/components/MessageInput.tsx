import { Send } from 'lucide-react'
import { useState, type FormEvent } from 'react'

const MAX_MESSAGE_LENGTH = 5000

interface MessageInputProps {
  onSend: (content: string) => void | Promise<void>
}

function MessageInput({ onSend }: MessageInputProps) {
  const [content, setContent] = useState('')

  const isInvalid = content.trim().length === 0 || content.length > MAX_MESSAGE_LENGTH

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isInvalid) return

    await onSend(content)
    setContent('')
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2">
      <label htmlFor="message-input" className="sr-only">
        Message
      </label>
      <textarea
        id="message-input"
        value={content}
        onChange={(event) => setContent(event.target.value)}
        placeholder="Type a message…"
        rows={1}
        className="max-h-32 flex-1 resize-none rounded-2xl border border-ink-200 bg-ink-50 px-4 py-2.5 text-sm text-ink-900 transition-[background-color,border-color,box-shadow] duration-150 ease-out-strong placeholder:text-ink-500 focus:border-brand-400 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-100"
      />
      <button
        type="submit"
        disabled={isInvalid}
        aria-label="Send"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm shadow-brand-600/25 transition-[background-color,transform,box-shadow] duration-150 ease-out-strong hover:bg-brand-700 active:scale-90 disabled:cursor-not-allowed disabled:bg-ink-200 disabled:text-ink-400 disabled:shadow-none disabled:active:scale-100"
      >
        <Send size={17} aria-hidden="true" />
      </button>
    </form>
  )
}

export default MessageInput

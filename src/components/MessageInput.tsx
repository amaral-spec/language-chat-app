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
        rows={2}
        className="flex-1 resize-none rounded-lg border border-gray-300 p-2"
      />
      <button type="submit" disabled={isInvalid}>
        Send
      </button>
    </form>
  )
}

export default MessageInput

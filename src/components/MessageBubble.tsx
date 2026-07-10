import CorrectionPanel from './CorrectionPanel'
import type { Correction, Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  correction?: Correction
}

function MessageBubble({ message, isOwnMessage, correction }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString()

  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-xs rounded-lg px-3 py-2 ${
          isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <span className="mt-1 block text-right text-xs opacity-70">{time}</span>
      </div>
      {correction && <CorrectionPanel correction={correction} />}
    </div>
  )
}

export default MessageBubble

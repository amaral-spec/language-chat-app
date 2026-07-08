import type { Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
}

function MessageBubble({ message, isOwnMessage }: MessageBubbleProps) {
  const time = new Date(message.createdAt).toLocaleTimeString()

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-xs rounded-lg px-3 py-2 ${
          isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
        }`}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <span className="mt-1 block text-right text-xs opacity-70">{time}</span>
      </div>
    </div>
  )
}

export default MessageBubble

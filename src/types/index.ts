export interface User {
  id: string
  email: string
  createdAt: string
}

export interface SignUpPayload {
  email: string
  password: string
}

export interface LoginPayload {
  email: string
  password: string
}

export interface AuthResponse {
  user: User | null
  error: string | null
}

export interface Conversation {
  id: string
  user1Id: string
  user2Id: string
  createdAt: string
}

export interface Message {
  id: string
  conversationId: string
  senderId: string
  content: string
  createdAt: string
}

export interface CreateMessagePayload {
  conversationId: string
  content: string
}

export interface ConversationWithPreview extends Conversation {
  friendEmail: string
  lastMessagePreview: string | null
}

export interface CreateConversationResponse {
  conversation: Conversation | null
  error: string | null
}

export interface SendMessageResponse {
  message: Message | null
  error: string | null
}

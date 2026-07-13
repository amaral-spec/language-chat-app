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

export type LanguageCode = 'en-US' | 'pt-BR' | 'pt-PT' | 'es-ES' | 'fr-FR' | 'de-DE' | 'it-IT'

export interface Language {
  code: LanguageCode
  name: string
  flag: string
}

export interface Conversation {
  id: string
  user1Id: string
  user2Id: string
  learningLanguage: LanguageCode
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

export interface Correction {
  id: string
  messageId: string
  conversationId: string
  originalText: string
  correctedText: string
  explanation: string
  confidence: number
  acceptedByUser: boolean
  createdAt: string
}

export interface CorrectionPayload {
  messageId: string
  text: string
  language: LanguageCode
}

// Contrato (parcial, só os campos usados) da resposta de POST
// https://api.languagetool.org/v2/check — ver spec/features/003-ai-correction.md
export interface LanguageToolMatch {
  message: string
  offset: number
  length: number
  replacements: { value: string }[]
  rule: {
    id: string
    issueType: string
  }
}

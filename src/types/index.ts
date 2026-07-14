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

export type ErrorCategory = 'grammar' | 'spelling'

export interface Correction {
  id: string
  messageId: string
  conversationId: string
  senderId: string
  originalText: string
  correctedText: string
  explanation: string
  confidence: number
  errorType: string
  errorCategory: ErrorCategory
  acceptedByUser: boolean
  createdAt: string
}

export interface CorrectionPayload {
  messageId: string
  senderId: string
  text: string
  language: LanguageCode
}

// "Erro frequente" (spec 005): agrupamento de correções pelo mesmo
// `errorType` (rule id da LanguageTool), com o texto de uma ocorrência
// como rótulo legível para o usuário.
export interface ErrorFrequency {
  errorType: string
  category: ErrorCategory
  label: string
  count: number
}

export interface DailyAccuracy {
  date: string // 'YYYY-MM-DD'
  totalMessages: number
  correctMessages: number
  accuracy: number
}

export interface ConversationStats {
  totalMessages: number
  accuracy: number
  topErrors: ErrorFrequency[]
  yourErrorCount: number
  friendErrorCount: number
}

export interface UserStats {
  totalMessages: number
  accuracy: number
  topErrors: ErrorFrequency[]
  progressByDay: DailyAccuracy[]
  languages: LanguageCode[]
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

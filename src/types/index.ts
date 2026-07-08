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

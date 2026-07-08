import { supabase } from '../lib/supabaseClient'
import type { AuthResponse, LoginPayload, SignUpPayload, User } from '../types'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD_LENGTH = 8

export function validateEmail(email: string): boolean {
  return EMAIL_REGEX.test(email)
}

export function validatePassword(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH
}

export async function signUp(payload: SignUpPayload): Promise<AuthResponse> {
  if (!validateEmail(payload.email)) {
    return { user: null, error: 'Invalid email format' }
  }
  if (!validatePassword(payload.password)) {
    return { user: null, error: 'Password must be at least 8 characters' }
  }

  const { data, error } = await supabase.auth.signUp({
    email: payload.email,
    password: payload.password,
  })

  if (error || !data.user) {
    return { user: null, error: error?.message ?? 'Sign up failed' }
  }

  const user: User = {
    id: data.user.id,
    email: data.user.email ?? payload.email,
    createdAt: data.user.created_at,
  }
  return { user, error: null }
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  if (!validateEmail(payload.email) || !validatePassword(payload.password)) {
    return { user: null, error: 'Invalid credentials' }
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.email,
    password: payload.password,
  })

  if (error || !data.user) {
    return { user: null, error: 'Invalid credentials' }
  }

  const user: User = {
    id: data.user.id,
    email: data.user.email ?? payload.email,
    createdAt: data.user.created_at,
  }
  return { user, error: null }
}

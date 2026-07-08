import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login, signUp } from '../services/authService'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
    },
  },
}))

const { supabase } = await import('../lib/supabaseClient')

describe('authService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('signUp', () => {
    it('cria usuário com email/senha válidos', async () => {
      vi.mocked(supabase.auth.signUp).mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            created_at: '2026-01-01T00:00:00Z',
          },
          session: null,
        },
        error: null,
      } as never)

      const result = await signUp({
        email: 'user@example.com',
        password: 'password123',
      })

      expect(result.error).toBeNull()
      expect(result.user).toEqual({
        id: 'user-1',
        email: 'user@example.com',
        createdAt: '2026-01-01T00:00:00Z',
      })
    })

    it('rejeita email inválido com "Invalid email format"', async () => {
      const result = await signUp({
        email: 'not-an-email',
        password: 'password123',
      })

      expect(result.error).toBe('Invalid email format')
      expect(result.user).toBeNull()
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })

    it('rejeita senha curta com "Password must be at least 8 characters"', async () => {
      const result = await signUp({
        email: 'user@example.com',
        password: 'short',
      })

      expect(result.error).toBe('Password must be at least 8 characters')
      expect(result.user).toBeNull()
      expect(supabase.auth.signUp).not.toHaveBeenCalled()
    })
  })

  describe('login', () => {
    it('sucesso com credenciais corretas', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: {
          user: {
            id: 'user-1',
            email: 'user@example.com',
            created_at: '2026-01-01T00:00:00Z',
          },
          session: {},
        },
        error: null,
      } as never)

      const result = await login({
        email: 'user@example.com',
        password: 'password123',
      })

      expect(result.error).toBeNull()
      expect(result.user?.email).toBe('user@example.com')
    })

    it('erro genérico "Invalid credentials" com credenciais erradas', async () => {
      vi.mocked(supabase.auth.signInWithPassword).mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'Invalid login credentials' },
      } as never)

      const result = await login({
        email: 'user@example.com',
        password: 'wrongpassword',
      })

      expect(result.error).toBe('Invalid credentials')
      expect(result.user).toBeNull()
    })
  })
})

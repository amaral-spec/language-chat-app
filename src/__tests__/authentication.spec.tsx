import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { login, signUp } from '../services/authService'

vi.mock('../lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(),
      signInWithPassword: vi.fn(),
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      signOut: vi.fn(),
    },
    // A rota /conversations renderiza a página real de chat (Fatia 2), que
    // busca conversas via chatService; stub genérico para não quebrar esses
    // testes de autenticação/route-guard, que não se importam com o conteúdo
    // do dashboard em si.
    from: vi.fn(() => ({
      select: () => ({
        or: () => ({
          order: () => Promise.resolve({ data: [], error: null }),
        }),
      }),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
  },
}))

const { supabase } = await import('../lib/supabaseClient')
const { useAuthStore } = await import('../store/authStore')
const { default: App } = await import('../App')

function mockSession(user: { id: string; email: string } | null) {
  let session = user
    ? ({ user: { ...user, created_at: '2026-01-01T00:00:00Z' } } as never)
    : null

  vi.mocked(supabase.auth.getSession).mockImplementation(() =>
    Promise.resolve({ data: { session }, error: null } as never),
  )
  vi.mocked(supabase.auth.signOut).mockImplementation(() => {
    session = null
    return Promise.resolve({ error: null } as never)
  })
}

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

describe('sessão e route guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // useAuthStore é um singleton (Zustand) que sobrevive entre testes; sem
    // resetá-lo aqui, o usuário logado de um teste "vaza" para o próximo.
    useAuthStore.setState({ user: null, isLoading: true })
    vi.mocked(supabase.auth.onAuthStateChange).mockReturnValue({
      data: { subscription: { unsubscribe: vi.fn() } },
    } as never)
  })

  it('usuário não logado acessa /conversations → redireciona para /login', async () => {
    mockSession(null)

    render(
      <MemoryRouter initialEntries={['/conversations']}>
        <App />
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: 'Login' })).toBeInTheDocument()
  })

  it('usuário logado acessa /login → redireciona para /conversations', async () => {
    mockSession({ id: 'user-1', email: 'user@example.com' })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Conversations' }),
    ).toBeInTheDocument()
  })

  it('página recarregada → usuário continua logado (se token válido)', async () => {
    mockSession({ id: 'user-1', email: 'user@example.com' })

    render(
      <MemoryRouter initialEntries={['/conversations']}>
        <App />
      </MemoryRouter>,
    )

    expect(
      await screen.findByRole('heading', { name: 'Conversations' }),
    ).toBeInTheDocument()
  })

  it('logout limpa a sessão e redireciona para /login', async () => {
    mockSession({ id: 'user-1', email: 'user@example.com' })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/conversations']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByRole('heading', { name: 'Conversations' })
    await user.click(screen.getByRole('button', { name: 'Logout' }))

    expect(supabase.auth.signOut).toHaveBeenCalled()
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Login' })).toBeInTheDocument()
    })
  })
})

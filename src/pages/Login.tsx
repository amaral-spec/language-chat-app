import { useState, type FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { login } from '../services/authService'
import Button from '../components/ui/Button'
import ErrorText from '../components/ui/ErrorText'
import Field from '../components/ui/Field'
import Logo from '../components/ui/Logo'

function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const navigate = useNavigate()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    const result = await login({ email, password })

    setIsSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    navigate('/conversations')
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-ink-50 p-4">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-24 -top-32 h-80 w-80 rounded-full bg-brand-200/50 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-accent-200/50 blur-3xl"
      />

      <div className="relative w-full max-w-sm">
        <div className="mb-6 flex justify-center">
          <Logo size="lg" />
        </div>

        <form
          onSubmit={handleSubmit}
          className="animate-slide-up space-y-5 rounded-3xl border border-ink-200/70 bg-white/95 p-7 shadow-xl shadow-brand-900/5 backdrop-blur-sm"
        >
          <div className="space-y-1 text-center">
            <h1 className="font-display text-2xl font-bold text-ink-900">Login</h1>
            <p className="text-sm text-ink-500">Log in to keep the conversation going.</p>
          </div>

          <Field
            id="login-email"
            label="Email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
          />

          <Field
            id="login-password"
            label="Password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
          />

          {error && <ErrorText>{error}</ErrorText>}

          <Button type="submit" disabled={isSubmitting} fullWidth>
            {isSubmitting ? 'Logging in…' : 'Log In'}
          </Button>

          <p className="text-center text-sm text-ink-500">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-brand-600 hover:text-brand-700 hover:underline">
              Sign up
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}

export default Login

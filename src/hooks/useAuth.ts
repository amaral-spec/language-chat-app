import { useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { getCurrentSession, mapSupabaseUser } from '../services/authService'
import { useAuthStore } from '../store/authStore'

export function useAuth() {
  const user = useAuthStore((state) => state.user)
  const isLoading = useAuthStore((state) => state.isLoading)
  const setUser = useAuthStore((state) => state.setUser)
  const setLoading = useAuthStore((state) => state.setLoading)

  useEffect(() => {
    let isMounted = true

    getCurrentSession().then((session) => {
      if (!isMounted) return
      setUser(session ? mapSupabaseUser(session.user) : null)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session ? mapSupabaseUser(session.user) : null)
      setLoading(false)
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [setUser, setLoading])

  async function logout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  return { user, isLoading, logout }
}

import type { ReactNode } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import SignUp from './pages/SignUp'
import Login from './pages/Login'
import Conversations from './pages/Conversations'
import ChatRoom from './pages/ChatRoom'
import ConversationStats from './pages/ConversationStats'
import Dashboard from './pages/Dashboard'

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (!user) return <Navigate to="/login" replace />

  return <>{children}</>
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) return null
  if (user) return <Navigate to="/conversations" replace />

  return <>{children}</>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route
        path="/signup"
        element={
          <RedirectIfAuthed>
            <SignUp />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/login"
        element={
          <RedirectIfAuthed>
            <Login />
          </RedirectIfAuthed>
        }
      />
      <Route
        path="/conversations"
        element={
          <RequireAuth>
            <Conversations />
          </RequireAuth>
        }
      />
      <Route
        path="/chat/:conversationId"
        element={
          <RequireAuth>
            <ChatRoom />
          </RequireAuth>
        }
      />
      <Route
        path="/chat/:conversationId/stats"
        element={
          <RequireAuth>
            <ConversationStats />
          </RequireAuth>
        }
      />
      <Route
        path="/stats"
        element={
          <RequireAuth>
            <Dashboard />
          </RequireAuth>
        }
      />
    </Routes>
  )
}

export default App

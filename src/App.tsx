import { Navigate, Route, Routes } from 'react-router-dom'
import SignUp from './pages/SignUp'
import Login from './pages/Login'

function ConversationsPlaceholder() {
  return <h1>Conversations</h1>
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/signup" element={<SignUp />} />
      <Route path="/login" element={<Login />} />
      <Route path="/conversations" element={<ConversationsPlaceholder />} />
    </Routes>
  )
}

export default App

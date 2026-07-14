import { Link, useParams } from 'react-router-dom'
import AccuracyCard from '../components/AccuracyCard'
import ComparisonCard from '../components/ComparisonCard'
import ErrorsList from '../components/ErrorsList'
import { useAuth } from '../hooks/useAuth'
import { useConversationStats } from '../hooks/useConversationStats'

function ConversationStats() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const { stats, isLoading } = useConversationStats(conversationId, user?.id)

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to={`/chat/${conversationId}`} className="text-sm font-medium text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Conversation stats</h1>
      </header>

      {isLoading || !stats ? (
        <p className="text-sm text-gray-500">Loading stats...</p>
      ) : (
        <div className="space-y-3">
          <AccuracyCard accuracy={stats.accuracy} totalMessages={stats.totalMessages} />
          <ErrorsList title="Top 3 errors" errors={stats.topErrors} />
          <ComparisonCard yourErrorCount={stats.yourErrorCount} friendErrorCount={stats.friendErrorCount} />
        </div>
      )}
    </div>
  )
}

export default ConversationStats

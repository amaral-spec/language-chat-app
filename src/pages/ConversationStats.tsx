import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import AccuracyCard from '../components/AccuracyCard'
import ComparisonCard from '../components/ComparisonCard'
import ErrorsList from '../components/ErrorsList'
import Spinner from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useConversationStats } from '../hooks/useConversationStats'

function ConversationStats() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const { stats, isLoading } = useConversationStats(conversationId, user?.id)

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-lg px-4 py-5">
        <header className="mb-5 flex items-center gap-3">
          <Link
            to={`/chat/${conversationId}`}
            aria-label="Back to chat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-white hover:text-ink-800"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink-900">Conversation stats</h1>
        </header>

        {isLoading || !stats ? (
          <Spinner label="Loading stats…" />
        ) : (
          <div className="space-y-3">
            <AccuracyCard accuracy={stats.accuracy} totalMessages={stats.totalMessages} />
            <ErrorsList title="Top 3 errors" errors={stats.topErrors} />
            <ComparisonCard yourErrorCount={stats.yourErrorCount} friendErrorCount={stats.friendErrorCount} />
          </div>
        )}
      </div>
    </div>
  )
}

export default ConversationStats

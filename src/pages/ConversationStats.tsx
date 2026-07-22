import { ArrowLeft } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import AccuracyCard from '../components/AccuracyCard'
import ComparisonCard from '../components/ComparisonCard'
import ErrorsList from '../components/ErrorsList'
import StatCardSkeleton from '../components/ui/StatCardSkeleton'
import { useAuth } from '../hooks/useAuth'
import { useConversationStats } from '../hooks/useConversationStats'

function ConversationStats() {
  const { conversationId } = useParams<{ conversationId: string }>()
  const { user } = useAuth()
  const { stats, isLoading } = useConversationStats(conversationId, user?.id)

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-2xl px-4 py-5">
        <header className="mb-5 flex items-center gap-3">
          <Link
            to={`/chat/${conversationId}`}
            aria-label="Back to chat"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition-[background-color,color,transform] duration-150 ease-out-strong hover:bg-white hover:text-ink-800 active:scale-90"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink-900">Conversation stats</h1>
        </header>

        <main>
          {isLoading || !stats ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2" aria-busy="true" aria-label="Loading stats">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton className="md:col-span-2" />
            </div>
          ) : (
            // Os dois stats compactos (acurácia, comparação) dividem a
            // linha em telas largas; a lista de erros — texto mais longo —
            // fica na largura toda, abaixo.
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="animate-stagger-in" style={{ animationDelay: '0ms' }}>
                <AccuracyCard accuracy={stats.accuracy} totalMessages={stats.totalMessages} />
              </div>
              <div className="animate-stagger-in" style={{ animationDelay: '40ms' }}>
                <ComparisonCard yourErrorCount={stats.yourErrorCount} friendErrorCount={stats.friendErrorCount} />
              </div>
              <div className="animate-stagger-in md:col-span-2" style={{ animationDelay: '80ms' }}>
                <ErrorsList title="Top 3 errors" errors={stats.topErrors} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default ConversationStats

import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AccuracyCard from '../components/AccuracyCard'
import ErrorsList from '../components/ErrorsList'
import LanguagesCard from '../components/LanguagesCard'
import ProgressChart from '../components/ProgressChart'
import Spinner from '../components/ui/Spinner'
import { useAuth } from '../hooks/useAuth'
import { useUserStats } from '../hooks/useUserStats'
import type { LanguageCode } from '../types'

function Dashboard() {
  const { user } = useAuth()
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null)
  const { stats, isLoading } = useUserStats(user?.id, selectedLanguage ?? undefined)

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-lg px-4 py-5">
        <header className="mb-5 flex items-center gap-3">
          <Link
            to="/conversations"
            aria-label="Back to conversations"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-500 transition-colors hover:bg-white hover:text-ink-800"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink-900">Your progress</h1>
        </header>

        {isLoading || !stats ? (
          <Spinner label="Loading stats…" />
        ) : (
          <div className="space-y-3">
            <AccuracyCard accuracy={stats.accuracy} totalMessages={stats.totalMessages} />
            <ProgressChart data={stats.progressByDay} />
            <ErrorsList title="Top 5 errors" errors={stats.topErrors} />
            <LanguagesCard
              languages={stats.languages}
              selectedLanguage={selectedLanguage}
              onSelectLanguage={setSelectedLanguage}
            />
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard

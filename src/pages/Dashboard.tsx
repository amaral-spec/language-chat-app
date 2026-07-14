import { useState } from 'react'
import { Link } from 'react-router-dom'
import AccuracyCard from '../components/AccuracyCard'
import ErrorsList from '../components/ErrorsList'
import LanguagesCard from '../components/LanguagesCard'
import ProgressChart from '../components/ProgressChart'
import { useAuth } from '../hooks/useAuth'
import { useUserStats } from '../hooks/useUserStats'
import type { LanguageCode } from '../types'

function Dashboard() {
  const { user } = useAuth()
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null)
  const { stats, isLoading } = useUserStats(user?.id, selectedLanguage ?? undefined)

  return (
    <div className="mx-auto min-h-screen max-w-lg bg-gray-50 p-4">
      <header className="mb-4 flex items-center gap-3">
        <Link to="/conversations" className="text-sm font-medium text-blue-600 hover:underline">
          &larr; Back
        </Link>
        <h1 className="text-lg font-semibold text-gray-900">Your progress</h1>
      </header>

      {isLoading || !stats ? (
        <p className="text-sm text-gray-500">Loading stats...</p>
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
  )
}

export default Dashboard

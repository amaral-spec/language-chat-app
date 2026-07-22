import { ArrowLeft } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import AccuracyCard from '../components/AccuracyCard'
import ErrorsList from '../components/ErrorsList'
import LanguagesCard from '../components/LanguagesCard'
import ProgressChart from '../components/ProgressChart'
import StatCardSkeleton from '../components/ui/StatCardSkeleton'
import { useAuth } from '../hooks/useAuth'
import { useUserStats } from '../hooks/useUserStats'
import type { LanguageCode } from '../types'

function Dashboard() {
  const { user } = useAuth()
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode | null>(null)
  const { stats, isLoading } = useUserStats(user?.id, selectedLanguage ?? undefined)

  return (
    <div className="min-h-screen bg-ink-50">
      <div className="mx-auto max-w-3xl px-4 py-5">
        <header className="mb-5 flex items-center gap-3">
          <Link
            to="/conversations"
            aria-label="Back to conversations"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-500 transition-[background-color,color,transform] duration-150 ease-out-strong hover:bg-white hover:text-ink-800 active:scale-90"
          >
            <ArrowLeft size={18} aria-hidden="true" />
          </Link>
          <h1 className="font-display text-xl font-bold tracking-tight text-ink-900">Your progress</h1>
        </header>

        <main>
          {isLoading || !stats ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-start" aria-busy="true" aria-label="Loading stats">
              <div className="space-y-3 md:col-span-1">
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
              <div className="space-y-3 md:col-span-2">
                <StatCardSkeleton />
                <StatCardSkeleton />
              </div>
            </div>
          ) : (
            // Empilhado no mobile; em telas largas, duas colunas — cada uma
            // com seus próprios cards empilhados (não um grid de células
            // forçadas na mesma altura). Um grid faria a célula da Accuracy
            // esticar pra acompanhar a altura do gráfico ao lado, deixando
            // um vão vazio enorme dentro do card curto — empilhar evita
            // isso: cada card fica do tamanho do próprio conteúdo.
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-start">
              <div className="animate-stagger-in space-y-3 md:col-span-1" style={{ animationDelay: '0ms' }}>
                <AccuracyCard accuracy={stats.accuracy} totalMessages={stats.totalMessages} />
                <LanguagesCard
                  languages={stats.languages}
                  selectedLanguage={selectedLanguage}
                  onSelectLanguage={setSelectedLanguage}
                />
              </div>
              <div className="animate-stagger-in space-y-3 md:col-span-2" style={{ animationDelay: '40ms' }}>
                <ProgressChart data={stats.progressByDay} />
                <ErrorsList title="Top 5 errors" errors={stats.topErrors} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default Dashboard

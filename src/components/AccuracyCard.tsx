import Card from './ui/Card'

interface AccuracyCardProps {
  accuracy: number
  totalMessages: number
}

const RADIUS = 30
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

function getAccuracyTone(accuracy: number) {
  // Texto num tom mais escuro que o anel (a fonte grande de 30px+ só
  // precisa de 3:1 pelo WCAG, mas emerald-600/amber-600 ficavam raspando
  // esse mínimo — 700 dá margem confortável sem perder o significado da cor).
  if (accuracy >= 85) return { ring: 'stroke-emerald-500', text: 'text-emerald-700' }
  if (accuracy >= 60) return { ring: 'stroke-amber-500', text: 'text-amber-700' }
  return { ring: 'stroke-rose-500', text: 'text-rose-600' }
}

function AccuracyCard({ accuracy, totalMessages }: AccuracyCardProps) {
  const tone = getAccuracyTone(accuracy)
  const offset = CIRCUMFERENCE - (Math.min(Math.max(accuracy, 0), 100) / 100) * CIRCUMFERENCE

  return (
    <Card className="flex items-center gap-4">
      <svg width="72" height="72" viewBox="0 0 72 72" className="-rotate-90 shrink-0" aria-hidden="true">
        <circle cx="36" cy="36" r={RADIUS} fill="none" strokeWidth="7" className="stroke-ink-100" />
        <circle
          cx="36"
          cy="36"
          r={RADIUS}
          fill="none"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={offset}
          className={`transition-[stroke-dashoffset] duration-700 ease-in-out-strong ${tone.ring}`}
        />
      </svg>
      <div>
        <p className="text-sm font-semibold text-ink-700">Accuracy</p>
        <p className={`font-display text-3xl font-extrabold ${tone.text}`}>{accuracy}%</p>
        <p className="mt-0.5 text-xs text-ink-500">
          {totalMessages} message{totalMessages === 1 ? '' : 's'}
        </p>
      </div>
    </Card>
  )
}

export default AccuracyCard

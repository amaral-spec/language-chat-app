import Card from './ui/Card'

interface ComparisonCardProps {
  yourErrorCount: number
  friendErrorCount: number
}

/**
 * Comparação lado a lado, não ranking (Decisão de Design da spec 005:
 * colaborativo, não competitivo) — nenhum dos dois lados é destacado como
 * "vencedor".
 */
function ComparisonCard({ yourErrorCount, friendErrorCount }: ComparisonCardProps) {
  return (
    <Card>
      <p className="text-sm font-semibold text-ink-700">Errors this conversation</p>
      <div className="mt-3 flex items-center justify-around text-center">
        <div>
          <p className="font-display text-2xl font-extrabold text-ink-900">{yourErrorCount}</p>
          <p className="mt-0.5 text-xs font-medium text-ink-500">You</p>
        </div>
        <div className="h-8 w-px bg-ink-200" aria-hidden="true" />
        <div>
          <p className="font-display text-2xl font-extrabold text-ink-900">{friendErrorCount}</p>
          <p className="mt-0.5 text-xs font-medium text-ink-500">Friend</p>
        </div>
      </div>
      <p className="sr-only">
        You: {yourErrorCount} errors | Friend: {friendErrorCount} errors
      </p>
    </Card>
  )
}

export default ComparisonCard

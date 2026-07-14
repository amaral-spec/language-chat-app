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
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-500">Errors this conversation</p>
      <div className="mt-2 flex items-center justify-around text-center">
        <div>
          <p className="text-2xl font-semibold text-gray-900">{yourErrorCount}</p>
          <p className="text-xs text-gray-500">You</p>
        </div>
        <div className="text-gray-300">|</div>
        <div>
          <p className="text-2xl font-semibold text-gray-900">{friendErrorCount}</p>
          <p className="text-xs text-gray-500">Friend</p>
        </div>
      </div>
      <p className="sr-only">
        You: {yourErrorCount} errors | Friend: {friendErrorCount} errors
      </p>
    </div>
  )
}

export default ComparisonCard

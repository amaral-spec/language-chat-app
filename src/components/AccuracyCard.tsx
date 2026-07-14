interface AccuracyCardProps {
  accuracy: number
  totalMessages: number
}

function AccuracyCard({ accuracy, totalMessages }: AccuracyCardProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-500">Accuracy</p>
      <p className="mt-1 text-3xl font-semibold text-gray-900">{accuracy}%</p>
      <p className="mt-1 text-xs text-gray-500">
        {totalMessages} message{totalMessages === 1 ? '' : 's'}
      </p>
    </div>
  )
}

export default AccuracyCard

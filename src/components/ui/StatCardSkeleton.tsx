import Card from './Card'
import Skeleton from './Skeleton'

interface StatCardSkeletonProps {
  className?: string
}

/** Placeholder no formato real de um card de estatística (label + valor grande + linha secundária). */
function StatCardSkeleton({ className = '' }: StatCardSkeletonProps) {
  return (
    <Card className={className}>
      <Skeleton className="h-3.5 w-24" />
      <Skeleton className="mt-3 h-7 w-16" />
      <Skeleton className="mt-2 h-3 w-32" />
    </Card>
  )
}

export default StatCardSkeleton

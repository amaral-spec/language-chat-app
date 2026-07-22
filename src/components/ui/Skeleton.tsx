interface SkeletonProps {
  className?: string
}

/** Bloco de placeholder pulsante — a base para montar skeletons no formato real de cada tela. */
function Skeleton({ className = '' }: SkeletonProps) {
  return <div aria-hidden="true" className={`animate-pulse rounded-md bg-ink-200/70 ${className}`} />
}

export default Skeleton

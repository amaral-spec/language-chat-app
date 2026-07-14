import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
  className?: string
}

/** Placeholder amigável para listas vazias (sem conversas, sem mensagens, sem erros...). */
function EmptyState({ icon, title, description, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-ink-300 bg-white/60 px-6 py-10 text-center ${className}`}
    >
      {icon && (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-brand-500">
          {icon}
        </div>
      )}
      <p className="font-display text-sm font-semibold text-ink-700">{title}</p>
      {description && <p className="max-w-xs text-sm text-ink-500">{description}</p>}
      {action}
    </div>
  )
}

export default EmptyState

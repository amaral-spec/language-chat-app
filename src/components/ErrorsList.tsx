import Card from './ui/Card'
import type { ErrorFrequency } from '../types'

interface ErrorsListProps {
  title: string
  errors: ErrorFrequency[]
}

const CATEGORY_DOT_CLASSES: Record<ErrorFrequency['category'], string> = {
  grammar: 'bg-brand-400',
  spelling: 'bg-accent-400',
}

function ErrorsList({ title, errors }: ErrorsListProps) {
  return (
    <Card>
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">{title}</p>
      {errors.length === 0 ? (
        <p className="mt-2 text-sm text-ink-400">No errors yet</p>
      ) : (
        <ol className="mt-2.5 space-y-2">
          {errors.map((error) => (
            <li key={error.errorType} className="flex items-center gap-2.5 text-sm">
              <span
                aria-hidden="true"
                className={`h-2 w-2 shrink-0 rounded-full ${CATEGORY_DOT_CLASSES[error.category]}`}
              />
              <span className="min-w-0 flex-1 truncate text-ink-700">{error.label}</span>
              <span className="shrink-0 rounded-full bg-ink-100 px-2 py-0.5 text-xs font-semibold text-ink-600">
                {error.count}x
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  )
}

export default ErrorsList

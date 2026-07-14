import type { ErrorFrequency } from '../types'

interface ErrorsListProps {
  title: string
  errors: ErrorFrequency[]
}

function ErrorsList({ title, errors }: ErrorsListProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm font-medium text-gray-500">{title}</p>
      {errors.length === 0 ? (
        <p className="mt-2 text-sm text-gray-400">No errors yet</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {errors.map((error) => (
            <li key={error.errorType} className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate text-gray-700">{error.label}</span>
              <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-700">
                {error.count}x
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default ErrorsList

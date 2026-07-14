import type { InputHTMLAttributes } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
}

/** Par label+input padrão do design system — `htmlFor`/`id` sempre ligados, para `getByLabelText` continuar funcionando. */
function Field({ id, label, className = '', ...props }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-ink-700">
        {label}
      </label>
      <input
        id={id}
        {...props}
        className={`w-full rounded-xl border border-ink-200 bg-white px-3.5 py-2.5 text-sm text-ink-900 transition-colors placeholder:text-ink-400 focus:border-brand-400 focus:outline-none focus:ring-4 focus:ring-brand-100 ${className}`}
      />
    </div>
  )
}

export default Field

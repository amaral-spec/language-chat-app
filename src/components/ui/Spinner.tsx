interface SpinnerProps {
  label?: string
  className?: string
}

/** Indicador de carregamento acessível — substitui os antigos textos soltos "Loading...". */
function Spinner({ label = 'Loading…', className = '' }: SpinnerProps) {
  return (
    <div role="status" className={`flex items-center gap-2 py-6 text-sm text-ink-500 ${className}`}>
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-200 border-t-brand-500" />
      {label}
    </div>
  )
}

export default Spinner

import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

interface ErrorTextProps {
  children: ReactNode
  className?: string
}

/** Mensagem de erro inline, sempre `role="alert"` para leitores de tela anunciarem automaticamente. */
function ErrorText({ children, className = '' }: ErrorTextProps) {
  return (
    <p role="alert" className={`flex items-start gap-1.5 text-sm font-medium text-rose-600 ${className}`}>
      <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  )
}

export default ErrorText

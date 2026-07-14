import { Check, Wand2, X } from 'lucide-react'
import type { Correction } from '../types'

interface CorrectionPanelProps {
  correction: Correction
  onAccept: () => void
  onDismiss: () => void
}

/**
 * Painel de correção PENDENTE (ainda não aceita/rejeitada), exibido
 * abaixo da mensagem original. Puramente apresentacional — quem decide o
 * que "aceitar"/"rejeitar" significam é o `MessageBubble` (ver lá: aceitar
 * troca esta UI pela mensagem riscada + versão corrigida).
 */
function CorrectionPanel({ correction, onAccept, onDismiss }: CorrectionPanelProps) {
  return (
    <div
      data-testid="correction-panel"
      className="mt-1.5 max-w-xs animate-fade-in space-y-2 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm shadow-sm shadow-amber-900/5"
    >
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
        <Wand2 size={12} aria-hidden="true" />
        Correction
      </span>
      <p className="font-medium text-ink-900">
        <span className="text-ink-400 line-through">{correction.originalText}</span>{' '}
        <span className="font-semibold text-emerald-700">{correction.correctedText}</span>
      </p>
      <p className="text-xs leading-relaxed text-ink-600">{correction.explanation}</p>
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={onAccept}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-700"
        >
          <Check size={13} aria-hidden="true" />
          Accept
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-amber-100 hover:text-ink-700"
        >
          <X size={13} aria-hidden="true" />
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default CorrectionPanel

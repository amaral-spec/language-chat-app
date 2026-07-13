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
      className="mt-1 max-w-xs animate-fade-in rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm"
    >
      <span className="mb-1 inline-block rounded bg-amber-500 px-1.5 py-0.5 text-xs font-medium text-white">
        Correction
      </span>
      <p className="font-medium text-gray-900">
        <span className="text-gray-500 line-through">{correction.originalText}</span>{' '}
        <span className="text-green-700">{correction.correctedText}</span>
      </p>
      <p className="mt-1 text-xs text-gray-600">{correction.explanation}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={onAccept}
          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default CorrectionPanel

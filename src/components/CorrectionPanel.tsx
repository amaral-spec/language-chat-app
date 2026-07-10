import { useState } from 'react'
import { markCorrectionAsAccepted } from '../services/correctionService'
import type { Correction } from '../types'

interface CorrectionPanelProps {
  correction: Correction
}

/**
 * Painel de correção exibido abaixo da mensagem original. "Accept" marca
 * `accepted_by_user` no banco (métrica) e "Dismiss" apenas esconde o
 * painel localmente, sem alterar nada no banco — em ambos os casos o
 * painel some da tela (spec: "painel desaparece").
 */
function CorrectionPanel({ correction }: CorrectionPanelProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  // Estado otimista para feedback imediato ao clicar "Accept" — o estado
  // "de verdade" é `correction.acceptedByUser`, que também reage a um
  // Realtime UPDATE vindo do outro participante (ex: amigo aceitou a
  // mesma correção em outra aba).
  const [isOptimisticallyAccepted, setIsOptimisticallyAccepted] = useState(false)

  if (isDismissed || correction.acceptedByUser || isOptimisticallyAccepted) return null

  async function handleAccept() {
    setIsOptimisticallyAccepted(true)
    await markCorrectionAsAccepted(correction.id)
  }

  return (
    <div
      data-testid="correction-panel"
      className="mt-1 max-w-xs animate-fade-in rounded-lg border border-amber-200 bg-amber-50 p-2 text-sm"
    >
      <span className="mb-1 inline-block rounded bg-amber-500 px-1.5 py-0.5 text-xs font-medium text-white">
        Correction
      </span>
      <p className="font-medium text-gray-900">{correction.correctedText}</p>
      <p className="mt-1 text-xs text-gray-600">{correction.explanation}</p>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={handleAccept}
          className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
        >
          Accept
        </button>
        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          className="rounded px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}

export default CorrectionPanel

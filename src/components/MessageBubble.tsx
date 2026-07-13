import { useState } from 'react'
import CorrectionPanel from './CorrectionPanel'
import { markCorrectionAsAccepted } from '../services/correctionService'
import type { Correction, Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  correction?: Correction
}

/**
 * LanguageTool retorna só o trecho errado + sua substituição (ex: "goed" ->
 * "went"), não a frase inteira — reconstruímos a versão corrigida completa
 * aqui, na hora de exibir, sem nunca alterar `message.content` no banco
 * (regra de negócio: "Correção não muda a mensagem original").
 */
function buildCorrectedMessage(original: string, correction: Correction): string {
  return original.replace(correction.originalText, correction.correctedText)
}

function MessageBubble({ message, isOwnMessage, correction }: MessageBubbleProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  // Estado otimista para feedback imediato ao clicar "Accept" — o estado
  // "de verdade" é `correction.acceptedByUser`, que também reage a um
  // Realtime UPDATE vindo do outro participante (ex: amigo aceitou a
  // mesma correção em outra aba).
  const [isOptimisticallyAccepted, setIsOptimisticallyAccepted] = useState(false)

  const isAccepted = Boolean(correction?.acceptedByUser) || isOptimisticallyAccepted
  const showPendingPanel = Boolean(correction) && !isAccepted && !isDismissed

  const time = new Date(message.createdAt).toLocaleTimeString()

  async function handleAccept() {
    if (!correction) return
    setIsOptimisticallyAccepted(true)
    await markCorrectionAsAccepted(correction.id)
  }

  return (
    <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
      <div
        className={`max-w-xs rounded-lg px-3 py-2 ${
          isOwnMessage ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-900'
        }`}
      >
        <p className={`whitespace-pre-wrap break-words ${isAccepted ? 'line-through opacity-70' : ''}`}>
          {message.content}
        </p>
        <span className="mt-1 block text-right text-xs opacity-70">{time}</span>
      </div>

      {isAccepted && correction && (
        <div
          data-testid="corrected-message"
          className="mt-1 max-w-xs animate-fade-in rounded-lg border border-green-200 bg-green-50 p-2 text-sm"
        >
          <span className="mb-1 inline-block rounded bg-green-600 px-1.5 py-0.5 text-xs font-medium text-white">
            Corrected
          </span>
          <p className="font-medium text-gray-900">{buildCorrectedMessage(message.content, correction)}</p>
        </div>
      )}

      {showPendingPanel && correction && (
        <CorrectionPanel correction={correction} onAccept={handleAccept} onDismiss={() => setIsDismissed(true)} />
      )}
    </div>
  )
}

export default MessageBubble

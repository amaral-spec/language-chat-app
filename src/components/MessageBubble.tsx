import { CheckCheck } from 'lucide-react'
import { useState } from 'react'
import CorrectionPanel from './CorrectionPanel'
import { markCorrectionAsAccepted } from '../services/correctionService'
import type { Correction, Message } from '../types'

interface MessageBubbleProps {
  message: Message
  isOwnMessage: boolean
  correction?: Correction
  /**
   * Só true pra mensagens que chegam via Realtime depois que o chat já
   * carregou (ver `useMessageArrivalTracking` em Chat.tsx) — histórico e
   * mensagens carregadas por "scroll pra cima" nunca são "novas". Só
   * anima a entrada de mensagens do amigo: a sua própria já teve
   * feedback instantâneo (o envio otimista), animar de novo seria
   * redundante.
   */
  isNew?: boolean
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

function MessageBubble({ message, isOwnMessage, correction, isNew = false }: MessageBubbleProps) {
  const [isDismissed, setIsDismissed] = useState(false)
  // Estado otimista para feedback imediato ao clicar "Accept" — o estado
  // "de verdade" é `correction.acceptedByUser`, que também reage a um
  // Realtime UPDATE vindo do outro participante (ex: amigo aceitou a
  // mesma correção em outra aba).
  const [isOptimisticallyAccepted, setIsOptimisticallyAccepted] = useState(false)

  const isAccepted = Boolean(correction?.acceptedByUser) || isOptimisticallyAccepted
  const showPendingPanel = Boolean(correction) && !isAccepted && !isDismissed

  const time = new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  async function handleAccept() {
    if (!correction) return
    setIsOptimisticallyAccepted(true)
    await markCorrectionAsAccepted(correction.id)
  }

  return (
    <div
      className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} ${
        isNew && !isOwnMessage ? 'animate-message-in' : ''
      }`}
    >
      <div
        className={`max-w-xs rounded-2xl px-3.5 py-2.5 sm:max-w-sm ${
          isOwnMessage
            ? 'rounded-br-md bg-gradient-to-br from-brand-500 to-brand-600 text-white'
            : 'rounded-bl-md border border-ink-200/70 bg-white text-ink-900'
        }`}
      >
        <p className={`whitespace-pre-wrap break-words text-sm ${isAccepted ? 'line-through opacity-70' : ''}`}>
          {message.content}
        </p>
        <span
          className={`mt-1 flex items-center justify-end gap-1 text-right text-[11px] ${
            isOwnMessage ? 'text-white' : 'text-ink-500'
          }`}
        >
          {time}
          {isOwnMessage && <CheckCheck size={13} aria-hidden="true" />}
        </span>
      </div>

      {isAccepted && correction && (
        <div
          data-testid="corrected-message"
          className="mt-1.5 max-w-xs animate-fade-in rounded-2xl border border-emerald-200 bg-emerald-50 p-2.5 text-sm shadow-sm shadow-emerald-900/5 sm:max-w-sm"
        >
          <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-emerald-700 px-2 py-0.5 text-xs font-semibold text-white">
            <CheckCheck size={12} aria-hidden="true" />
            Corrected
          </span>
          <p className="font-medium text-ink-900">{buildCorrectedMessage(message.content, correction)}</p>
        </div>
      )}

      {showPendingPanel && correction && (
        <CorrectionPanel correction={correction} onAccept={handleAccept} onDismiss={() => setIsDismissed(true)} />
      )}
    </div>
  )
}

export default MessageBubble

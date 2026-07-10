// Supabase Edge Function (Deno runtime): recebe uma mensagem, pede correção
// gramatical à Claude API e salva o resultado em `public.corrections`.
//
// Regras de negócio (ver spec/features/003-ai-correction.md):
// - Mensagens com <5 caracteres não são processadas.
// - Timeout de 5s na chamada à Claude API: falha SEMPRE silenciosa (o
//   usuário nunca vê um erro de correção, só simplesmente não vê correção).
// - confidence < 0.6 não é salvo nem retornado (muito incerto / mensagem
//   sem erro real).
// - explanation tem no máximo 200 caracteres.
// - A chave da Claude API (ANTHROPIC_API_KEY) só existe aqui, nunca no
//   frontend — configurada via `supabase secrets set`.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const MIN_MESSAGE_LENGTH = 5
const MAX_EXPLANATION_LENGTH = 200
const MIN_CONFIDENCE = 0.6
const CLAUDE_TIMEOUT_MS = 5000
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001'
const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RequestPayload {
  messageId?: unknown
  text?: unknown
}

interface ClaudeCorrection {
  corrected: string
  explanation: string
  confidence: number
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function buildSystemPrompt(): string {
  return [
    'You are a grammar correction assistant embedded in a language-learning chat app.',
    'The user is practicing English. Given their message, respond with ONLY a raw JSON object (no markdown, no code fences, no prose) in this exact shape:',
    '{"corrected": string, "explanation": string, "confidence": number}',
    '',
    '- "corrected": the grammatically correct version of the message. If it is already correct, return it unchanged.',
    '- "explanation": a brief English explanation of the fix, under 200 characters. Empty string if no correction is needed.',
    '- "confidence": 0.0 to 1.0, how confident you are that this is a real, correct grammar fix. Use a value below 0.3 when the message has no grammar errors.',
  ].join('\n')
}

function parseClaudeCorrection(rawText: string): ClaudeCorrection | null {
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[0])
    if (
      typeof parsed.corrected !== 'string' ||
      typeof parsed.explanation !== 'string' ||
      typeof parsed.confidence !== 'number'
    ) {
      return null
    }

    return {
      corrected: parsed.corrected,
      explanation: parsed.explanation.slice(0, MAX_EXPLANATION_LENGTH),
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
    }
  } catch {
    return null
  }
}

/**
 * Chama a Claude API com timeout de `CLAUDE_TIMEOUT_MS`. Qualquer falha
 * (timeout, erro de rede, resposta malformada, chave ausente) retorna
 * `null` em vez de lançar — quem chama trata `null` como "sem correção",
 * nunca como erro (falha sempre silenciosa, conforme regra de negócio).
 */
async function callClaude(text: string): Promise<ClaudeCorrection | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) {
    console.error('ANTHROPIC_API_KEY is not configured')
    return null
  }

  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), CLAUDE_TIMEOUT_MS)

  try {
    const response = await fetch(CLAUDE_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 300,
        temperature: 0,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: text }],
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      console.error(`Claude API responded with status ${response.status}`)
      return null
    }

    const data = await response.json()
    const rawText = data?.content?.[0]?.text
    if (typeof rawText !== 'string') return null

    return parseClaudeCorrection(rawText)
  } catch (error) {
    // AbortError = timeout > 5s. Qualquer outro erro de rede/parse também
    // cai aqui — em ambos os casos, falha silenciosa.
    console.error('Claude API call failed', error instanceof Error ? error.message : error)
    return null
  } finally {
    clearTimeout(timeoutId)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let payload: RequestPayload
  try {
    payload = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON body' }, 400)
  }

  const { messageId, text } = payload

  if (typeof messageId !== 'string' || typeof text !== 'string') {
    return jsonResponse({ error: 'messageId and text are required' }, 400)
  }

  if (text.trim().length < MIN_MESSAGE_LENGTH) {
    return jsonResponse({ correction: null })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured')
    return jsonResponse({ correction: null })
  }

  // Service role client: ignora RLS. Necessário para resolver a
  // conversation_id da mensagem e para inserir em `corrections`, já que
  // participantes não têm policy de INSERT nessa tabela (só a Edge
  // Function grava correções).
  const supabase = createClient(supabaseUrl, serviceRoleKey)

  const { data: messageRow, error: messageError } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .eq('id', messageId)
    .single()

  if (messageError || !messageRow) {
    return jsonResponse({ error: 'Message not found' }, 404)
  }

  const claudeCorrection = await callClaude(text)

  if (!claudeCorrection || claudeCorrection.confidence < MIN_CONFIDENCE) {
    return jsonResponse({ correction: null })
  }

  // Uma mensagem só pode ter UMA correção: se já existir (ex: chamada
  // duplicada), ignora o conflito e segue sem erro.
  const { error: insertError } = await supabase
    .from('corrections')
    .insert({
      message_id: messageId,
      conversation_id: messageRow.conversation_id,
      corrected_text: claudeCorrection.corrected,
      explanation: claudeCorrection.explanation,
      confidence: claudeCorrection.confidence,
    })
    .select()
    .single()

  if (insertError && insertError.code !== '23505') {
    console.error('Failed to save correction', insertError.message)
    return jsonResponse({ correction: null })
  }

  return jsonResponse({
    correction: {
      original: text,
      corrected: claudeCorrection.corrected,
      explanation: claudeCorrection.explanation,
      confidence: claudeCorrection.confidence,
    },
  })
})

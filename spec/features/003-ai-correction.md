# specs/003-ai-correction.md

## O que é

Integrar Claude API para corrigir mensagens em tempo real, mostrando sugestões de correção, explicação gramatical e permitindo que o usuário aceite ou rejeite a sugestão.

## Por que

Usuários aprendem melhor quando recebem feedback imediato sobre seus erros. Correções com explicação ajudam a fixar regras gramaticais enquanto conversam.

## Casos de Uso

1. **Usuário envia mensagem com erro**: "I goed to the store"
2. **IA processa**: Claude API recebe a mensagem e retorna correção em <3s
3. **Correção aparece**: "I went to the store" + explicação ("Past tense of 'go' is 'went'")
4. **Usuário aceita**: Clica botão "Accept" → mensagem original é MARCADA como aceita
5. **Usuário rejeita**: Clica "Dismiss" → correção é ocultada
6. **Ambos veem**: Amigo também vê a correção (educativo)
7. **Nenhuma correção**: Mensagem perfeita → nenhuma sugestão aparece

## Regras de Negócio

- Correções SÓ são processadas se a mensagem tem 5+ caracteres
- Timeout de Claude API: se >5s, não mostra erro (falha silenciosa)
- Uma mensagem pode ter apenas UMA correção (a melhor)
- Confidence < 0.6 = não mostra (muito incerto)
- Explicação máximo 200 caracteres (breve e clara)
- Correção não muda a mensagem original (apenas registro à parte)
- Aceitar correção é apenas UI (não altera nada no banco, é métrica)
- Claude API NUNCA é chamada do frontend (sempre via Edge Function)
- Chave da API nunca é exposta no localStorage, console, logs

## Decisões de Design

| Decisão | Opção Escolhida | Alternativa | Por quê |
|---------|-----------------|-------------|--------|
| Quando chamar Claude | Ao enviar mensagem | Depois de carregar (delay) | Feedback imediato, melhor UX |
| Onde chamar | Via Edge Function | Frontend fetch | Seguro: chave da API fica no servidor |
| Armazenar correção | Tabela `corrections` (FK message_id) | JSONB em messages | Histórico e auditoria |
| Mostrar em tempo real | Supabase Realtime | Polling | <2s, escalável |
| Confidence filter | Rejeitar <0.6 | Mostrar tudo | Menos noise, mais qualidade |
| Linguagem da explicação | Inglês (idioma do chat) | Português | Usuário já está em inglês |

## Fatias Implementáveis

### Fatia 1: Tipos + Schema + Edge Function Base

**O que faz**:
- Define tipos TypeScript para Correction, ClaudeResponse
- Cria tabela `corrections` com FK para `messages`
- Cria Supabase Edge Function que vai chamar Claude API

**Artefatos**:
- `src/types/index.ts` — adiciona tipos `Correction`, `CorrectionPayload`, `ClaudeAPIResponse`
- `database/migrations/004_create_corrections_table.sql`
- `supabase/functions/correct-message/index.ts` — Edge Function (scaffold básico)
- RLS policy para `corrections` table

**Teste**:
```bash
# Manual no Supabase console:
✓ Tabela corrections criada com FK message_id
✓ RLS: usuários veem correções de suas conversas
✓ Edge Function endpoint existe e responde
```

**Bloqueadores**: Fatia 4 da spec 002 (Realtime subscription)

---

### Fatia 2: Chamar Claude API + Salvar Correção

**O que faz**:
- Edge Function recebe mensagem + contexto (idioma, usuário)
- Chama Claude API com prompt para gerar correção
- Parseia resposta JSON
- Salva em tabela `corrections` com confidence
- Retorna correção ao frontend via Realtime

**Artefatos**:
- `supabase/functions/correct-message/index.ts` — implementação completa
- `src/services/correctionService.ts` — função `requestCorrection(messageId)` no frontend
- Variáveis de ambiente no Supabase: `ANTHROPIC_API_KEY`

**Teste**:
```bash
# Manual com curl:
POST /functions/v1/correct-message
{
  "messageId": "xxx",
  "text": "I goed to the store",
  "sourceLanguage": "en",
  "targetLanguage": "pt"
}

✓ Resposta tem: corrected, explanation, confidence
✓ Correção salva em banco com message_id, text, explanation
✓ Timeout >5s → fallback silencioso (não mostra erro)
✓ Confidence <0.6 → não salva
```

**Bloqueadores**: Fatia 1 (Schema + tipos)

---

### Fatia 3: Mostrar Correções no UI

**O que faz**:
- Adiciona componente `CorrectionPanel` que mostra a correção abaixo da mensagem
- Realtime subscription carrega correções quando chegam
- Layout: mensagem original → correção com badge + explicação
- Aplica animação de fade-in (entra suavemente)

**Artefatos**:
- `src/components/CorrectionPanel.tsx` — UI da correção
- `src/components/MessageBubble.tsx` — adiciona CorrectionPanel dentro
- `src/hooks/useCorrections.ts` — hook customizado (subscribe realtime)
- `src/services/chatService.ts` — função `subscribeToCorrections(conversationId)`

**Teste**:
```bash
# 2 browsers no mesmo chat:
✓ Browser 1 envia "I goed"
✓ Dentro de 3s, CorrectionPanel aparece com:
  - Badge "Correction"
  - "I went to the store"
  - "Past tense of 'go' is 'went'"
✓ Browser 2 também vê a correção (Realtime)
✓ Mensagem sem erro → nenhum CorrectionPanel
✓ Fade-in animation ao aparecer
```

**Bloqueadores**: Fatia 2 (Claude API + Edge Function)

---

### Fatia 4: Aceitar/Rejeitar Correção (UI)

**O que faz**:
- Adiciona botões "Accept" e "Dismiss" no CorrectionPanel
- Clique em Accept → marca como accepted no banco (métrica)
- Clique em Dismiss → esconde painel (mas mantém em banco)
- Salva métrica em campo `accepted_by_user` (boolean)

**Artefatos**:
- `src/components/CorrectionPanel.tsx` — adiciona botões
- `src/services/correctionService.ts` — função `markCorrectionAsAccepted(correctionId)`
- Adiciona campo `accepted_by_user` na migration

**Teste**:
```bash
✓ Click "Accept" → correção marcada, painel desaparece
✓ Click "Dismiss" → painel desaparece sem marcar
✓ Ao carregar histórico → estado persiste (aceita/rejeita)
✓ Amigo vê o estado também (via Realtime)
```

**Bloqueadores**: Fatia 3 (UI de correção)

---

## Checklist de Integração

- [ ] `npm test` passa — testes de correção
- [ ] `npm run lint` — sem erros
- [ ] Schema migrado no Supabase
- [ ] Edge Function deployada (`supabase functions deploy correct-message`)
- [ ] ANTHROPIC_API_KEY configurada no Supabase secrets
- [ ] Enviar mensagem com erro → correção aparece em <3s
- [ ] Ambos os usuários veem a correção (Realtime)
- [ ] Mensagem perfeita → nenhuma correção
- [ ] Confidence <0.6 → nenhuma correção
- [ ] Accept → marca no banco
- [ ] Dismiss → esconde
- [ ] Timeout silencioso >5s
- [ ] Chave da API não aparece no console/localStorage
- [ ] Commit com mensagem: "feat: implementar correção com IA (fatias 1-4)"

## Notas

- Análise de erros frequentes (fatia 5, futura) será em spec 005
- Histórico de correções rejeitadas pode ser usado para treino later
- Limite de requisições à Claude API: considerar throttling se muitas conversas ativas
- Primeiro teste com `gpt-4o` pode ser caro; considerar usar `claude-opus-4-6` depois de validar
- Idioma do chat (en→pt, pt→en, etc) é definido no Conversation, reutilizar para prompt

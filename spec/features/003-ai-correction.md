# specs/003-ai-correction.md

## O que é

Integrar LanguageTool API para corrigir mensagens em tempo real, mostrando sugestões de correção, explicação gramatical e permitindo que o usuário aceite ou rejeite a sugestão.

## Por que

Usuários aprendem melhor quando recebem feedback imediato sobre seus erros. Correções com explicação ajudam a fixar regras gramaticais enquanto conversam.

## Casos de Uso

1. **Usuário envia mensagem com erro**: "I goed to the store"
2. **LanguageTool processa**: API pública retorna erros encontrados em <1s
3. **Correção aparece**: "I went to the store" + explicação ("Word form should be 'went'")
4. **Usuário aceita**: Clica botão "Accept" → marca como aceita no banco
5. **Usuário rejeita**: Clica "Dismiss" → correção é ocultada
6. **Ambos veem**: Amigo também vê a correção (educativo)
7. **Nenhuma correção**: Mensagem perfeita → nenhuma sugestão aparece

## Regras de Negócio

- Correções SÓ são processadas se a mensagem tem 5+ caracteres
- Timeout de LanguageTool: se >3s, não mostra erro (falha silenciosa)
- Uma mensagem pode ter múltiplos erros, mas mostra o MAIS IMPORTANTE (primeiro)
- Categoria do erro deve ser "Grammar" ou "Spelling" (ignora "Style")
- Explicação máxima 200 caracteres (breve e clara)
- Correção não muda a mensagem original (apenas registro à parte)
- Aceitar correção é apenas UI (não altera nada no banco, é métrica)
- LanguageTool é chamado do frontend (API pública, sem auth)
- Limite: 20 requisições/min por IP (suficiente para aprendizado)

## Decisões de Design

| Decisão | Opção Escolhida | Alternativa | Por quê |
|---------|-----------------|-------------|--------|
| Quando chamar LanguageTool | Ao enviar mensagem | Depois de carregar (delay) | Feedback imediato, melhor UX |
| Onde chamar | Frontend fetch direto | Backend proxy | API pública, sem auth necessária |
| Armazenar correção | Tabela `corrections` (FK message_id) | JSONB em messages | Histórico e auditoria |
| Mostrar em tempo real | Supabase Realtime | Polling | <2s, escalável |
| Qual erro mostrar | O primeiro/mais importante | Todos os erros | Não sobrecarrega UI |
| Linguagem da explicação | Inglês (idioma do chat) | Português | Usuário já está em inglês |

## Fatias Implementáveis

### Fatia 1: Tipos + Schema + Contrato LanguageTool

**O que faz**:
- Define tipos TypeScript para Correction, LanguageTool response
- Cria tabela `corrections` com FK para `messages`
- Documenta contrato da API LanguageTool

**Artefatos**:
- `src/types/index.ts` — adiciona tipos `Correction`, `CorrectionPayload`, `LanguageToolMatch`
- `database/migrations/004_create_corrections_table.sql`
- RLS policy para `corrections` table
- Documentação em comentário sobre LanguageTool API

**LanguageTool Response Contract**:
```json
{
  "matches": [
    {
      "message": "Word form should be 'went'",
      "short_message": "Word form",
      "offset": 2,
      "length": 4,
      "replacements": [
        { "value": "went" },
        { "value": "go" }
      ],
      "rule": {
        "id": "SIMPLE_AGREEMENT_VERB_EN",
        "description": "Tense agreement",
        "issueType": "grammar"
      },
      "type": {
        "typeName": "Other"
      }
    }
  ],
  "language": "en-US"
}
```

**Teste**:
```bash
# Manual no Supabase console:
✓ Tabela corrections criada com FK message_id
✓ RLS: usuários veem correções de suas conversas
✓ LanguageTool API é acessível via fetch
```

**Bloqueadores**: Fatia 4 da spec 002 (Realtime subscription)

---

### Fatia 2: Chamar LanguageTool + Salvar Correção

**O que faz**:
- Frontend chama LanguageTool API (pública, sem auth)
- Parseia resposta e extrai erro mais importante
- Filtra apenas Grammar/Spelling (ignora Style)
- Salva em tabela `corrections`
- Retorna correção ao frontend

**Artefatos**:
- `src/services/correctionService.ts` — função `correctMessage(text, language)`
- Hook interno que detecta melhor sugestão (offset, categoria)

**Implementação pseudocódigo**:
```typescript
async function correctMessage(text: string, language: string): Promise<Correction | null> {
  if (text.length < 5) return null;
  
  try {
    const response = await fetch('https://api.languagetool.org/v2/check', {
      method: 'POST',
      body: new URLSearchParams({
        text: text,
        language: language, // 'en-US', 'pt-BR', etc
      }),
    });
    
    const data = await response.json();
    
    // Filtrar apenas Grammar/Spelling, ignorar Style
    const importantMatches = data.matches.filter(
      (m) => m.rule.issueType === 'grammar' || m.rule.issueType === 'misspelling'
    );
    
    if (importantMatches.length === 0) return null;
    
    // Pegar o primeiro erro (mais importante)
    const bestMatch = importantMatches[0];
    
    return {
      original: text.substring(bestMatch.offset, bestMatch.offset + bestMatch.length),
      corrected: bestMatch.replacements[0].value,
      explanation: bestMatch.message,
      confidence: 0.95, // LanguageTool não fornece confidence, assumir alto
    };
  } catch (error) {
    return null; // Falha silenciosa
  }
}
```

**Teste**:
```bash
# Manual via fetch no console:
✓ "I goed" → retorna {corrected: "went", explanation: "..."}
✓ "The cat are" → retorna {corrected: "is", explanation: "..."}
✓ "I am here" → retorna null (nenhum erro)
✓ Timeout >3s → retorna null (silencioso)
✓ Correção salva em banco com message_id
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
✓ Dentro de 2s, CorrectionPanel aparece com:
  - Badge "Correction"
  - "went" (highlighted)
  - "Word form should be 'went'"
✓ Browser 2 também vê a correção (Realtime)
✓ Mensagem sem erro → nenhum CorrectionPanel
✓ Fade-in animation ao aparecer
```

**Bloqueadores**: Fatia 2 (LanguageTool + correção)

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
- [ ] Enviar mensagem com erro → correção aparece em <2s
- [ ] Ambos os usuários veem a correção (Realtime)
- [ ] Mensagem perfeita → nenhuma correção
- [ ] Accept → marca no banco
- [ ] Dismiss → esconde
- [ ] Timeout silencioso >3s
- [ ] Apenas Grammar/Spelling são mostrados (ignora Style)
- [ ] Commit com mensagem: "feat: implementar correção com LanguageTool (fatias 1-4)"

## Notas

- LanguageTool suporta 30+ idiomas (en-US, pt-BR, pt-PT, es-ES, etc)
- Limite de 20 requisições/min por IP (em produção, considerar debounce ou batch)
- API pública é gratuita (não precisa auth, nenhum cartão de crédito)
- Premium do LanguageTool não é necessário para aprendizado
- Análise de erros frequentes (fatia 5, futura) será em spec 005
- Quando migrar para Claude depois, a estrutura de tipos permanece igual (só muda a implementação)

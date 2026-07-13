# specs/004-language-selection.md

## O que é

Permitir que dois usuários selecionem qual idioma eles querem praticar juntos antes de começar a conversa. Ambos aprenderão e serão corrigidos no mesmo idioma.

## Por que

LanguageTool precisa saber qual idioma corrigir. Além disso, usuários precisam acordar "vamos praticar inglês" ou "vamos praticar português" para que a conversa faça sentido pedagogicamente.

## Casos de Uso

1. **Criando nova conversa**: Gabriel e amigo clicam "Nova conversa", selecionam "English" (ambos vão praticar inglês)
2. **Conversando**: Ambos digitam em inglês, LanguageTool corrige em inglês
3. **Mudando idioma**: Abrindo conversa anterior, idioma já está salvo
4. **Histórico preserva idioma**: Ao carregar chat antigo, sabe qual idioma foi praticado ali

## Regras de Negócio

- Uma conversa tem UMA e APENAS UM idioma de aprendizado
- Ambos os usuários aprendem o mesmo idioma
- Idiomas suportados: English (en-US), Portuguese (pt-BR), Spanish (es-ES), French (fr-FR), German (de-DE), Italian (it-IT)
- Idioma é selecionado ao criar a conversa (não pode mudar depois)
- LanguageTool recebe o código de idioma correto (en-US, pt-BR, etc)
- UI em português (Brasil): "Qual idioma você quer praticar?"
- Padrão é English se não selecionado

## Decisões de Design

| Decisão | Opção Escolhida | Alternativa | Por quê |
|---------|-----------------|-------------|--------|
| Onde salvar idioma | Campo `learning_language` em conversations | Tabela separada | Simples, sem join |
| Código do idioma | Locale padrão (en-US, pt-BR) | ISO-639-1 (en, pt) | Compatível com LanguageTool |
| Seleção | Modal ao criar conversa | Dentro da conversa depois | Garante que foi acordado |
| Mudança de idioma | Não é permitido | Permitir mudar | Evita confusão, histórico consistente |

## Fatias Implementáveis

### Fatia 1: Tipo + Schema + Enum de Idiomas

**O que faz**:
- Define tipo TypeScript `Language` com idiomas suportados
- Adiciona coluna `learning_language` em conversations table
- Cria enum/constante de idiomas disponíveis

**Artefatos**:
- `src/types/index.ts` — adiciona tipos `Language`, `LanguageCode`
- `src/constants/languages.ts` — enum de idiomas com códigos LanguageTool
- `database/migrations/005_add_learning_language_to_conversations.sql`
- RLS policies (sem mudanças, conversa continua protegida)

**Exemplo de Enum**:
```typescript
export const SUPPORTED_LANGUAGES = [
  { code: 'en-US', name: 'English', flag: '🇺🇸' },
  { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
  { code: 'pt-PT', name: 'Português (Portugal)', flag: '🇵🇹' },
  { code: 'es-ES', name: 'Español', flag: '🇪🇸' },
  { code: 'fr-FR', name: 'Français', flag: '🇫🇷' },
  { code: 'de-DE', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'it-IT', name: 'Italiano', flag: '🇮🇹' },
] as const;
```

**Teste**:
```bash
# Manual no Supabase:
✓ Coluna learning_language adicionada em conversations
✓ Conversa criada com learning_language = 'en-US'
✓ RLS policies continuam funcionando
```

**Bloqueadores**: Nenhum (schema simples)

---

### Fatia 2: Modal de Seleção de Idioma

**O que faz**:
- Cria componente `LanguageSelector` — modal com lista de idiomas
- Adiciona flag emoji + nome de cada idioma
- Ao selecionar, salva no banco (`learning_language`)
- Modal aparece ao clicar "Nova Conversa"

**Artefatos**:
- `src/components/LanguageSelector.tsx` — modal de seleção
- `src/components/NewConversationModal.tsx` — integra LanguageSelector
- `src/services/chatService.ts` — função `createConversationWithLanguage(friendId, languageCode)`

**Teste**:
```bash
npm test chat-messaging.spec.ts

✓ Click "Nova Conversa" → abre modal
✓ Modal mostra 7 idiomas com flags
✓ Select "English" → conversa criada com learning_language = 'en-US'
✓ Select "Português" → conversa criada com learning_language = 'pt-BR'
✓ Conversa aparece no dashboard com idioma salvo
```

**Bloqueadores**: Fatia 1 (Schema)

---

### Fatia 3: Mostrar Idioma no Chat

**O que faz**:
- Adiciona badge com idioma no topo do chat
- Mostra "Learning: English 🇺🇸"
- LanguageTool usa esse idioma (não precisa de seleção dinâmica)

**Artefatos**:
- `src/pages/ChatRoom.tsx` — adiciona header com idioma
- `src/components/Chat.tsx` — mostra badge

**Teste**:
```bash
✓ Abre chat de conversa com English → mostra "Learning: English 🇺🇸"
✓ Abre chat de conversa com Português → mostra "Learning: Português (Brasil) 🇧🇷"
✓ Badge é lido-apenas (não pode mudar)
```

**Bloqueadores**: Fatia 2 (Modal)

---

### Fatia 4: Passar Idioma para LanguageTool

**O que faz**:
- Ao chamar LanguageTool em correctionService.ts, passa o `learning_language` correto
- LanguageTool recebe en-US, pt-BR, etc
- Correções respeitam o idioma da conversa

**Artefatos**:
- `src/services/correctionService.ts` — adiciona parâmetro `language` em `correctMessage()`
- `src/hooks/useCorrections.ts` — passa language do contexto
- `src/services/chatService.ts` — subscribeToMessages carrega language da conversa

**Teste**:
```bash
# 2 browsers, conversa em Portuguese:
✓ Browser 1 envia "O gato são feliz" (errado em português)
✓ LanguageTool recebe language='pt-BR'
✓ Correção: "O gato é feliz"
✓ Browser 2 vê correção (português)

# Mesma coisa em English:
✓ "The cat are happy" → "The cat is happy"
```

**Bloqueadores**: Fatia 3 (Idioma no UI) + Fatia 1 da spec 003 (LanguageTool básico)

---

## Checklist de Integração

- [ ] `npm test` passa — testes de language selection
- [ ] `npm run lint` — sem erros
- [ ] Schema migrado no Supabase
- [ ] Novo modal de seleção funciona
- [ ] Idioma salvo em conversations.learning_language
- [ ] Badge mostra idioma correto no chat
- [ ] LanguageTool recebe idioma correto
- [ ] Correções respeitam idioma da conversa
- [ ] 7 idiomas suportados funcionam
- [ ] Commit com mensagem: "feat: implementar seleção de idioma (fatias 1-4)"

## Notas

- Mudança de idioma é futura (spec 008, requer histórico separado por idioma)
- Suporte a mais idiomas é trivial: adicionar em SUPPORTED_LANGUAGES
- Integração com LanguageTool é direta (já suporta todos esses idiomas)
- Future: analytics por idioma (qual idioma mais praticado)

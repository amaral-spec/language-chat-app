# specs/002-chat-realtime.md

## O que é

Permitir que dois usuários criem uma conversa e enviem/recebam mensagens em tempo real, com histórico persistido e notificações em menos de 2 segundos.

## Por que

Chat em tempo real é o núcleo do app. Usuários precisam conversar e ver mensagens do outro instantaneamente para praticar idioma efetivamente.

## Casos de Uso

1. **Usuário cria nova conversa**: Seleciona amigo, cria conversa, é redirecionado para chat vazio
2. **Usuário vê lista de conversas**: Dashboard mostra todas as conversas com último preview de mensagem
3. **Usuário envia mensagem**: Digita, clica enviar, mensagem aparece imediatamente em seu chat
4. **Outro usuário recebe**: Sem recarregar página, mensagem aparece em <2s via Realtime
5. **Usuário vê histórico**: Abre conversa antiga, vê todas as mensagens em ordem cronológica
6. **Ambos recebem simultaneamente**: Se ambos estão no chat, ambos veem a mensagem em tempo real

## Regras de Negócio

- Uma conversa só pode ter 2 usuários (não é grupo)
- Conversas não podem ser deletadas (apenas soft delete)
- Mensagens são imutáveis (nunca podem ser editadas/deletadas)
- Cada mensagem tem timestamp `created_at` (servidor, não cliente)
- Ordem das mensagens é sempre cronológica ascendente (mais antigas primeiro)
- Notificação realtime dispara para AMBOS os usuários da conversa
- Mensagem vazia ou só whitespace é rejeitada
- Limite de 5000 caracteres por mensagem

## Decisões de Design

| Decisão | Opção Escolhida | Alternativa | Por quê |
|---------|-----------------|-------------|--------|
| Onde armazenar conversas | Tabela `conversations` (2 users cada) | Tabela `users_conversations` (pivot) | Simples, sem necessidade de join |
| Onde armazenar mensagens | Tabela `messages` com FK para conversation | Array JSONB em conversations | Relacional = buscas rápidas + histórico |
| Realtime | Supabase Realtime (PostgreSQL LISTEN) | Polling a cada N segundos | < 2s nativamente, escalável |
| Busca de histórico | SELECT com LIMIT + OFFSET | Trazer todas de uma vez | Suporta scroll infinito depois |
| Timestamp | `created_at` (servidor) | Timestamp do cliente | Evita clock skew entre browsers |

## Fatias Implementáveis

### Fatia 1: Tipos + Schema + RLS Policies

**O que faz**:
- Define tipos TypeScript para Conversation, Message
- Cria tabelas `conversations` e `messages` no Supabase
- Implementa RLS policies (usuários só veem suas conversas)

**Artefatos**:
- `src/types/index.ts` — adiciona tipos `Conversation`, `Message`, `CreateMessagePayload`
- `database/migrations/002_create_conversations_table.sql`
- `database/migrations/003_create_messages_table.sql`
- RLS policies em ambas as tabelas

**Teste**:
```bash
# Manual no Supabase console:
✓ Conversa criada entre user1 e user2
✓ user1 SELECT conversations → vê suas conversas (RLS)
✓ user2 SELECT conversations → vê suas conversas (RLS)
✓ user1 não consegue ver conversas de user3 (RLS bloqueia)
✓ Mensagem inserida → aparece em messages table
```

**Bloqueadores**: Fatia 1 da spec 001 (usuários existem)

---

### Fatia 2: Lista de Conversas + Dashboard

**O que faz**:
- Página `/conversations` que lista todas as conversas do usuário
- Card com preview (último preview de mensagem)
- Botão para criar nova conversa
- Modal para selecionar amigo

**Artefatos**:
- `src/pages/Conversations.tsx` — dashboard principal
- `src/components/ConversationCard.tsx` — card de conversa
- `src/components/NewConversationModal.tsx` — modal de criação
- `src/services/chatService.ts` — função `listConversations()`, `createConversation()`
- `src/hooks/useConversations.ts` — hook customizado

**Teste**:
```bash
npm test chat-messaging.spec.ts

✓ Dashboard mostra todas as conversas do usuário logado
✓ Cada conversa mostra: avatar do amigo, nome, último preview
✓ Click em conversa → navega para /chat/:conversationId
✓ Click em "New Conversation" → modal abre
✓ Selecionar amigo no modal → conversa criada e abre
✓ Conversa já existente com amigo → não cria duplicada
```

**Bloqueadores**: Fatia 1 (Schema + RLS)

---

### Fatia 3: Chat + Envio de Mensagens

**O que faz**:
- Página `/chat/:conversationId` com UI de chat
- Input para digitar mensagem
- Botão enviar
- Mensagem enviada aparece imediatamente (otimista)
- Mensagem salva no banco

**Artefatos**:
- `src/pages/ChatRoom.tsx` — página de chat
- `src/components/Chat.tsx` — lista de mensagens
- `src/components/MessageBubble.tsx` — single message (esquerda/direita)
- `src/components/MessageInput.tsx` — input + button
- `src/services/chatService.ts` — função `sendMessage()`
- `src/hooks/useMessages.ts` — hook customizado

**Teste**:
```bash
npm test chat-messaging.spec.ts

✓ Digita mensagem → aparece em real-time no chat (otimista)
✓ Mensagem é persistida no banco
✓ Ao recarregar página → histórico carrega
✓ Mensagem vazia é rejeitada
✓ Mensagem com >5000 chars é rejeitada
✓ Timestamp vem do servidor (não do cliente)
```

**Bloqueadores**: Fatia 2 (Dashboard + roteamento)

---

### Fatia 4: Realtime Subscription + Histórico

**O que faz**:
- Supabase Realtime: ambos usuários veem mensagens novas em <2s
- Carregamento de histórico (últimas 50 mensagens ao abrir chat)
- Scroll infinito (carregar mais antigas quando scrollar para cima)

**Artefatos**:
- `src/hooks/useMessages.ts` — adiciona `useEffect` com Realtime subscription
- `src/services/chatService.ts` — função `subscribeToMessages()`, `loadHistory()`

**Teste**:
```bash
# 2 browsers abertos no mesmo chat:
✓ Browser 1 envia mensagem → aparece em Browser 2 em <2s (Realtime)
✓ Browser 2 envia mensagem → aparece em Browser 1 em <2s
✓ Ao abrir chat → últimas 50 mensagens carregam
✓ Scroll para cima → carrega 50 mensagens mais antigas
✓ Ordem sempre cronológica (mais antigas no topo)
✓ Unsubscribe ao fechar página (cleanup)
```

**Bloqueadores**: Fatia 3 (Chat básico)

---

## Checklist de Integração

- [ ] `npm test` passa — todos os testes de chat
- [ ] `npm run lint` — sem erros
- [ ] Schema migrado no Supabase
- [ ] RLS policies ativas e testadas
- [ ] Dashboard `/conversations` funciona
- [ ] Criar conversa funciona
- [ ] Chat `/chat/:conversationId` funciona
- [ ] Enviar mensagem persiste
- [ ] Realtime carrega em <2s (testar 2 browsers)
- [ ] Histórico carrega ao abrir chat
- [ ] Scroll infinito carrega mais antigas
- [ ] Timestamps vêm do servidor
- [ ] Mensagem vazia rejeitada
- [ ] Commit com mensagem: "feat: implementar chat realtime (fatias 1-4)"

## Notas

- Cursor "digitando..." pode ser adicionado como fatia 5 (opcional)
- Busca de conversas/mensagens é fatia futura (spec 005)
- Reações em mensagens são futuro
- Tipagem de conteúdo (imagem, link) é futuro — por enquanto só texto


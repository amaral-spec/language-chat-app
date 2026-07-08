# AGENTS.md — Language Chat App

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **IA**: Claude API (via Supabase Edge Functions)
- **State**: Zustand
- **Testing**: Vitest + React Testing Library

## Convenções

### Idioma
- Código: inglês
- Commits: português (imperativo)
- Documentação de specs: português

### Estrutura de Pastas
```
src/
  ├── types/
  │   └── index.ts
  ├── services/
  │   ├── authService.ts
  │   ├── chatService.ts
  │   └── correctionService.ts
  ├── pages/
  │   ├── SignUp.tsx
  │   ├── Login.tsx
  │   ├── Conversations.tsx
  │   └── ChatRoom.tsx
  ├── components/
  │   ├── Chat.tsx
  │   ├── MessageBubble.tsx
  │   └── CorrectionPanel.tsx
  ├── hooks/
  │   ├── useAuth.ts
  │   ├── useMessages.ts
  │   └── useCorrections.ts
  ├── store/
  │   └── authStore.ts
  ├── __tests__/
  │   ├── authentication.spec.ts
  │   ├── chat-messaging.spec.ts
  │   └── ai-correction.spec.ts
  └── App.tsx

database/
  ├── schema.sql
  └── migrations/
  │   ├── 001_create_users_table.sql
  │   ├── 002_create_conversations_table.sql
  │   └── 003_create_messages_table.sql

specs/
  ├── _TEMPLATE.md
  └── NNN-nome.md
```

### Contrato de Resposta da Claude API

```json
{
  "correction": {
    "original": "string",
    "corrected": "string",
    "explanation": "string (breve)",
    "confidence": 0.0-1.0
  }
}
```

### Segurança em Camadas

1. **Auth**: Supabase JWT
2. **Database**: RLS Policies (Row Level Security)
3. **Types**: TypeScript validation
4. **Input**: Sanitização no serviço
5. **API**: Claude via Edge Function (nunca frontend)

### Workflow antes de integrar

- [ ] `npm test` — todos testes passam
- [ ] `npm run lint` — sem erros
- Commit em português, imperativo
- Git push direto na main

## Regras Específicas do Projeto

### Autenticação
- Email único e validado
- Senha mínima 8 caracteres
- Sessão persiste em localStorage via JWT
- Logout limpa token e localStorage

### Chat
- Mensagens imutáveis (INSERT only, never UPDATE)
- Realtime via Supabase (< 2s para ambos usuários)
- Mensagens têm: `id`, `conversation_id`, `sender_id`, `content`, `created_at`

### Correções
- IA é chamada APENAS via Edge Function
- Resultado salvo em tabela `corrections`
- Correções associadas por `message_id`
- Nunca expor chave da Claude API no frontend

### Database
- Timestamp: `created_at` (NOT NULL), `updated_at` (DEFAULT NOW())
- UUIDs para IDs primárias
- Índices em FKs e campos frequentes
- Sem dados sensíveis em logs

### Code Style
- Nomes em camelCase
- Componentes: PascalCase
- Tipos exportados de `src/types/index.ts`
- Services isolados (lógica fora de componentes)
- Hooks customizados para state/effects

## CI/CD Checklist

Antes de qualquer commit:

```bash
npm test              # Vitest
npm run lint          # ESLint + Prettier
npm run build         # Vite build
```

## Como o Agente Deve Agir

1. Leia AGENTS.md primeiro (contexto global)
2. Leia a spec correspondente (specs/NNN-*.md)
3. Use Plan mode para arquitetar antes de codar
4. Siga as convenções de pasta, nomes e tipos
5. Escreva testes junto com código
6. Ao terminar: rode checklist e confirme que tudo passa

## Versionamento

- Começa em v0.1.0 (MVP)
- Semântico: MAJOR.MINOR.PATCH
- Tag no git a cada release

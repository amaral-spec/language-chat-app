# Papo · Language Chat App

Chat em tempo real para praticar idiomas com um amigo. Você conversa normalmente e a IA corrige seus erros de gramática/ortografia em tempo real, mostrando o texto certo direto na mensagem — além de um dashboard com estatísticas de progresso (acurácia, erros mais frequentes, evolução ao longo do tempo).

## Funcionalidades

- **Autenticação** por email/senha (Supabase Auth)
- **Chat em tempo real** entre dois usuários (Supabase Realtime)
- **Correção automática** de gramática/ortografia via [LanguageTool](https://languagetool.org/), aplicada direto na conversa
- **Seleção de idioma** por conversa — dois amigos podem ter várias conversas entre si, uma por idioma (inglês, português, espanhol, francês, alemão, italiano)
- **Dashboard de analytics**: acurácia geral e por conversa, erros mais frequentes, progresso diário (gráfico dos últimos 30 dias), comparação "você vs. amigo"

Os detalhes de cada funcionalidade estão documentados em [`spec/features/`](spec/features/).

## Stack

- [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vitejs.dev/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [Supabase](https://supabase.com/) (Postgres + Auth + Realtime)
- [Zustand](https://github.com/pmndrs/zustand) (estado de autenticação)
- [React Router v7](https://reactrouter.com/)
- [Recharts](https://recharts.org/) (gráfico de progresso)
- [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/)
- [oxlint](https://oxc.rs/)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20 ou superior
- Uma conta gratuita no [Supabase](https://supabase.com/)

## Como configurar

### 1. Clonar e instalar dependências

```bash
git clone git@github.com:amaral-spec/language-chat-app.git
cd language-chat-app
npm install
```

### 2. Criar um projeto no Supabase

Crie um projeto novo em [supabase.com](https://supabase.com/dashboard). Depois de criado, pegue em **Project Settings → API**:

- **Project URL**
- **anon public key**

### 3. Configurar as variáveis de ambiente

Copie o arquivo de exemplo e preencha com os valores do seu projeto:

```bash
cp .env.example .env
```

```bash
# .env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-anon-key-aqui
```

O `.env` já está no `.gitignore` — nunca commite suas chaves.

### 4. Rodar as migrations do banco

No **SQL Editor** do painel do Supabase, execute os arquivos na ordem abaixo (cole o conteúdo de cada um e rode, um de cada vez):

1. [`database/schema.sql`](database/schema.sql) — tabela de perfil de usuário
2. Todos os arquivos de [`database/migrations/`](database/migrations/), **em ordem numérica** (`002_...` até `013_...`)

Isso cria as tabelas (`conversations`, `messages`, `corrections`), as policies de RLS, as RPCs usadas pelo app e habilita o Realtime nas tabelas necessárias.

> **Dica:** se quiser testar o cadastro de usuários sem precisar confirmar email a cada conta nova, desabilite a confirmação de email em **Authentication → Providers → Email** (só recomendado em desenvolvimento).

### 5. Rodar o projeto

```bash
npm run dev
```

Acesse `http://localhost:5173`, crie uma conta e comece a conversar.

## Scripts disponíveis

| Comando | O que faz |
|---|---|
| `npm run dev` | Sobe o servidor de desenvolvimento (Vite) |
| `npm run build` | Type-check + build de produção |
| `npm run preview` | Serve o build de produção localmente |
| `npm test` | Roda a suíte de testes (Vitest) |
| `npm run lint` | Roda o linter (oxlint) |

## Estrutura do projeto

```
src/
  components/     # Componentes de UI (inclui components/ui/ com o design system)
  pages/          # Páginas/rotas (Login, Conversations, ChatRoom, Dashboard, ...)
  hooks/          # Hooks (auth, mensagens, correções, stats)
  services/       # Chamadas ao Supabase e à LanguageTool API
  store/          # Estado global (Zustand)
  constants/      # Idiomas suportados
  types/          # Tipos TypeScript compartilhados
  __tests__/      # Testes de integração

database/
  schema.sql        # Schema inicial (tabela de usuários)
  migrations/       # Migrations numeradas, rodar em ordem

spec/features/      # Especificações de cada funcionalidade (specs 001-005)
```

## Testando a IA de correção

A correção usa a [API pública do LanguageTool](https://api.languagetool.org/v2/check) diretamente do frontend — não precisa de chave nem de configuração adicional. Se uma mensagem tiver um erro de gramática ou ortografia, a correção aparece automaticamente logo abaixo dela.

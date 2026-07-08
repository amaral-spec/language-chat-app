# specs/001-autenticacao.md

## O que é

Permitir que usuários se registrem e façam login na plataforma usando email/senha via Supabase Auth, garantindo segurança e persistência de sessão.

## Por que

Sem autenticação, não há segurança, privacidade ou identidade nas conversas. É a base para todo o resto do app.

## Casos de Uso

1. **Novo usuário se registra**: Acessa página de Sign Up, digita email e senha válidos, é criado no banco e redirecionado para dashboard
2. **Usuário existente faz login**: Entra credenciais corretas, acessa dashboard, sessão é mantida
3. **Usuário tenta login inválido**: Digita email ou senha errado, recebe erro genérico, permanece na página
4. **Validação de entrada**: Email inválido ou senha fraca são rejeitados ANTES de enviar ao Supabase
5. **Logout**: Usuário clica logout, token é deletado, redirecionado para login
6. **Sessão persiste**: Usuário fecha aba, reabre — continua logado

## Regras de Negócio

- Email deve ser único no sistema
- Email deve passar em validação RFC básica
- Senha mínima 8 caracteres
- Senha não é mostrada em campo de texto (use `type="password"`)
- Erro de login é genérico ("Invalid credentials") por segurança — não diz se email existe
- JWT token é armazenado em localStorage
- Logout limpa localStorage e redireciona para login
- Usuário logado tentando acessar /login ou /signup é redirecionado para /conversations

## Decisões de Design

| Decisão | Opção Escolhida | Alternativa | Por quê |
|---------|-----------------|-------------|--------|
| Provider de Auth | Supabase Auth | Firebase, Auth0 | Integrado com Postgres, realtime nativo |
| Persistência | localStorage + JWT | sessionStorage | JWT persiste entre abas e recargas |
| Validação | Serviço (TS types) | Apenas validação HTML | Type-safety garante dados corretos |
| Msg de erro | Genérica "Invalid credentials" | "Email não existe" | Previne user enumeration attack |
| Password | 8+ caracteres | Regex complexo | Balance entre segurança e UX |

## Fatias Implementáveis

### Fatia 1: Sign Up + Login Components e Types

**O que faz**:
- Cria componentes React para Sign Up e Login
- Define tipos TypeScript para User, Auth Payloads
- Integra com Supabase Auth (sem persistência ainda)

**Artefatos**:
- `src/types/index.ts` — tipos `User`, `SignUpPayload`, `LoginPayload`, `AuthResponse`
- `src/pages/SignUp.tsx` — form de registro
- `src/pages/Login.tsx` — form de login
- `src/services/authService.ts` — funções `signUp()`, `login()`, validações
- `src/__tests__/authentication.spec.ts` — testes

**Teste**:
```bash
npm test authentication.spec.ts

✓ Sign Up com email/senha válidos → usuário criado
✓ Sign Up com email inválido → erro "Invalid email format"
✓ Sign Up com senha curta → erro "Password must be at least 8 characters"
✓ Login com credenciais corretas → sucesso
✓ Login com credenciais erradas → erro "Invalid credentials"
```

**Bloqueadores**: Nenhum (essa é a base)

---

### Fatia 2: Persistência de Sessão + Auth Hook

**O que faz**:
- Cria hook `useAuth` que carrega token de localStorage
- Protege rotas (redirect se não logado)
- Implementa logout
- Sessão persiste ao recarregar página

**Artefatos**:
- `src/hooks/useAuth.ts` — hook customizado
- `src/store/authStore.ts` — Zustand store para estado global
- `src/App.tsx` — route guards com useAuth
- `database/schema.sql` — tabela `users` com RLS policy

**Teste**:
```bash
npm test authentication.spec.ts

✓ Logout limpa localStorage e redireciona para /login
✓ Página recarregada → usuário continua logado (se token válido)
✓ Usuário logado acessa /login → redireciona para /conversations
✓ Usuário não logado acessa /conversations → redireciona para /login
```

**Bloqueadores**: Fatia 1 (Sign Up + Login Components)

---

### Fatia 3: Database Schema + RLS Policies

**O que faz**:
- Cria tabela `users` no Supabase
- Implementa RLS (Row Level Security) para privacidade
- Usuários só veem e atualizam seus próprios dados

**Artefatos**:
- `database/migrations/001_create_users_table.sql`
- RLS policies para SELECT, UPDATE

**Teste**:
```bash
# Manual no Supabase console:
✓ INSERT user em auth.users → insere em users table
✓ SELECT users → vê só a própria linha (RLS)
✓ UPDATE users → só consegue atualizar a própria
✓ DELETE users → não consegue (tabela não suporta delete)
```

**Bloqueadores**: Nenhum (independente)

---

## Checklist de Integração

- [ ] `npm test` passa — todos os testes de autenticação
- [ ] `npm run lint` — sem erros no código
- [ ] `npm run build` — build sem warnings
- [ ] Schema migrado no Supabase (via SQL console ou via code)
- [ ] RLS policies ativas e testadas
- [ ] Sign Up → Login → Logout → redirect correto
- [ ] Recarregar página → sessão mantida
- [ ] localStorage limpo em logout
- [ ] Erro de login é genérico (segurança)
- [ ] Commit com mensagem: "feat: implementar autenticação (fatias 1, 2, 3)"

## Notas

- Se Supabase tiver email confirmation, isso pode ir numa fatia 4 posterior
- Senha reset não está nesta spec (é uma fatia 4)
- 2FA também não está (será outra spec depois)
- ABNT NBR 6023: não aplicável aqui (regras de segurança valem mais)

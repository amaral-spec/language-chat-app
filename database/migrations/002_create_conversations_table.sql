-- Tabela de conversas: uma conversa liga exatamente 2 usuários (não é grupo)

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user1_id uuid not null references auth.users (id),
  user2_id uuid not null references auth.users (id),
  created_at timestamptz not null default now(),
  constraint conversations_distinct_users check (user1_id <> user2_id)
);

-- Impede duas conversas entre o mesmo par de usuários, independente da ordem
-- em que user1_id/user2_id foram informados (par não-ordenado)
create unique index if not exists conversations_unique_pair_idx
  on public.conversations (least(user1_id, user2_id), greatest(user1_id, user2_id));

alter table public.conversations enable row level security;

-- Usuário só vê conversas das quais participa
create policy "Users can view their own conversations"
  on public.conversations
  for select
  using (auth.uid() = user1_id or auth.uid() = user2_id);

-- Usuário só pode criar conversas das quais ele mesmo participa
create policy "Users can create conversations they participate in"
  on public.conversations
  for insert
  with check (auth.uid() = user1_id or auth.uid() = user2_id);

-- Sem policies de update/delete: conversas são imutáveis após criadas

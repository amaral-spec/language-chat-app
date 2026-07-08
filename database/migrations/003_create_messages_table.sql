-- Tabela de mensagens: sempre associadas a uma conversation, imutáveis após criadas

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id),
  sender_id uuid not null references auth.users (id),
  content text not null,
  created_at timestamptz not null default now(),
  constraint messages_content_not_blank check (char_length(trim(content)) > 0),
  constraint messages_content_max_length check (char_length(content) <= 5000)
);

-- Acelera a busca de histórico de uma conversa em ordem cronológica
create index if not exists messages_conversation_id_created_at_idx
  on public.messages (conversation_id, created_at);

alter table public.messages enable row level security;

-- Só participantes da conversa podem ver as mensagens
create policy "Participants can view messages in their conversations"
  on public.messages
  for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.user1_id or auth.uid() = c.user2_id)
    )
  );

-- Só participantes da conversa podem inserir mensagens nela
create policy "Participants can send messages in their conversations"
  on public.messages
  for insert
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = messages.conversation_id
        and (auth.uid() = c.user1_id or auth.uid() = c.user2_id)
    )
  );

-- Sem policies de update/delete: mensagens são imutáveis (nunca editadas/deletadas)

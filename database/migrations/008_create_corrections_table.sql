-- Tabela de correções: uma mensagem tem no máximo UMA correção (a melhor),
-- daí o unique em message_id. conversation_id é denormalizado a partir de
-- messages.conversation_id para permitir filtro direto no Realtime
-- (postgres_changes só filtra por coluna da própria tabela, não por join).
--
-- Diferente da spec anterior (Claude API via Edge Function): agora quem
-- chama a LanguageTool API e grava a correção é o PRÓPRIO FRONTEND (API
-- pública, sem auth, sem chave a proteger — ver Decisões de Design da
-- spec), por isso authenticated precisa de policy de INSERT aqui.

create table if not exists public.corrections (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null unique references public.messages (id),
  conversation_id uuid not null references public.conversations (id),
  original_text text not null,
  corrected_text text not null,
  explanation text not null,
  confidence numeric(3, 2) not null check (confidence >= 0 and confidence <= 1),
  accepted_by_user boolean not null default false,
  created_at timestamptz not null default now(),
  constraint corrections_explanation_max_length check (char_length(explanation) <= 200)
);

-- Acelera a busca de todas as correções de uma conversa (carregamento inicial)
create index if not exists corrections_conversation_id_idx on public.corrections (conversation_id);

alter table public.corrections enable row level security;

-- Só participantes da conversa podem ver as correções
create policy "Participants can view corrections in their conversations"
  on public.corrections
  for select
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = corrections.conversation_id
        and (auth.uid() = c.user1_id or auth.uid() = c.user2_id)
    )
  );

-- Participantes podem gravar a correção de uma mensagem da própria
-- conversa — e só se message_id realmente pertencer a conversation_id
-- (evita gravar uma correção "solta", associada à conversa errada).
create policy "Participants can insert corrections in their conversations"
  on public.corrections
  for insert
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = corrections.conversation_id
        and (auth.uid() = c.user1_id or auth.uid() = c.user2_id)
    )
    and exists (
      select 1
      from public.messages m
      where m.id = corrections.message_id
        and m.conversation_id = corrections.conversation_id
    )
  );

-- Participantes podem marcar a correção como aceita (métrica) — mas só essa
-- coluna: texto original/corrigido, explicação e confidence nunca são
-- editáveis depois de criados.
create policy "Participants can mark corrections as accepted"
  on public.corrections
  for update
  using (
    exists (
      select 1
      from public.conversations c
      where c.id = corrections.conversation_id
        and (auth.uid() = c.user1_id or auth.uid() = c.user2_id)
    )
  )
  with check (
    exists (
      select 1
      from public.conversations c
      where c.id = corrections.conversation_id
        and (auth.uid() = c.user1_id or auth.uid() = c.user2_id)
    )
  );

revoke update on public.corrections from authenticated;
grant update (accepted_by_user) on public.corrections to authenticated;

-- Sem policy de delete: correções são imutáveis após criadas (só accepted_by_user muda)
revoke delete on public.corrections from authenticated, anon;

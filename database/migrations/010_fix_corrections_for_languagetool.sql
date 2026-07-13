-- A migration 008 usa "create table if not exists"/"create policy", que
-- não fazem nada quando o objeto já existe — e este projeto já tinha uma
-- tabela `corrections` criada pela versão anterior da spec (Claude API +
-- Edge Function), sem a coluna `original_text` e sem policy/grant de
-- INSERT para `authenticated` (só a Edge Function, via service role,
-- gravava correções). Esta migration atualiza o que já existe para o
-- novo formato: LanguageTool é chamado direto do frontend, então o
-- próprio usuário autenticado precisa poder inserir a correção.

alter table public.corrections add column if not exists original_text text not null default '';
alter table public.corrections alter column original_text drop default;

drop policy if exists "Participants can insert corrections in their conversations" on public.corrections;
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

grant insert on public.corrections to authenticated;

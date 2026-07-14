-- Spec 005 (error analytics) precisa saber, por correção: qual o tipo de
-- erro (para agrupar "erros mais frequentes"), sua categoria ampla
-- (grammar/spelling, para filtros) e quem enviou a mensagem original (para
-- a comparação "Você: N erros | Amigo: M erros" sem precisar de um join em
-- `messages` — mesmo raciocínio de denormalização de `conversation_id` já
-- usado na migration 008).
--
-- error_type grava o `rule.id` retornado pela LanguageTool (ex:
-- "MORFOLOGIK_RULE_EN_US") — específico o bastante para agrupar erros
-- recorrentes do mesmo tipo. error_category é a versão ampla (grammar ou
-- spelling), derivada do `rule.issueType` (ver RELEVANT_ISSUE_TYPES em
-- correctionService.ts: só 'grammar' e 'misspelling' chegam a virar uma
-- correção).
--
-- Linhas já existentes não têm essa informação (foram gravadas antes desta
-- migration); usamos 'UNKNOWN'/'grammar' como valor de backfill e
-- `sender_id` é preenchido via join com `messages`.

alter table public.corrections add column if not exists error_type text not null default 'UNKNOWN';
alter table public.corrections alter column error_type drop default;

alter table public.corrections add column if not exists error_category text not null default 'grammar'
  check (error_category in ('grammar', 'spelling'));
alter table public.corrections alter column error_category drop default;

alter table public.corrections add column if not exists sender_id uuid references auth.users (id);

update public.corrections c
set sender_id = m.sender_id
from public.messages m
where m.id = c.message_id
  and c.sender_id is null;

alter table public.corrections alter column sender_id set not null;

-- Acelera "todas as correções de um usuário" (dashboard pessoal, spec 005
-- Fatia 3) e é o filtro usado pelo Realtime da página de stats pessoal
-- (postgres_changes só filtra por coluna própria da tabela).
create index if not exists corrections_sender_id_idx on public.corrections (sender_id);

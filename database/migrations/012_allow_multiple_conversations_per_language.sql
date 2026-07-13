-- A migration 002 impedia duas conversas entre o mesmo par de usuários,
-- período — mas agora cada conversa tem um idioma fixo (spec 004), e dois
-- amigos devem poder praticar mais de um idioma juntos (uma conversa por
-- idioma). Troca o índice único de "um por par" para "um por par + idioma".

drop index if exists conversations_unique_pair_idx;

create unique index if not exists conversations_unique_pair_language_idx
  on public.conversations (least(user1_id, user2_id), greatest(user1_id, user2_id), learning_language);

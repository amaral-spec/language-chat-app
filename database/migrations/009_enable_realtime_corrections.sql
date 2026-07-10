-- Habilita Realtime (postgres_changes) na tabela corrections, para que
-- INSERT (nova correção) e UPDATE (accepted_by_user) cheguem aos clients
-- assinados — mesmo padrão usado para messages (ver migration 007).

alter publication supabase_realtime add table public.corrections;

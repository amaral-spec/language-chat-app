-- Habilita Supabase Realtime (postgres_changes) para a tabela messages.
-- Sem isso, subscribeToMessages (chatService.ts) nunca recebe eventos de
-- INSERT — a publication supabase_realtime precisa incluir a tabela
-- explicitamente.

alter publication supabase_realtime add table public.messages;

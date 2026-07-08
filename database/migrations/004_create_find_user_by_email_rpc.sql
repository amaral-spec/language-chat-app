-- Function para lookup pontual de usuário por email (usada no modal de "selecionar amigo").
-- Não existe listagem pública de usuários por design; SECURITY DEFINER permite consultar
-- auth.users apenas para o caso de uso de busca exata por email, sem expor a tabela toda.

create or replace function public.find_user_by_email(lookup_email text)
returns table(id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select id, email from auth.users where email = lookup_email;
$$;

grant execute on function public.find_user_by_email(text) to authenticated;

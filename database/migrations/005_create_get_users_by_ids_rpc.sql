-- Function para resolver o email de participantes de conversas a partir do id.
-- Não existe tabela pública de usuários navegável por id (public.users só permite
-- SELECT da própria linha via RLS), então usamos o mesmo padrão de 004
-- (find_user_by_email): SECURITY DEFINER lendo auth.users, restrito a um lookup
-- pontual (por lista de ids), sem expor a tabela inteira.

create or replace function public.get_users_by_ids(user_ids uuid[])
returns table(id uuid, email text)
language sql
security definer
set search_path = public
as $$
  select id, email from auth.users where id = any(user_ids);
$$;

grant execute on function public.get_users_by_ids(uuid[]) to authenticated;

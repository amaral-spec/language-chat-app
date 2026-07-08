-- As functions find_user_by_email, get_users_by_ids e handle_new_user são
-- SECURITY DEFINER; o Postgres concede EXECUTE a PUBLIC por padrão na
-- criação, e as migrations anteriores (004, 005) só adicionaram
-- `grant ... to authenticated` sem revogar o acesso público. Resultado:
-- qualquer usuário não autenticado conseguia chamar find_user_by_email via
-- RPC e descobrir se um email está cadastrado (user enumeration), o que
-- contradiz a regra de negócio da spec de autenticação.

revoke execute on function public.find_user_by_email(text) from public;
revoke execute on function public.find_user_by_email(text) from anon;
grant execute on function public.find_user_by_email(text) to authenticated;

revoke execute on function public.get_users_by_ids(uuid[]) from public;
revoke execute on function public.get_users_by_ids(uuid[]) from anon;
grant execute on function public.get_users_by_ids(uuid[]) to authenticated;

-- handle_new_user só deve ser invocada pelo trigger on_auth_user_created;
-- não deve ser chamável via RPC por nenhum role.
revoke execute on function public.handle_new_user() from public;
revoke execute on function public.handle_new_user() from anon;
revoke execute on function public.handle_new_user() from authenticated;

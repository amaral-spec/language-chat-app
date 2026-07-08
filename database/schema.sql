-- Tabela de perfil público, espelhando auth.users (Supabase Auth)

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can view their own row"
  on public.users
  for select
  using (auth.uid() = id);

create policy "Users can update their own row"
  on public.users
  for update
  using (auth.uid() = id);

-- Popula a tabela automaticamente quando um novo usuário se registra via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

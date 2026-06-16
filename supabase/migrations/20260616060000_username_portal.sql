-- ============================================================================
-- JM CONTROL CENTER — ETAPA 4: username personalizado del cliente
-- Permite que el cliente entre al portal con un usuario tipo "maria.perez"
-- (además del correo). Único, insensible a mayúsculas.
-- ============================================================================
alter table public.users_profiles
  add column if not exists username text;

-- Único (case-insensitive) solo cuando hay username.
create unique index if not exists idx_users_profiles_username
  on public.users_profiles (lower(username))
  where username is not null;
-- FIN

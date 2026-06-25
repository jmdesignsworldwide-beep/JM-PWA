-- ============================================================================
-- JM CONTROL CENTER — Mis pendientes (lista personal del owner)
-- Lista rápida y privada de cada usuario (separada de Equipo/Tareas). RLS por
-- usuario: cada quien solo ve y edita los suyos. Migración aditiva.
-- ============================================================================

create table if not exists public.personal_todos (
  id          uuid primary key default gen_random_uuid(),
  texto       text not null,
  hecho       boolean not null default false,
  created_by  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.personal_todos enable row level security;

-- Cada usuario solo accede a SUS pendientes (privado total).
drop policy if exists own_personal_todos on public.personal_todos;
create policy own_personal_todos on public.personal_todos for all to authenticated
  using (created_by = auth.uid()) with check (created_by = auth.uid());

grant all on public.personal_todos to authenticated;

-- updated_at automático (función ya existente en el esquema).
drop trigger if exists trg_touch_personal_todos on public.personal_todos;
create trigger trg_touch_personal_todos before update on public.personal_todos
  for each row execute function public.fn_touch_updated_at();

create index if not exists personal_todos_owner_idx on public.personal_todos (created_by, hecho, created_at desc);

-- FIN

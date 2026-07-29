-- ============================================================================
-- JM CONTROL CENTER — Mis Proyectos (Incubadora) · PR 1: base
-- ----------------------------------------------------------------------------
-- Negocios/proyectos PROPIOS del owner (distintos de las marcas y de la tabla
-- `projects`, que es de proyectos de cliente). Módulo privado: owner-only,
-- RLS + FORCE, auditado. Multimedia va al bucket privado `ventures`.
-- ============================================================================

create table if not exists public.ventures (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  registrado  boolean not null default false,
  logo_path   text,
  descripcion text,
  correo      text,
  tipo        text check (tipo in ('online', 'fisico')),
  perfil_json jsonb not null default '{}'::jsonb,   -- encuesta flexible (online/físico)
  created_by  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.ventures enable row level security;
alter table public.ventures force row level security;
drop policy if exists owner_ventures on public.ventures;
create policy owner_ventures on public.ventures for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.ventures to authenticated;

drop trigger if exists trg_touch_ventures on public.ventures;
create trigger trg_touch_ventures before update on public.ventures
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_ventures on public.ventures;
create trigger trg_audit_ventures after insert or update or delete on public.ventures
  for each row execute function public.fn_audit();

create index if not exists ventures_owner_idx on public.ventures (created_by, created_at desc);

-- ---- Pendientes: vincular opcionalmente a un proyecto ----
-- venture_id null  = pendiente Personal (como hoy).
-- venture_id set   = pendiente de ese proyecto.
-- origen 'auto'    = generado por el sistema (logo, redes…); 'manual' = a mano.
-- auto_key         = clave para no duplicar el auto-pendiente (único por proyecto).
alter table public.personal_todos
  add column if not exists venture_id uuid references public.ventures(id) on delete cascade,
  add column if not exists origen     text not null default 'manual',
  add column if not exists auto_key   text;

create index if not exists personal_todos_venture_idx
  on public.personal_todos (venture_id) where venture_id is not null;
create unique index if not exists personal_todos_auto_uq
  on public.personal_todos (venture_id, auto_key) where auto_key is not null;

-- ---- Storage: bucket privado para logos, referencias, contratos y PDFs ----
insert into storage.buckets (id, name, public)
values ('ventures', 'ventures', false)
on conflict (id) do nothing;

drop policy if exists "owner_ventures_storage" on storage.objects;
create policy "owner_ventures_storage" on storage.objects for all to authenticated
  using (bucket_id = 'ventures' and public.is_owner())
  with check (bucket_id = 'ventures' and public.is_owner());
-- FIN

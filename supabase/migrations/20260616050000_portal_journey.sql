-- ============================================================================
-- JM CONTROL CENTER — ETAPA 2: Portal de cliente "WOW"
-- Journey visual (hitos ordenados y completables) + feed de actualizaciones.
-- ============================================================================

-- 1) Los hitos se vuelven una línea de tiempo ordenada y celebrable ----------
alter table public.project_milestones
  add column if not exists completado     boolean not null default false,
  add column if not exists completado_en  timestamptz,
  add column if not exists orden          integer not null default 0,
  add column if not exists descripcion    text,
  add column if not exists icono          text;

-- 2) Feed "en qué estamos trabajando ahora" ---------------------------------
create table if not exists public.project_updates (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade,
  client_id       uuid not null references public.clients(id) on delete cascade,
  titulo          text not null,
  contenido       text,
  visible_cliente boolean not null default true,
  created_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_project_updates_client
  on public.project_updates(client_id, created_at desc);

-- Triggers de la casa (updated_at + auditoría inmutable) ---------------------
drop trigger if exists trg_touch_project_updates on public.project_updates;
create trigger trg_touch_project_updates before update on public.project_updates
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_project_updates on public.project_updates;
create trigger trg_audit_project_updates after insert or update or delete on public.project_updates
  for each row execute function public.fn_audit();

-- 3) RLS --------------------------------------------------------------------
alter table public.project_updates enable row level security;
grant all on public.project_updates to authenticated;

-- staff (owner/colaborador): acceso total
drop policy if exists "staff_all_project_updates" on public.project_updates;
create policy "staff_all_project_updates" on public.project_updates
  for all using (public.is_staff()) with check (public.is_staff());

-- cliente: lee SOLO sus actualizaciones visibles (aislamiento intacto)
drop policy if exists "client_read_project_updates" on public.project_updates;
create policy "client_read_project_updates" on public.project_updates
  for select using (visible_cliente = true and client_id = public.my_client_id());

-- FIN

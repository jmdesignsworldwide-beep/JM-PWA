-- ============================================================================
-- JM CONTROL CENTER — Mis Proyectos · PR 3: socios, contratos, legalización, PDFs
-- Socios con % de participación y su contrato PDF; documentos del proyecto
-- (contratos, legalización, planes, cotizaciones). Todo a Storage (bucket
-- `ventures`, ya existente). Owner-only, RLS + FORCE, auditado. Money/% NUMERIC.
-- ============================================================================

-- Marca de legalizado en el proyecto (el PDF va en venture_docs).
alter table public.ventures
  add column if not exists legalizado boolean not null default false;

-- ---- Socios ----
create table if not exists public.venture_socios (
  id            uuid primary key default gen_random_uuid(),
  venture_id    uuid not null references public.ventures(id) on delete cascade,
  nombre        text not null,
  porcentaje    numeric(5,2) not null default 0,   -- % de participación
  contrato_path text,                              -- PDF del contrato (Storage)
  notas         text,
  created_by    uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
alter table public.venture_socios enable row level security;
alter table public.venture_socios force row level security;
drop policy if exists owner_venture_socios on public.venture_socios;
create policy owner_venture_socios on public.venture_socios for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.venture_socios to authenticated;
drop trigger if exists trg_touch_venture_socios on public.venture_socios;
create trigger trg_touch_venture_socios before update on public.venture_socios
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_venture_socios on public.venture_socios;
create trigger trg_audit_venture_socios after insert or update or delete on public.venture_socios
  for each row execute function public.fn_audit();
create index if not exists venture_socios_venture_idx on public.venture_socios (venture_id);

-- ---- Documentos (PDFs) ----
create table if not exists public.venture_docs (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  tipo        text not null check (tipo in ('contrato', 'legalizacion', 'plan', 'cotizacion', 'otro')),
  nombre      text,
  file_path   text not null,                        -- PDF (Storage)
  created_by  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.venture_docs enable row level security;
alter table public.venture_docs force row level security;
drop policy if exists owner_venture_docs on public.venture_docs;
create policy owner_venture_docs on public.venture_docs for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.venture_docs to authenticated;
drop trigger if exists trg_touch_venture_docs on public.venture_docs;
create trigger trg_touch_venture_docs before update on public.venture_docs
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_venture_docs on public.venture_docs;
create trigger trg_audit_venture_docs after insert or update or delete on public.venture_docs
  for each row execute function public.fn_audit();
create index if not exists venture_docs_venture_idx on public.venture_docs (venture_id, tipo);
-- FIN

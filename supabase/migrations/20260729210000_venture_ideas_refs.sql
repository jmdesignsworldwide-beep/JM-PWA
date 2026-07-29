-- ============================================================================
-- JM CONTROL CENTER — Mis Proyectos · PR 4: ideas + referencias visuales
-- Ideas detalladas (plantilla por tipo + campos propios libres, editable
-- siempre) y moodboard de referencias (imágenes a Storage + nota). Owner-only,
-- RLS + FORCE, auditado. Imágenes al bucket privado `ventures` (ya existente).
-- ============================================================================

create table if not exists public.venture_ideas (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  titulo      text not null,
  tipo        text,                                -- app / local / servicio / tienda / otro
  campos_json jsonb not null default '[]'::jsonb,  -- [{label, valor}] plantilla + libres
  created_by  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.venture_ideas enable row level security;
alter table public.venture_ideas force row level security;
drop policy if exists owner_venture_ideas on public.venture_ideas;
create policy owner_venture_ideas on public.venture_ideas for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.venture_ideas to authenticated;
drop trigger if exists trg_touch_venture_ideas on public.venture_ideas;
create trigger trg_touch_venture_ideas before update on public.venture_ideas
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_venture_ideas on public.venture_ideas;
create trigger trg_audit_venture_ideas after insert or update or delete on public.venture_ideas
  for each row execute function public.fn_audit();
create index if not exists venture_ideas_venture_idx on public.venture_ideas (venture_id);

create table if not exists public.venture_referencias (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  image_path  text not null,                       -- imagen (Storage bucket `ventures`)
  nota        text,
  created_by  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.venture_referencias enable row level security;
alter table public.venture_referencias force row level security;
drop policy if exists owner_venture_referencias on public.venture_referencias;
create policy owner_venture_referencias on public.venture_referencias for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.venture_referencias to authenticated;
drop trigger if exists trg_touch_venture_referencias on public.venture_referencias;
create trigger trg_touch_venture_referencias before update on public.venture_referencias
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_venture_referencias on public.venture_referencias;
create trigger trg_audit_venture_referencias after insert or update or delete on public.venture_referencias
  for each row execute function public.fn_audit();
create index if not exists venture_referencias_venture_idx on public.venture_referencias (venture_id);
-- FIN

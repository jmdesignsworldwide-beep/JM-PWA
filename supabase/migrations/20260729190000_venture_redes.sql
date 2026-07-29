-- ============================================================================
-- JM CONTROL CENTER — Mis Proyectos · PR 2: redes sociales del proyecto
-- Redes por proyecto (IG/FB/TikTok/WhatsApp/Web). Las que faltan (hecha=false)
-- generan un auto-pendiente "Crear [red] de [proyecto]". La encuesta online/
-- físico NO lleva tabla: usa `tipo` + `perfil_json` que ya existen en ventures.
-- Owner-only, RLS + FORCE, auditada.
-- ============================================================================

create table if not exists public.venture_redes (
  id          uuid primary key default gen_random_uuid(),
  venture_id  uuid not null references public.ventures(id) on delete cascade,
  tipo        text not null check (tipo in ('instagram', 'facebook', 'tiktok', 'whatsapp', 'web')),
  hecha       boolean not null default false,
  url         text,                              -- link o usuario
  created_by  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.venture_redes enable row level security;
alter table public.venture_redes force row level security;
drop policy if exists owner_venture_redes on public.venture_redes;
create policy owner_venture_redes on public.venture_redes for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.venture_redes to authenticated;

drop trigger if exists trg_touch_venture_redes on public.venture_redes;
create trigger trg_touch_venture_redes before update on public.venture_redes
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_venture_redes on public.venture_redes;
create trigger trg_audit_venture_redes after insert or update or delete on public.venture_redes
  for each row execute function public.fn_audit();

create index if not exists venture_redes_venture_idx on public.venture_redes (venture_id);
-- FIN

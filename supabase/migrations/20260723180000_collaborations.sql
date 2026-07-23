-- ============================================================================
-- JM CONTROL CENTER — Colaboraciones de influencers (Bloque 6)
-- Separa el REGISTRO del influencer (quién es) de sus COLABORACIONES (los
-- tratos). Un influencer puede tener varias colaboraciones en el tiempo.
--
-- 100% aditivo y reversible:
--  - CREATE TABLE collaborations (+ RLS staff + triggers touch/audit).
--  - INSERT: por cada influencer existente se crea SU colaboración #1 con el
--    trato actual (doy_tipo/doy_desc/promos/brand_id/notas) y el estado mapeado.
--  - NO se borra ni actualiza ninguna columna de influencers: doy_*, promos y
--    estado_trato quedan intactos como respaldo. Cero pérdida de datos.
-- ============================================================================

create table if not exists public.collaborations (
  id            uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencers(id) on delete cascade,
  brand_id      uuid references public.brands(id) on delete set null,
  estado        text not null default 'acordado' check (estado in ('acordado','activo','completado')),
  doy_tipo      text,
  doy_desc      text,
  promos        jsonb not null default '[]'::jsonb,
  notas         text,
  created_by    uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.collaborations enable row level security;

drop policy if exists staff_collaborations on public.collaborations;
create policy staff_collaborations on public.collaborations for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant all on public.collaborations to authenticated;

create index if not exists collaborations_influencer_idx on public.collaborations (influencer_id, created_at desc);

drop trigger if exists trg_touch_collaborations on public.collaborations;
create trigger trg_touch_collaborations before update on public.collaborations
  for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_audit_collaborations on public.collaborations;
create trigger trg_audit_collaborations after insert or update or delete on public.collaborations
  for each row execute function public.fn_audit();

-- Copia el trato actual de cada influencer a su colaboración #1 (idempotente:
-- solo si el influencer aún no tiene colaboraciones). El estado_trato viejo se
-- mapea al set nuevo (propuesto/no_concreto -> acordado).
insert into public.collaborations (influencer_id, brand_id, estado, doy_tipo, doy_desc, promos, notas, created_by, created_at)
select
  i.id,
  i.brand_id,
  case i.estado_trato
    when 'activo' then 'activo'
    when 'completado' then 'completado'
    else 'acordado'
  end,
  i.doy_tipo,
  i.doy_desc,
  coalesce(i.promos, '[]'::jsonb),
  i.notas,
  i.created_by,
  i.created_at
from public.influencers i
where not exists (select 1 from public.collaborations c where c.influencer_id = i.id);

-- FIN

-- ============================================================================
-- JM CONTROL CENTER — Deudas C2: deudas manuales ("¿A quién le debo?")
-- Deudas que el owner registra a mano hacia una persona (cliente/prospecto o
-- contacto Personal). Las deudas AUTO del equipo (por tareas) siguen aparte.
-- Owner-only, RLS + FORCE, auditado. Money en NUMERIC.
-- ============================================================================

create table if not exists public.debts (
  id          uuid primary key default gen_random_uuid(),
  client_id   uuid not null references public.clients(id) on delete cascade,  -- a quién le debo
  monto       numeric(14,2) not null default 0,
  moneda      text not null default 'DOP' check (moneda in ('DOP', 'USD')),
  fecha       date not null default current_date,   -- desde cuándo
  concepto    text,
  nota        text,
  saldado     boolean not null default false,
  created_by  uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.debts enable row level security;
alter table public.debts force row level security;
drop policy if exists owner_debts on public.debts;
create policy owner_debts on public.debts for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.debts to authenticated;

drop trigger if exists trg_touch_debts on public.debts;
create trigger trg_touch_debts before update on public.debts
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_debts on public.debts;
create trigger trg_audit_debts after insert or update or delete on public.debts
  for each row execute function public.fn_audit();

create index if not exists debts_client_idx on public.debts (client_id);
-- FIN

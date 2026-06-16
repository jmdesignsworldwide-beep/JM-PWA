-- ============================================================================
-- JM CONTROL CENTER — 20260616010000_equipo_tareas.sql  (Fase 9.5)
-- Equipo / Tareas con pago por tarea. Tablas: team_members, tasks, team_payments.
-- Dinero en NUMERIC(14,2). Auditoría + updated_at + RLS (solo staff). Idempotente.
-- Los pagos al equipo NO afectan el profit por proyecto (rubro separado).
-- ============================================================================

create table if not exists public.team_members (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  telefono         text,
  whatsapp         text,
  rol_especialidad text,
  notas            text,
  activo           boolean not null default true,
  brand_id         uuid references public.brands(id) on delete set null,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.tasks (
  id             uuid primary key default gen_random_uuid(),
  descripcion    text not null,
  team_member_id uuid references public.team_members(id) on delete set null,
  project_id     uuid references public.projects(id) on delete set null,
  order_id       uuid references public.orders(id) on delete set null,
  monto          numeric(14,2) not null default 0,
  moneda         text not null default 'DOP' check (moneda in ('DOP','USD')),
  fecha_limite   date,
  estado         text not null default 'pendiente'
                 check (estado in ('pendiente','en_progreso','hecha')),
  brand_id       uuid references public.brands(id) on delete set null,
  created_by     uuid references auth.users(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.team_payments (
  id             uuid primary key default gen_random_uuid(),
  team_member_id uuid not null references public.team_members(id) on delete cascade,
  task_id        uuid references public.tasks(id) on delete set null,
  monto          numeric(14,2) not null default 0,
  moneda         text not null default 'DOP' check (moneda in ('DOP','USD')),
  fecha          date not null default current_date,
  metodo         text,
  nota           text,
  brand_id       uuid references public.brands(id) on delete set null,
  created_by     uuid references auth.users(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- updated_at + auditoría inmutable en las 3 tablas
do $$
declare t text;
begin
  foreach t in array array['team_members','tasks','team_payments'] loop
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s;', t);
    execute format('create trigger trg_touch_%1$s before update on public.%1$s for each row execute function public.fn_touch_updated_at();', t);
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s;', t);
    execute format('create trigger trg_audit_%1$s after insert or update or delete on public.%1$s for each row execute function public.fn_audit();', t);
  end loop;
end $$;

-- RLS: SOLO staff (owner/colaborador). Clientes NO ven nada del equipo.
do $$
declare t text;
begin
  foreach t in array array['team_members','tasks','team_payments'] loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists staff_all_%1$s on public.%1$s;', t);
    execute format('create policy staff_all_%1$s on public.%1$s for all to authenticated using (public.is_staff()) with check (public.is_staff());', t);
  end loop;
end $$;

grant all on public.team_members, public.tasks, public.team_payments to authenticated;

-- FIN 20260616010000_equipo_tareas.sql

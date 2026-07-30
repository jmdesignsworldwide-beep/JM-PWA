-- ============================================================================
-- JM CONTROL CENTER — Deudas C3: pagar una deuda → GASTO en Finanzas
-- Cada abono a una deuda (debt_payments) se refleja AUTOMÁTICAMENTE como gasto
-- en `expenses`, ligado a la fecha/monto/comprobante. SIN doble conteo:
--   · 1 expense por cada debt_payment (índice único sobre debt_payment_id).
--   · El gasto vive y muere con el pago (FK on delete cascade).
--   · Si cambia el pago (monto/fecha/moneda/comprobante), el gasto se sincroniza.
-- Espejo de fn_payment_to_income (pago de cliente → ingreso). Fuente única.
-- Owner-only, RLS + FORCE, auditado. Money en NUMERIC.
-- ============================================================================

-- 1) Abonos a deudas.
create table if not exists public.debt_payments (
  id              uuid primary key default gen_random_uuid(),
  debt_id         uuid not null references public.debts(id) on delete cascade,
  monto           numeric(14,2) not null default 0,
  moneda          text not null default 'DOP' check (moneda in ('DOP', 'USD')),
  fecha           date not null default current_date,
  metodo          text,
  nota            text,
  comprobante_url text,
  created_by      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.debt_payments enable row level security;
alter table public.debt_payments force row level security;
drop policy if exists owner_debt_payments on public.debt_payments;
create policy owner_debt_payments on public.debt_payments for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.debt_payments to authenticated;

drop trigger if exists trg_touch_debt_payments on public.debt_payments;
create trigger trg_touch_debt_payments before update on public.debt_payments
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_debt_payments on public.debt_payments;
create trigger trg_audit_debt_payments after insert or update or delete on public.debt_payments
  for each row execute function public.fn_audit();

create index if not exists debt_payments_debt_idx on public.debt_payments (debt_id);

-- 2) Enlace expense ↔ abono de deuda. on delete cascade => borrar el pago borra el gasto.
alter table public.expenses
  add column if not exists debt_payment_id uuid
  references public.debt_payments(id) on delete cascade;

-- Garantía dura contra duplicados: un abono no puede tener dos gastos.
create unique index if not exists expenses_debt_payment_uidx
  on public.expenses (debt_payment_id)
  where debt_payment_id is not null;

-- 3) Sincronizador abono → gasto (insert/update).
create or replace function public.fn_debt_payment_to_expense()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_nombre     text;
  v_personal   boolean := false;
  v_desc       text;
begin
  -- Persona de la deuda (a quién le pagamos) para describir el gasto.
  select trim(c.nombre || ' ' || coalesce(c.apellido, '')), coalesce(c.es_personal, false)
    into v_nombre, v_personal
  from public.debts d
  join public.clients c on c.id = d.client_id
  where d.id = new.debt_id;

  v_desc := 'Pago de deuda'
            || coalesce(' a ' || nullif(v_nombre, ''), '')
            || coalesce(' · ' || nullif(new.metodo, ''), '')
            || coalesce(' · ' || nullif(new.nota, ''), '');

  if tg_op = 'INSERT' then
    insert into public.expenses
      (debt_payment_id, monto, moneda, fecha, categoria, descripcion,
       factura_url, es_personal, created_by)
    values
      (new.id, new.monto, new.moneda, new.fecha, 'Pago de deuda', v_desc,
       new.comprobante_url, v_personal, new.created_by);
  else
    update public.expenses set
      monto = new.monto, moneda = new.moneda, fecha = new.fecha,
      descripcion = v_desc, factura_url = new.comprobante_url, es_personal = v_personal
    where debt_payment_id = new.id;
  end if;

  return new;
end; $$;

drop trigger if exists trg_debt_payment_to_expense on public.debt_payments;
create trigger trg_debt_payment_to_expense
  after insert or update on public.debt_payments
  for each row execute function public.fn_debt_payment_to_expense();

-- Solo trigger: nadie la llama como RPC (SECURITY DEFINER cerrado).
revoke execute on function public.fn_debt_payment_to_expense() from public, anon, authenticated;

-- FIN

-- ============================================================================
-- JM CONTROL CENTER — Pagos de cliente → Ingreso en Finanzas (fuente única)
-- Cada pago/abono (order_payments) se refleja AUTOMÁTICAMENTE como ingreso en
-- `incomes`, ligado al cliente/proyecto y con su fecha. SIN doble conteo:
--   · 1 income por cada order_payment (índice único sobre order_payment_id).
--   · El income vive y muere con el pago (FK on delete cascade).
--   · Si cambia el pago (monto/fecha/moneda), el income se sincroniza solo.
-- La fuente del ingreso de clientes es el PAGO; Finanzas no lo re-teclea.
-- ============================================================================

-- 1) Enlace income ↔ pago. on delete cascade => borrar el pago borra el ingreso.
alter table public.incomes
  add column if not exists order_payment_id uuid
  references public.order_payments(id) on delete cascade;

-- Garantía dura contra duplicados: un pago no puede tener dos ingresos.
create unique index if not exists incomes_order_payment_uidx
  on public.incomes (order_payment_id)
  where order_payment_id is not null;

-- 2) Sincronizador pago → ingreso (insert/update).
create or replace function public.fn_payment_to_income()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_project_id uuid;
  v_brand_id   uuid;
  v_desc       text;
begin
  -- Proyecto y marca del pedido (si existen) para enlazar el ingreso.
  select p.id into v_project_id from public.projects p where p.order_id = new.order_id limit 1;
  select o.brand_id into v_brand_id from public.orders o where o.id = new.order_id;

  v_desc := case new.tipo
              when 'inicial' then 'Abono inicial'
              when 'entrega' then 'Pago a la entrega'
              else 'Abono'
            end
            || coalesce(' · ' || nullif(new.metodo, ''), '')
            || coalesce(' · ' || nullif(new.nota, ''), '');

  if tg_op = 'INSERT' then
    insert into public.incomes
      (order_payment_id, monto, moneda, fecha, categoria, client_id, project_id,
       descripcion, brand_id, es_personal, created_by)
    values
      (new.id, new.monto, new.moneda, new.fecha, 'Pago de cliente', new.client_id,
       v_project_id, v_desc, v_brand_id, false, new.created_by);
  else
    update public.incomes set
      monto = new.monto, moneda = new.moneda, fecha = new.fecha,
      client_id = new.client_id, project_id = v_project_id,
      descripcion = v_desc, brand_id = v_brand_id
    where order_payment_id = new.id;
  end if;

  return new;
end; $$;

drop trigger if exists trg_payment_to_income on public.order_payments;
create trigger trg_payment_to_income
  after insert or update on public.order_payments
  for each row execute function public.fn_payment_to_income();

-- 3) Backfill: ingresos para pagos ya existentes que aún no estén enlazados.
insert into public.incomes
  (order_payment_id, monto, moneda, fecha, categoria, client_id, project_id, descripcion, brand_id, es_personal, created_by)
select
  op.id, op.monto, op.moneda, op.fecha, 'Pago de cliente', op.client_id,
  (select p.id from public.projects p where p.order_id = op.order_id limit 1),
  case op.tipo when 'inicial' then 'Abono inicial' when 'entrega' then 'Pago a la entrega' else 'Abono' end,
  (select o.brand_id from public.orders o where o.id = op.order_id),
  false, op.created_by
from public.order_payments op
where not exists (select 1 from public.incomes i where i.order_payment_id = op.id);

-- FIN

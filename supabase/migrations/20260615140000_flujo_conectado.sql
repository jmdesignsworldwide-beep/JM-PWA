-- ============================================================================
-- JM CONTROL CENTER — 20260615140000_flujo_conectado.sql  (Fase 4)
-- Pedido -> Contrato -> (al firmar) Factura + Calendario, con:
--  - ITBIS 18% opcional (si fiscal)         -> campos en orders/invoices
--  - Regla de split de pago (plan_pago)     -> agenda varios cobros al firmar
--  - Snapshot de precios al firmar          -> contracts.snapshot_json (congela)
--  - Antigüedad del contrato                -> contracts.fecha_envio
--  - Hilo de conversación del pedido        -> tabla order_notes
-- Dinero en NUMERIC(14,2). Idempotente.
-- ============================================================================

-- 1) PEDIDOS: totales desglosados, plan de pago, datos de rama designs, entrega
alter table public.orders
  add column if not exists subtotal      numeric(14,2) not null default 0,
  add column if not exists descuento     numeric(14,2) not null default 0,
  add column if not exists itbis         numeric(14,2) not null default 0,
  add column if not exists aplica_itbis  boolean not null default false,
  add column if not exists industria     text,
  add column if not exists tipo_solucion text,
  add column if not exists plan_pago     jsonb not null default '[]'::jsonb,
  add column if not exists fecha_entrega date;

-- 2) CONTRATOS: envío (antigüedad) + snapshot congelado
alter table public.contracts
  add column if not exists fecha_envio   timestamptz,
  add column if not exists snapshot_json jsonb;

-- 3) HILO DE CONVERSACIÓN DEL PEDIDO
create table if not exists public.order_notes (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  texto       text not null,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- triggers updated_at + auditoría para la tabla nueva
drop trigger if exists trg_touch_order_notes on public.order_notes;
create trigger trg_touch_order_notes before update on public.order_notes
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_order_notes on public.order_notes;
create trigger trg_audit_order_notes after insert or update or delete on public.order_notes
  for each row execute function public.fn_audit();

-- RLS order_notes: staff full
alter table public.order_notes enable row level security;
drop policy if exists staff_all_order_notes on public.order_notes;
create policy staff_all_order_notes on public.order_notes for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant all on public.order_notes to authenticated;

-- ----------------------------------------------------------------------------
-- 4) STAMP (BEFORE): fecha_envio, fecha_aprobacion y SNAPSHOT congelado
-- ----------------------------------------------------------------------------
create or replace function public.fn_contract_stamp()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
begin
  -- Al ENVIAR: sella la fecha de envío (para la antigüedad).
  if new.estado = 'enviado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'enviado')
     and new.fecha_envio is null then
    new.fecha_envio := now();
  end if;

  -- Al FIRMAR: sella aprobación y congela el snapshot de precios.
  if new.estado = 'aprobado_firmado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado_firmado') then
    if new.fecha_aprobacion is null then
      new.fecha_aprobacion := now();
    end if;
    if new.snapshot_json is null then
      select * into v_order from public.orders where id = new.order_id;
      new.snapshot_json := jsonb_build_object(
        'congelado_en', now(),
        'rama',         v_order.rama,
        'items',        coalesce(v_order.detalle_json, '[]'::jsonb),
        'subtotal',     coalesce(v_order.subtotal, 0),
        'descuento',    coalesce(v_order.descuento, 0),
        'itbis',        coalesce(v_order.itbis, 0),
        'total',        coalesce(v_order.total, 0),
        'moneda',       coalesce(v_order.moneda, 'DOP'),
        'plan_pago',    coalesce(v_order.plan_pago, '[]'::jsonb),
        'fecha_entrega',v_order.fecha_entrega
      );
    end if;
  end if;

  return new;
end; $$;

drop trigger if exists trg_contract_stamp on public.contracts;
create trigger trg_contract_stamp
  before insert or update on public.contracts
  for each row execute function public.fn_contract_stamp();

-- ----------------------------------------------------------------------------
-- 5) DISPARO (AFTER): factura (con ITBIS) + calendario (split) + proyecto + lead
-- ----------------------------------------------------------------------------
create or replace function public.fn_contract_signed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order      public.orders%rowtype;
  v_client     public.clients%rowtype;
  v_project_id uuid;
  v_entrega    date;
  v_plan       jsonb;
  v_item       jsonb;
  v_monto      numeric(14,2);
  v_cobros     int := 0;
begin
  if new.estado = 'aprobado_firmado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado_firmado') then

    -- IDEMPOTENCIA: si ya hay factura para este contrato, no repetir nada.
    if exists (select 1 from public.invoices where contract_id = new.id) then
      return new;
    end if;

    select * into v_order  from public.orders  where id = new.order_id;
    select * into v_client from public.clients where id = new.client_id;

    -- Proyecto (si no existe para el order)
    select id into v_project_id from public.projects where order_id = new.order_id limit 1;
    if v_project_id is null then
      insert into public.projects
        (client_id, order_id, nombre, tipo, precio_total, moneda,
         fecha_inicio, fecha_entrega, estado, brand_id, created_by)
      values
        (new.client_id, new.order_id,
         'Proyecto ' || coalesce(v_client.nombre, 'Cliente'),
         coalesce(v_order.rama, 'designs'),
         coalesce(v_order.total, 0), coalesce(v_order.moneda, 'DOP'),
         current_date,
         coalesce(v_order.fecha_entrega, current_date + interval '14 days'),
         'en_progreso', v_order.brand_id, auth.uid())
      returning id into v_project_id;
    end if;

    v_entrega := coalesce(v_order.fecha_entrega,
      (select fecha_entrega from public.projects where id = v_project_id),
      current_date + interval '14 days');

    -- FACTURA: copia el snapshot del pedido (items + totales). NCF PENDIENTE.
    insert into public.invoices
      (contract_id, client_id, es_fiscal, ncf, rnc, items_json,
       subtotal, itbis, total, moneda, estado_pago, fecha, brand_id, created_by)
    values
      (new.id, new.client_id,
       coalesce(v_client.factura_fiscal, false),
       null, v_client.rnc,
       coalesce(v_order.detalle_json, '[]'::jsonb),
       coalesce(v_order.subtotal, v_order.total, 0),
       coalesce(v_order.itbis, 0),
       coalesce(v_order.total, 0),
       coalesce(v_order.moneda, 'DOP'),
       'pendiente', current_date, v_order.brand_id, auth.uid());

    -- ENTREGA en calendario
    insert into public.calendar_events
      (titulo, tipo, fecha, client_id, project_id, brand_id, auto_generado, created_by)
    values
      ('Entrega de proyecto', 'entrega', v_entrega, new.client_id, v_project_id,
       v_order.brand_id, true, auth.uid());

    -- COBROS según el plan de pago (split). Si no hay plan, un solo cobro total.
    v_plan := coalesce(v_order.plan_pago, '[]'::jsonb);
    if jsonb_array_length(v_plan) > 0 then
      for v_item in select * from jsonb_array_elements(v_plan) loop
        v_monto := round(coalesce(v_order.total, 0)
                         * (coalesce((v_item->>'porcentaje')::numeric, 0) / 100.0), 2);
        insert into public.calendar_events
          (titulo, tipo, fecha, client_id, project_id, brand_id, auto_generado, created_by)
        values
          (coalesce(v_item->>'label', 'Cobro') || ' — ' ||
             coalesce(v_order.moneda,'DOP') || ' ' || to_char(v_monto, 'FM999,999,990.00'),
           'cobro',
           current_date + (coalesce((v_item->>'offset_dias')::int, 0) || ' days')::interval,
           new.client_id, v_project_id, v_order.brand_id, true, auth.uid());
        v_cobros := v_cobros + 1;
      end loop;
    else
      insert into public.calendar_events
        (titulo, tipo, fecha, client_id, project_id, brand_id, auto_generado, created_by)
      values
        ('Cobro de factura', 'cobro', v_entrega, new.client_id, v_project_id,
         v_order.brand_id, true, auth.uid());
    end if;

    -- Conversión Lead -> Cliente activo
    update public.clients set es_lead = false where id = new.client_id;
  end if;

  return new;
end; $$;

drop trigger if exists trg_contract_signed on public.contracts;
create trigger trg_contract_signed
  after insert or update on public.contracts
  for each row execute function public.fn_contract_signed();

-- FIN 20260615140000_flujo_conectado.sql

-- ============================================================================
-- JM CONTROL CENTER — 20260615150000_cobros_calendario.sql  (Fase 5)
--  - calendar_events: completado (pendiente/listo), monto + moneda (flujo caja)
--  - app_settings: preferencias de recordatorios (hora, días de aviso)
--  - fn_contract_signed: guarda monto/moneda en cada evento de cobro (split)
-- Idempotente.
-- ============================================================================

alter table public.calendar_events
  add column if not exists completado boolean not null default false,
  add column if not exists monto  numeric(14,2),
  add column if not exists moneda text;

-- Preferencias globales (singleton). Las lee el cron diario.
create table if not exists public.app_settings (
  id                   text primary key default 'global',
  resumen_hora         text not null default '07:00',
  dias_aviso_entrega   integer not null default 1,
  dias_aviso_cobro     integer not null default 1,
  updated_at           timestamptz not null default now()
);

insert into public.app_settings (id) values ('global') on conflict (id) do nothing;

drop trigger if exists trg_touch_app_settings on public.app_settings;
create trigger trg_touch_app_settings before update on public.app_settings
  for each row execute function public.fn_touch_updated_at();

alter table public.app_settings enable row level security;
drop policy if exists staff_read_settings on public.app_settings;
create policy staff_read_settings on public.app_settings for select to authenticated
  using (public.is_staff());
drop policy if exists owner_write_settings on public.app_settings;
create policy owner_write_settings on public.app_settings for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

grant all on public.app_settings to authenticated;

-- ----------------------------------------------------------------------------
-- Trigger de disparo: ahora guarda monto + moneda en los eventos de cobro.
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
begin
  if new.estado = 'aprobado_firmado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado_firmado') then

    if exists (select 1 from public.invoices where contract_id = new.id) then
      return new;
    end if;

    select * into v_order  from public.orders  where id = new.order_id;
    select * into v_client from public.clients where id = new.client_id;

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

    -- ENTREGA (sin monto)
    insert into public.calendar_events
      (titulo, tipo, fecha, client_id, project_id, brand_id, auto_generado, created_by)
    values
      ('Entrega de proyecto', 'entrega', v_entrega, new.client_id, v_project_id,
       v_order.brand_id, true, auth.uid());

    -- COBROS (split) con monto + moneda
    v_plan := coalesce(v_order.plan_pago, '[]'::jsonb);
    if jsonb_array_length(v_plan) > 0 then
      for v_item in select * from jsonb_array_elements(v_plan) loop
        v_monto := round(coalesce(v_order.total, 0)
                         * (coalesce((v_item->>'porcentaje')::numeric, 0) / 100.0), 2);
        insert into public.calendar_events
          (titulo, tipo, fecha, client_id, project_id, brand_id, auto_generado,
           monto, moneda, created_by)
        values
          (coalesce(v_item->>'label', 'Cobro') || ' — ' ||
             coalesce(v_order.moneda,'DOP') || ' ' || to_char(v_monto, 'FM999,999,990.00'),
           'cobro',
           current_date + (coalesce((v_item->>'offset_dias')::int, 0) || ' days')::interval,
           new.client_id, v_project_id, v_order.brand_id, true,
           v_monto, coalesce(v_order.moneda,'DOP'), auth.uid());
      end loop;
    else
      insert into public.calendar_events
        (titulo, tipo, fecha, client_id, project_id, brand_id, auto_generado,
         monto, moneda, created_by)
      values
        ('Cobro de factura', 'cobro', v_entrega, new.client_id, v_project_id,
         v_order.brand_id, true, coalesce(v_order.total,0), coalesce(v_order.moneda,'DOP'), auth.uid());
    end if;

    update public.clients set es_lead = false where id = new.client_id;
  end if;

  return new;
end; $$;

-- FIN 20260615150000_cobros_calendario.sql

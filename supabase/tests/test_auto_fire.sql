-- ============================================================================
-- PRUEBA: DISPARO AUTOMÁTICO (contrato firmado -> factura + calendario).
-- Demuestra que: (a) NO ocurre antes de firmar, (b) ocurre UNA sola vez al
-- firmar (1 factura, 1 proyecto, 2 eventos, lead->cliente), y (c) NO se
-- duplica si se vuelve a firmar.  Hace ROLLBACK al final (no deja datos).
-- ============================================================================
begin;

do $$
declare
  v_brand    uuid;
  v_client   uuid;
  v_order    uuid;
  v_contract uuid;
  v_inv  integer;
  v_evt  integer;
  v_proj integer;
  v_lead boolean;
begin
  insert into public.brands (nombre) values ('PRUEBA ' || gen_random_uuid())
    returning id into v_brand;
  insert into public.clients (nombre, es_lead, brand_id, factura_fiscal)
    values ('Cliente Prueba', true, v_brand, false)
    returning id into v_client;
  insert into public.orders (client_id, rama, total, moneda, brand_id, detalle_json)
    values (v_client, 'designs', 50000.00, 'DOP', v_brand,
            '[{"item":"Sitio web","precio":50000}]'::jsonb)
    returning id into v_order;
  insert into public.contracts (order_id, client_id, estado, brand_id)
    values (v_order, v_client, 'borrador', v_brand)
    returning id into v_contract;

  -- (a) Antes de firmar: NO debe existir factura.
  select count(*) into v_inv from public.invoices where contract_id = v_contract;
  if v_inv <> 0 then raise exception 'FALLO: existía factura antes de firmar (%).', v_inv; end if;
  raise notice 'OK (a): sin factura antes de firmar.';

  -- (b) FIRMA #1
  update public.contracts set estado = 'aprobado_firmado' where id = v_contract;

  select count(*) into v_inv  from public.invoices where contract_id = v_contract;
  select count(*) into v_proj from public.projects where order_id = v_order;
  select count(*) into v_evt  from public.calendar_events
    where project_id in (select id from public.projects where order_id = v_order);
  select es_lead into v_lead  from public.clients where id = v_client;

  if v_inv  <> 1     then raise exception 'FALLO: facturas tras firmar = % (esperado 1).', v_inv; end if;
  if v_proj <> 1     then raise exception 'FALLO: proyectos = % (esperado 1).', v_proj; end if;
  if v_evt  <> 2     then raise exception 'FALLO: eventos calendario = % (esperado 2).', v_evt; end if;
  if v_lead is not false then raise exception 'FALLO: el cliente sigue marcado como lead.'; end if;
  raise notice 'OK (b): firma #1 -> 1 factura, 1 proyecto, 2 eventos, lead->cliente.';

  -- (c) FIRMA #2 (idempotencia): volver a 'enviado' y firmar otra vez.
  update public.contracts set estado = 'enviado'          where id = v_contract;
  update public.contracts set estado = 'aprobado_firmado' where id = v_contract;

  select count(*) into v_inv from public.invoices where contract_id = v_contract;
  select count(*) into v_evt from public.calendar_events
    where project_id in (select id from public.projects where order_id = v_order);
  if v_inv <> 1 then raise exception 'FALLO idempotencia: facturas = % (esperado 1).', v_inv; end if;
  if v_evt <> 2 then raise exception 'FALLO idempotencia: eventos = % (esperado 2).', v_evt; end if;
  raise notice 'OK (c): firma #2 NO duplicó (sigue 1 factura, 2 eventos).';

  -- (d) Un UPDATE normal estando firmado tampoco debe disparar.
  update public.contracts set contenido = 'texto editado' where id = v_contract;
  select count(*) into v_inv from public.invoices where contract_id = v_contract;
  if v_inv <> 1 then raise exception 'FALLO: un update normal duplicó la factura.'; end if;
  raise notice 'OK (d): un update normal no vuelve a disparar.';

  raise notice '==============================================';
  raise notice 'PRUEBA DISPARO AUTOMÁTICO: PASÓ ✅';
  raise notice '==============================================';
end $$;

rollback;

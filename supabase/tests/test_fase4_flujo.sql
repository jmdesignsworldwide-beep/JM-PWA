begin;
do $$
declare
  v_brand uuid; v_client uuid; v_order uuid; v_contract uuid;
  v_inv int; v_cobros int; v_entrega int; v_itbis numeric; v_total numeric;
  v_snap jsonb; v_envio timestamptz;
begin
  insert into public.brands (nombre) values ('T'||gen_random_uuid()) returning id into v_brand;
  -- cliente fiscal (aplica ITBIS)
  insert into public.clients (nombre, es_lead, brand_id, factura_fiscal, rnc)
    values ('Cliente F4', true, v_brand, true, '101000000') returning id into v_client;

  -- pedido: subtotal 100000, itbis 18% = 18000, total 118000, plan 50/50
  insert into public.orders
    (client_id, rama, detalle_json, subtotal, descuento, itbis, aplica_itbis, total, moneda, brand_id, fecha_entrega, plan_pago)
  values
    (v_client, 'distribution',
     '[{"producto":"Gorras","cantidad":50,"precio_unitario":2000,"subtotal":100000}]'::jsonb,
     100000, 0, 18000, true, 118000, 'DOP', v_brand, current_date + 10,
     '[{"label":"Inicial","porcentaje":50,"offset_dias":0},{"label":"Entrega","porcentaje":50,"offset_dias":10}]'::jsonb)
    returning id into v_order;

  insert into public.contracts (order_id, client_id, estado, brand_id)
    values (v_order, v_client, 'borrador', v_brand) returning id into v_contract;

  -- ENVIAR -> sella fecha_envio
  update public.contracts set estado='enviado' where id = v_contract;
  select fecha_envio into v_envio from public.contracts where id = v_contract;
  if v_envio is null then raise exception 'FALLO: fecha_envio no se selló al enviar'; end if;
  raise notice 'OK: fecha_envio sellada al enviar.';

  -- FIRMAR -> dispara todo
  update public.contracts set estado='aprobado_firmado' where id = v_contract;

  select count(*) into v_inv from public.invoices where contract_id = v_contract;
  select itbis, total into v_itbis, v_total from public.invoices where contract_id = v_contract;
  select count(*) into v_cobros from public.calendar_events
    where tipo='cobro' and project_id in (select id from public.projects where order_id=v_order);
  select count(*) into v_entrega from public.calendar_events
    where tipo='entrega' and project_id in (select id from public.projects where order_id=v_order);
  select snapshot_json into v_snap from public.contracts where id = v_contract;

  if v_inv <> 1 then raise exception 'FALLO: facturas=% (esp 1)', v_inv; end if;
  if v_itbis <> 18000 then raise exception 'FALLO: itbis=% (esp 18000)', v_itbis; end if;
  if v_total <> 118000 then raise exception 'FALLO: total=% (esp 118000)', v_total; end if;
  if v_cobros <> 2 then raise exception 'FALLO: cobros=% (esp 2 por split)', v_cobros; end if;
  if v_entrega <> 1 then raise exception 'FALLO: entregas=% (esp 1)', v_entrega; end if;
  if v_snap is null then raise exception 'FALLO: snapshot no congelado'; end if;
  if (v_snap->>'total')::numeric <> 118000 then raise exception 'FALLO: snapshot total malo'; end if;
  raise notice 'OK firma: 1 factura (itbis 18000, total 118000), 2 cobros split, 1 entrega, snapshot congelado.';

  -- IDEMPOTENCIA: re-firmar no duplica
  update public.contracts set estado='enviado' where id = v_contract;
  update public.contracts set estado='aprobado_firmado' where id = v_contract;
  select count(*) into v_inv from public.invoices where contract_id = v_contract;
  select count(*) into v_cobros from public.calendar_events
    where tipo='cobro' and project_id in (select id from public.projects where order_id=v_order);
  if v_inv <> 1 then raise exception 'FALLO idempotencia: facturas=%', v_inv; end if;
  if v_cobros <> 2 then raise exception 'FALLO idempotencia: cobros=%', v_cobros; end if;
  raise notice 'OK idempotencia: sigue 1 factura y 2 cobros.';

  -- SNAPSHOT congelado: cambiar el pedido luego NO cambia el snapshot
  update public.orders set total = 999999 where id = v_order;
  select (snapshot_json->>'total')::numeric into v_total from public.contracts where id = v_contract;
  if v_total <> 118000 then raise exception 'FALLO: snapshot cambió al editar el pedido (=%).', v_total; end if;
  raise notice 'OK: snapshot sigue congelado en 118000 aunque el pedido cambie.';

  raise notice '====== PRUEBA FASE 4: PASÓ ✅ ======';
end $$;
rollback;

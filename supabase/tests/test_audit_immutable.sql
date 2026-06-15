-- ============================================================================
-- PRUEBA: audit_log es INMUTABLE (no se puede borrar ni editar).
-- Correr en el SQL Editor de Supabase. Hace ROLLBACK al final (no deja datos).
-- Si algo falla, lanza EXCEPTION y verás el error. Si pasa, verás "PASÓ ✅".
-- ============================================================================
begin;

do $$
declare
  v_audit_id uuid;
  v_err text;
  v_blocked boolean;
begin
  -- Generamos una fila de auditoría creando un cliente de prueba.
  insert into public.clients (nombre) values ('PRUEBA AUDIT');
  select id into v_audit_id from public.audit_log order by fecha desc, id desc limit 1;
  if v_audit_id is null then
    raise exception 'FALLO: la auditoría no registró el INSERT (¿triggers activos?)';
  end if;
  raise notice 'OK: el INSERT quedó auditado (id=%).', v_audit_id;

  -- Intento de DELETE -> debe FALLAR.
  v_blocked := false;
  begin
    delete from public.audit_log where id = v_audit_id;
  exception when others then
    v_blocked := true; v_err := sqlerrm;
  end;
  if v_blocked then
    raise notice 'OK: DELETE bloqueado -> %', v_err;
  else
    raise exception 'FALLO CRÍTICO: se pudo BORRAR una fila de audit_log';
  end if;

  -- Intento de UPDATE -> debe FALLAR.
  v_blocked := false;
  begin
    update public.audit_log set accion = 'HACKEADO' where id = v_audit_id;
  exception when others then
    v_blocked := true; v_err := sqlerrm;
  end;
  if v_blocked then
    raise notice 'OK: UPDATE bloqueado -> %', v_err;
  else
    raise exception 'FALLO CRÍTICO: se pudo EDITAR una fila de audit_log';
  end if;

  raise notice '==============================================';
  raise notice 'PRUEBA AUDITORÍA INMUTABLE: PASÓ ✅';
  raise notice '==============================================';
end $$;

rollback;

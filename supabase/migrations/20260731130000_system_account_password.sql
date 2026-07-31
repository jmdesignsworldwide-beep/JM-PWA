-- ============================================================================
-- JM CONTROL CENTER — Sistemas: contraseña de Supabase por cuenta (correo)
-- Cada correo (system_accounts) aloja hasta 2 proyectos con UN solo login de
-- Supabase. Se guarda su contraseña CIFRADA (pgp_sym_encrypt con la llave
-- aislada de system_security), nunca en texto plano; se revela con el PIN
-- (verificado en el servidor, rate-limit, auditado). Reusa la infra de C4.
-- pgcrypto vive en `extensions` → search_path = public, extensions.
-- ============================================================================

create extension if not exists pgcrypto;

alter table public.system_accounts add column if not exists password_cifrado bytea;

-- Guarda/actualiza la contraseña (cifrada). Requiere PIN correcto.
create or replace function public.save_account_password(p_actor uuid, p_account_id uuid, p_password text, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text; v_key text; v_recent int;
begin
  if not exists (select 1 from public.users_profiles where id = p_actor and rol = 'owner') then raise exception 'No autorizado'; end if;

  select count(*) into v_recent from public.system_pin_attempts
    where usuario_id = p_actor and at > now() - interval '60 seconds';
  if v_recent >= 5 then raise exception 'Demasiados intentos. Espera un momento.'; end if;

  select pin_hash, crypto_key into v_hash, v_key from public.system_security where id = 'global';
  if v_hash is null then raise exception 'Configura primero el PIN en Sistemas'; end if;
  if crypt(p_pin, v_hash) <> v_hash then
    insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, false);
    raise exception 'PIN incorrecto';
  end if;
  insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, true);

  update public.system_accounts
    set password_cifrado = case when nullif(btrim(p_password), '') is null then null
                                 else pgp_sym_encrypt(p_password, v_key) end
    where id = p_account_id;

  insert into public.audit_log (accion, tabla, registro_id, usuario_id, contenido_json)
  values ('PWD_SAVE', 'system_accounts', p_account_id, p_actor, jsonb_build_object('set', nullif(btrim(p_password), '') is not null));
end; $$;

-- Revela la contraseña verificando el PIN. Rate-limit + audit.
create or replace function public.reveal_account_password(p_actor uuid, p_account_id uuid, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text; v_key text; v_recent int; v_cif bytea;
begin
  if not exists (select 1 from public.users_profiles where id = p_actor and rol = 'owner') then raise exception 'No autorizado'; end if;

  select count(*) into v_recent from public.system_pin_attempts
    where usuario_id = p_actor and at > now() - interval '60 seconds';
  if v_recent >= 5 then raise exception 'Demasiados intentos. Espera un momento.'; end if;

  select pin_hash, crypto_key into v_hash, v_key from public.system_security where id = 'global';
  if v_hash is null then raise exception 'Configura primero el PIN en Sistemas'; end if;
  if crypt(p_pin, v_hash) <> v_hash then
    insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, false);
    return null;  -- PIN incorrecto
  end if;
  insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, true);

  select password_cifrado into v_cif from public.system_accounts where id = p_account_id;
  if v_cif is null then return ''; end if;  -- sin contraseña guardada

  insert into public.audit_log (accion, tabla, registro_id, usuario_id, contenido_json)
  values ('REVEAL', 'system_accounts', p_account_id, p_actor, jsonb_build_object('kind', 'password'));

  return pgp_sym_decrypt(v_cif, v_key);
end; $$;

-- Ejecución SOLO desde el servidor (service_role).
revoke all on function public.save_account_password(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.reveal_account_password(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.save_account_password(uuid, uuid, text, text) to service_role;
grant execute on function public.reveal_account_password(uuid, uuid, text) to service_role;

-- FIN

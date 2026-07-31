-- ============================================================================
-- JM CONTROL CENTER — Sistemas: acceso (usuario + contraseña) por PROYECTO
-- Algunos proyectos (demos, clientes) tienen credenciales de acceso; los
-- internos casi nunca. Se marca con `tiene_acceso`. El usuario es visible; la
-- contraseña se guarda CIFRADA (pgp_sym_encrypt con la llave aislada de
-- system_security) y solo se revela con el PIN (servidor, rate-limit, audit).
-- Reusa la infra de C4. pgcrypto vive en `extensions`.
-- ============================================================================

create extension if not exists pgcrypto;

alter table public.system_projects
  add column if not exists tiene_acceso     boolean not null default false,
  add column if not exists usuario          text,
  add column if not exists password_cifrado bytea;

-- Guarda/actualiza la contraseña del proyecto (cifrada). Requiere PIN correcto.
create or replace function public.save_project_password(p_actor uuid, p_project_id uuid, p_password text, p_pin text)
returns void language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_key text; v_recent int;
begin
  if not exists (select 1 from public.users_profiles where id = p_actor and rol = 'owner') then raise exception 'No autorizado'; end if;
  select count(*) into v_recent from public.system_pin_attempts where usuario_id = p_actor and at > now() - interval '60 seconds';
  if v_recent >= 5 then raise exception 'Demasiados intentos. Espera un momento.'; end if;
  select pin_hash, crypto_key into v_hash, v_key from public.system_security where id = 'global';
  if v_hash is null then raise exception 'Configura primero el PIN en Sistemas'; end if;
  if crypt(p_pin, v_hash) <> v_hash then
    insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, false);
    raise exception 'PIN incorrecto';
  end if;
  insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, true);
  update public.system_projects
    set password_cifrado = case when nullif(btrim(p_password), '') is null then null else pgp_sym_encrypt(p_password, v_key) end
    where id = p_project_id;
  insert into public.audit_log (accion, tabla, registro_id, usuario_id, contenido_json)
  values ('PWD_SAVE', 'system_projects', p_project_id, p_actor, jsonb_build_object('set', nullif(btrim(p_password), '') is not null));
end; $$;

-- Revela la contraseña del proyecto verificando el PIN. Rate-limit + audit.
create or replace function public.reveal_project_password(p_actor uuid, p_project_id uuid, p_pin text)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare v_hash text; v_key text; v_recent int; v_cif bytea;
begin
  if not exists (select 1 from public.users_profiles where id = p_actor and rol = 'owner') then raise exception 'No autorizado'; end if;
  select count(*) into v_recent from public.system_pin_attempts where usuario_id = p_actor and at > now() - interval '60 seconds';
  if v_recent >= 5 then raise exception 'Demasiados intentos. Espera un momento.'; end if;
  select pin_hash, crypto_key into v_hash, v_key from public.system_security where id = 'global';
  if v_hash is null then raise exception 'Configura primero el PIN en Sistemas'; end if;
  if crypt(p_pin, v_hash) <> v_hash then
    insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, false);
    return null;
  end if;
  insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, true);
  select password_cifrado into v_cif from public.system_projects where id = p_project_id;
  if v_cif is null then return ''; end if;
  insert into public.audit_log (accion, tabla, registro_id, usuario_id, contenido_json)
  values ('REVEAL', 'system_projects', p_project_id, p_actor, jsonb_build_object('kind', 'password'));
  return pgp_sym_decrypt(v_cif, v_key);
end; $$;

revoke all on function public.save_project_password(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.reveal_project_password(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.save_project_password(uuid, uuid, text, text) to service_role;
grant execute on function public.reveal_project_password(uuid, uuid, text) to service_role;

-- FIN

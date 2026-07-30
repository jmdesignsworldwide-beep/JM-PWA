-- ============================================================================
-- JM CONTROL CENTER — Deudas C4: datos bancarios del contacto (protegidos)
-- Guardar la cuenta bancaria de un contacto para pagarle. El NÚMERO DE CUENTA
-- se guarda CIFRADO (pgp_sym_encrypt), nunca en texto plano; solo se revela con
-- el PIN de Sistemas (misma ceremonia: verificado en el servidor, rate-limit,
-- auditado). Banco/titular/tipo sí se ven (no sensibles); el número aparece
-- enmascarado ****1234 hasta que metes el PIN.
--
-- La llave de cifrado es aleatoria (32 bytes), aislada en system_security (tabla
-- ya bloqueada: deny-all + solo RPC SECURITY DEFINER). NO se deriva del PIN, así
-- cambiar el PIN nunca deja datos ilegibles. Fort Knox, aditivo.
-- ============================================================================

create extension if not exists pgcrypto;

-- ── Llave de cifrado aislada en la tabla bloqueada system_security ──────────
-- Columna nueva + semilla única (no toca pin_hash si ya existe).
alter table public.system_security add column if not exists crypto_key text;
insert into public.system_security (id, crypto_key)
values ('global', encode(gen_random_bytes(32), 'hex'))
on conflict (id) do update
  set crypto_key = coalesce(public.system_security.crypto_key, encode(gen_random_bytes(32), 'hex'));

-- ── Tabla: 1 fila por contacto ──────────────────────────────────────────────
create table if not exists public.contact_bank (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null unique references public.clients(id) on delete cascade,
  banco           text,
  tipo_cuenta     text check (tipo_cuenta in ('ahorros','corriente') or tipo_cuenta is null),
  titular         text,
  cedula_rnc      text,
  numero_ultimos4 text,     -- para mostrar enmascarado sin PIN
  numero_cifrado  bytea,    -- pgp_sym_encrypt(numero, llave) — NUNCA texto plano
  created_by      uuid not null references auth.users(id) on delete cascade default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

alter table public.contact_bank enable row level security;
alter table public.contact_bank force row level security;
drop policy if exists owner_contact_bank on public.contact_bank;
create policy owner_contact_bank on public.contact_bank for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.contact_bank to authenticated;

drop trigger if exists trg_touch_contact_bank on public.contact_bank;
create trigger trg_touch_contact_bank before update on public.contact_bank
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_contact_bank on public.contact_bank;
create trigger trg_audit_contact_bank after insert or update or delete on public.contact_bank
  for each row execute function public.fn_audit();

-- ── RPCs (SECURITY DEFINER, solo service_role; PIN verificado en servidor) ──
-- Guarda/actualiza los datos bancarios. Requiere PIN correcto. Cifra el número
-- con la llave aislada y guarda solo los últimos 4 en claro (para enmascarar).
create or replace function public.save_contact_bank(
  p_actor uuid, p_client_id uuid, p_banco text, p_tipo text,
  p_titular text, p_cedula text, p_numero text, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_hash   text;
  v_key    text;
  v_recent int;
  v_digits text;
  v_last4  text;
  v_cif    bytea;
begin
  if not exists (select 1 from public.users_profiles where id = p_actor and rol = 'owner') then raise exception 'No autorizado'; end if;
  if p_tipo is not null and p_tipo not in ('ahorros','corriente') then raise exception 'Tipo de cuenta inválido'; end if;

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

  -- Número: solo cifrado + últimos 4 en claro. Si viene vacío, se preservan.
  v_digits := nullif(regexp_replace(coalesce(p_numero, ''), '\D', '', 'g'), '');
  if v_digits is not null then
    v_last4 := right(v_digits, 4);
    v_cif   := pgp_sym_encrypt(v_digits, v_key);
  end if;

  insert into public.contact_bank as cb
    (client_id, banco, tipo_cuenta, titular, cedula_rnc, numero_ultimos4, numero_cifrado, created_by)
  values
    (p_client_id, nullif(btrim(p_banco), ''), p_tipo, nullif(btrim(p_titular), ''),
     nullif(btrim(p_cedula), ''), v_last4, v_cif, p_actor)
  on conflict (client_id) do update set
    banco       = nullif(btrim(p_banco), ''),
    tipo_cuenta = p_tipo,
    titular     = nullif(btrim(p_titular), ''),
    cedula_rnc  = nullif(btrim(p_cedula), ''),
    numero_ultimos4 = coalesce(v_last4, cb.numero_ultimos4),
    numero_cifrado  = coalesce(v_cif, cb.numero_cifrado);

  insert into public.audit_log (accion, tabla, registro_id, usuario_id, contenido_json)
  values ('BANK_SAVE', 'contact_bank', p_client_id, p_actor, jsonb_build_object('cambio_numero', v_digits is not null));
end; $$;

-- Revela el número completo verificando el PIN en el servidor. Rate-limit + audit.
create or replace function public.reveal_contact_bank(p_actor uuid, p_client_id uuid, p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_hash   text;
  v_key    text;
  v_recent int;
  v_cif    bytea;
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

  select numero_cifrado into v_cif from public.contact_bank where client_id = p_client_id;
  if v_cif is null then return ''; end if;  -- sin número guardado

  insert into public.audit_log (accion, tabla, registro_id, usuario_id, contenido_json)
  values ('REVEAL', 'contact_bank', p_client_id, p_actor, jsonb_build_object('kind', 'bank'));

  return pgp_sym_decrypt(v_cif, v_key);
end; $$;

-- Ejecución SOLO desde el servidor (service_role). Fuera de anon/authenticated.
revoke all on function public.save_contact_bank(uuid, uuid, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.reveal_contact_bank(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.save_contact_bank(uuid, uuid, text, text, text, text, text, text) to service_role;
grant execute on function public.reveal_contact_bank(uuid, uuid, text) to service_role;

-- FIN

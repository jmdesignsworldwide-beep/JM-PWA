-- ============================================================================
-- JM CONTROL CENTER — Control de Sistemas (MAPA de cuentas Supabase)
-- Un MAPA, no un llavero. Registra qué correo tiene qué proyecto y cuántos
-- slots quedan. NO guarda contraseñas ni llaves de Supabase (por decisión de
-- seguridad): esos campos NO existen en estas tablas. Los "notas_protegidas"
-- son solo apuntes de referencia protegidos por PIN, nunca claves.
--
-- Fort Knox: RLS + FORCE (solo owner), auditoría inmutable, PIN hasheado con
-- pgcrypto (bcrypt) y verificado en el SERVIDOR vía RPC SECURITY DEFINER,
-- rate-limit por tabla de intentos. Aditivo: no toca datos existentes.
-- ============================================================================

-- pgcrypto ya existe (schema.sql), pero idempotente por si acaso.
create extension if not exists pgcrypto;

-- ── Tablas ──────────────────────────────────────────────────────────────────
create table if not exists public.system_accounts (
  id               uuid primary key default gen_random_uuid(),
  correo           text not null,
  etiqueta         text,
  capacidad        int  not null default 2 check (capacidad >= 0 and capacidad <= 50),
  notas            text,
  notas_protegidas text,                    -- apunte de referencia (NO claves), revelado con PIN
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create unique index if not exists system_accounts_correo_uidx on public.system_accounts (lower(correo));

create table if not exists public.system_projects (
  id               uuid primary key default gen_random_uuid(),
  account_id       uuid references public.system_accounts(id) on delete set null,  -- null = sin asignar
  nombre           text not null,
  tipo             text not null default 'demo'   check (tipo in ('demo','cliente','colaboracion','interno')),
  referencia       text,                    -- project ref / URL (opcional)
  estado           text not null default 'activo' check (estado in ('activo','pausado','archivado')),
  notas            text,
  notas_protegidas text,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists system_projects_account_idx on public.system_projects (account_id, estado);

-- PIN del módulo: fila única. pin_hash NUNCA se expone (sin política de SELECT).
create table if not exists public.system_security (
  id         text primary key default 'global',
  pin_hash   text,
  updated_at timestamptz not null default now()
);

-- Intentos de PIN: rate-limit server-side + visibilidad para el owner.
create table if not exists public.system_pin_attempts (
  id         uuid primary key default gen_random_uuid(),
  usuario_id uuid,
  ok         boolean not null default false,
  at         timestamptz not null default now()
);
create index if not exists system_pin_attempts_idx on public.system_pin_attempts (usuario_id, at desc);

-- ── RLS + FORCE (solo owner) ────────────────────────────────────────────────
alter table public.system_accounts enable row level security;
alter table public.system_accounts force row level security;
drop policy if exists owner_system_accounts on public.system_accounts;
create policy owner_system_accounts on public.system_accounts for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.system_accounts to authenticated;

alter table public.system_projects enable row level security;
alter table public.system_projects force row level security;
drop policy if exists owner_system_projects on public.system_projects;
create policy owner_system_projects on public.system_projects for all to authenticated
  using (public.is_owner()) with check (public.is_owner());
grant all on public.system_projects to authenticated;

-- system_security: bloqueada. RLS + FORCE + política que niega TODO acceso
-- directo (ni el owner la lee). Solo las RPCs SECURITY DEFINER la tocan.
alter table public.system_security enable row level security;
alter table public.system_security force row level security;
revoke all on public.system_security from anon, authenticated;
drop policy if exists deny_all_system_security on public.system_security;
create policy deny_all_system_security on public.system_security for all to authenticated
  using (false) with check (false);

-- system_pin_attempts: el owner puede leer (ver intentos); insert solo vía RPC.
alter table public.system_pin_attempts enable row level security;
alter table public.system_pin_attempts force row level security;
revoke all on public.system_pin_attempts from anon, authenticated;
drop policy if exists owner_read_pin_attempts on public.system_pin_attempts;
create policy owner_read_pin_attempts on public.system_pin_attempts for select to authenticated
  using (public.is_owner());
grant select on public.system_pin_attempts to authenticated;

-- ── Triggers (updated_at + auditoría inmutable) ────────────────────────────
drop trigger if exists trg_touch_system_accounts on public.system_accounts;
create trigger trg_touch_system_accounts before update on public.system_accounts
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_system_accounts on public.system_accounts;
create trigger trg_audit_system_accounts after insert or update or delete on public.system_accounts
  for each row execute function public.fn_audit();

drop trigger if exists trg_touch_system_projects on public.system_projects;
create trigger trg_touch_system_projects before update on public.system_projects
  for each row execute function public.fn_touch_updated_at();
drop trigger if exists trg_audit_system_projects on public.system_projects;
create trigger trg_audit_system_projects after insert or update or delete on public.system_projects
  for each row execute function public.fn_audit();

-- ── RPCs (SECURITY DEFINER, search_path fijo, SOLO service_role) ────────────
-- Se ejecutan únicamente desde el SERVIDOR (admin client / service_role): la
-- ejecución está revocada de anon/authenticated, así no quedan expuestas por
-- PostgREST. El owner se valida dos veces: en la server action (requireOwner)
-- y aquí con p_actor. El PIN se hashea (bcrypt) y se verifica en el servidor;
-- el hash NUNCA se devuelve.
create or replace function public.set_system_pin(p_actor uuid, p_pin text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.users_profiles where id = p_actor and rol = 'owner') then raise exception 'No autorizado'; end if;
  if p_pin is null or char_length(p_pin) < 4 then raise exception 'El PIN debe tener al menos 4 dígitos'; end if;
  insert into public.system_security (id, pin_hash, updated_at)
  values ('global', crypt(p_pin, gen_salt('bf')), now())
  on conflict (id) do update set pin_hash = excluded.pin_hash, updated_at = now();
end; $$;

create or replace function public.system_pin_status(p_actor uuid)
returns boolean language sql security definer set search_path = public as $$
  select case when not exists (select 1 from public.users_profiles where id = p_actor and rol = 'owner') then false
    else exists (select 1 from public.system_security where id = 'global' and pin_hash is not null) end;
$$;

-- Revela una nota protegida verificando el PIN EN EL SERVIDOR. Rate-limit por
-- intentos recientes. Registra la revelación en audit_log (quién/qué/cuándo).
create or replace function public.reveal_protected(p_actor uuid, p_kind text, p_id uuid, p_pin text)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_hash text;
  v_recent int;
  v_note text;
begin
  if not exists (select 1 from public.users_profiles where id = p_actor and rol = 'owner') then raise exception 'No autorizado'; end if;
  if p_kind not in ('account','project') then raise exception 'Tipo inválido'; end if;

  select count(*) into v_recent from public.system_pin_attempts
    where usuario_id = p_actor and at > now() - interval '60 seconds';
  if v_recent >= 5 then raise exception 'Demasiados intentos. Espera un momento.'; end if;

  select pin_hash into v_hash from public.system_security where id = 'global';
  if v_hash is null then raise exception 'Configura primero el PIN en Configuración'; end if;

  if crypt(p_pin, v_hash) <> v_hash then
    insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, false);
    return null;  -- PIN incorrecto
  end if;

  insert into public.system_pin_attempts (usuario_id, ok) values (p_actor, true);

  if p_kind = 'account' then
    select notas_protegidas into v_note from public.system_accounts where id = p_id;
  else
    select notas_protegidas into v_note from public.system_projects where id = p_id;
  end if;

  insert into public.audit_log (accion, tabla, registro_id, usuario_id, contenido_json)
  values ('REVEAL',
          case when p_kind = 'account' then 'system_accounts' else 'system_projects' end,
          p_id, p_actor, jsonb_build_object('kind', p_kind));

  return v_note;
end; $$;

-- Ejecución SOLO desde el servidor (service_role). Fuera de anon/authenticated.
revoke all on function public.set_system_pin(uuid, text) from public, anon, authenticated;
revoke all on function public.system_pin_status(uuid) from public, anon, authenticated;
revoke all on function public.reveal_protected(uuid, text, uuid, text) from public, anon, authenticated;
grant execute on function public.set_system_pin(uuid, text) to service_role;
grant execute on function public.system_pin_status(uuid) to service_role;
grant execute on function public.reveal_protected(uuid, text, uuid, text) to service_role;

-- ── Semillas ────────────────────────────────────────────────────────────────
insert into public.system_accounts (correo, etiqueta)
select v.correo, v.etiqueta from (values
  ('johannjm78@gmail.com','Johann JM'),
  ('jcjohann07@gmail.com','Johann Pichardo'),
  ('ahorasoy077@gmail.com','Ahora Soy'),
  ('zalon1234567@gmail.com','Zalon'),
  ('trendshopworld.contact@gmail.com','Trend Shop'),
  ('livingprotestnbe@gmail.com','Living Protest'),
  ('samanavidatropical@gmail.com','Samana / Airbnb'),
  ('jp1234jp07@gmail.com','JP'),
  ('jmllc.contact@gmail.com','JM LLC'),
  ('jm.nexus.designs@gmail.com','JM Nexus Designs'),
  ('purpledreams.store.pds@gmail.com','Purple Dreams Store'),
  ('agencialuum@gmail.com','Luum'),
  ('kitjoy.contact@gmail.com','Kit Joy')
) as v(correo, etiqueta)
where not exists (select 1 from public.system_accounts s where lower(s.correo) = lower(v.correo));

-- Proyectos conocidos, SIN asignar (el owner los asigna desde el sistema).
insert into public.system_projects (nombre, tipo, estado)
select v.nombre, v.tipo, 'activo' from (values
  ('Demo de Construcción','demo'),
  ('Demo de Abogados','demo'),
  ('Demo de Veterinaria','demo'),
  ('Demo de Gym','demo'),
  ('Franklin — Cliente (Abogado)','cliente'),
  ('Edwin — Cliente (Constructora)','cliente'),
  ('SAHOS — Cliente','cliente'),
  ('Marjos — Cliente','cliente'),
  ('Reyna — Colaboración','colaboracion')
) as v(nombre, tipo)
where not exists (select 1 from public.system_projects p where p.nombre = v.nombre);

-- FIN

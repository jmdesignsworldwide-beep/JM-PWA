-- ============================================================================
-- JM CONTROL CENTER — 001_schema.sql
-- Esquema completo + RLS + auditoría inmutable + disparo automático.
-- Idempotente donde es razonable. Correr en Supabase: SQL Editor -> pegar -> Run.
--
-- DECISIÓN DE DINERO: todos los montos usan NUMERIC(14,2) (decimal exacto de
-- Postgres). NUNCA float/double. NUMERIC es exacto para contabilidad (sin
-- errores de redondeo binario) y soporta hasta 999,999,999,999.99.
-- Las dimensiones (ancho/alto) usan NUMERIC(10,2) por ser medidas, no dinero.
-- ============================================================================

create extension if not exists pgcrypto;

-- ----------------------------------------------------------------------------
-- TABLAS
-- ----------------------------------------------------------------------------

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null unique,
  activo      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.clients (
  id                 uuid primary key default gen_random_uuid(),
  nombre             text not null,
  apellido           text,
  cedula             text,
  factura_fiscal     boolean not null default false,
  rnc                text,
  telefono           text,
  whatsapp           text,
  correo             text,
  direccion          text,
  info_nota          text,
  categoria_servicio text check (categoria_servicio in ('web','software','ambos')),
  industria          text,
  es_lead            boolean not null default true,
  etapa_venta        text not null default 'nuevo'
                     check (etapa_venta in ('nuevo','contactado','cotizado','contrato_enviado','ganado','perdido')),
  lo_que_quiere      text,
  fuente             text,
  brand_id           uuid references public.brands(id) on delete set null,
  created_by         uuid references auth.users(id) on delete set null default auth.uid(),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.users_profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  rol         text not null default 'colaborador' check (rol in ('owner','colaborador','cliente')),
  nombre      text,
  correo      text,
  client_id   uuid references public.clients(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.orders (
  id           uuid primary key default gen_random_uuid(),
  client_id    uuid not null references public.clients(id) on delete cascade,
  rama         text not null default 'designs' check (rama in ('designs','distribution')),
  detalle_json jsonb not null default '[]'::jsonb,
  total        numeric(14,2) not null default 0,
  moneda       text not null default 'DOP' check (moneda in ('DOP','USD')),
  estado       text not null default 'borrador'
               check (estado in ('borrador','confirmado','en_proceso','completado','cancelado')),
  fecha        date not null default current_date,
  brand_id     uuid references public.brands(id) on delete set null,
  created_by   uuid references auth.users(id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.order_print_items (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders(id) on delete cascade,
  producto        text,
  categoria       text,
  personalizacion text,
  metodo          text check (metodo in ('unidad','tamano')),
  cantidad        integer not null default 1,
  ancho           numeric(10,2),
  alto            numeric(10,2),
  precio_unitario numeric(14,2) not null default 0,
  subtotal        numeric(14,2) not null default 0,
  arte_url        text,
  diseno_por_jm   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.contracts (
  id               uuid primary key default gen_random_uuid(),
  order_id         uuid references public.orders(id) on delete set null,
  client_id        uuid not null references public.clients(id) on delete cascade,
  contenido        text,
  estado           text not null default 'borrador'
                   check (estado in ('borrador','enviado','aprobado_firmado')),
  pdf_url          text,
  fecha_aprobacion timestamptz,
  firma_cliente    text,
  brand_id         uuid references public.brands(id) on delete set null,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.invoices (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid references public.contracts(id) on delete set null,
  client_id   uuid not null references public.clients(id) on delete cascade,
  es_fiscal   boolean not null default false,
  ncf         text,                       -- PENDIENTE: se genera en el módulo fiscal (NCF/e-CF)
  rnc         text,
  items_json  jsonb not null default '[]'::jsonb,
  subtotal    numeric(14,2) not null default 0,
  itbis       numeric(14,2) not null default 0,  -- PENDIENTE: ITBIS se calcula en el módulo fiscal
  total       numeric(14,2) not null default 0,
  moneda      text not null default 'DOP' check (moneda in ('DOP','USD')),
  pdf_url     text,
  estado_pago text not null default 'pendiente'
              check (estado_pago in ('pendiente','parcial','pagado')),
  fecha       date not null default current_date,
  brand_id    uuid references public.brands(id) on delete set null,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.projects (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.clients(id) on delete cascade,
  order_id         uuid references public.orders(id) on delete set null,
  nombre           text,
  tipo             text,
  contrato_url     text,
  precio_total     numeric(14,2) not null default 0,
  moneda           text not null default 'DOP' check (moneda in ('DOP','USD')),
  fecha_inicio     date,
  fecha_entrega    date,
  contenido_hablado text,
  estado           text not null default 'pendiente'
                   check (estado in ('pendiente','en_progreso','entregado','pagado','cancelado')),
  brand_id         uuid references public.brands(id) on delete set null,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.project_payments (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid references public.projects(id) on delete cascade,
  invoice_id  uuid references public.invoices(id) on delete set null,
  monto       numeric(14,2) not null default 0,
  moneda      text not null default 'DOP' check (moneda in ('DOP','USD')),
  fecha       date not null default current_date,
  metodo      text,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.project_milestones (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  nombre          text,
  fecha           date,
  porcentaje      numeric(5,2),
  visible_cliente boolean not null default true,
  created_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.project_files (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid references public.projects(id) on delete cascade,
  client_id       uuid references public.clients(id) on delete cascade,
  file_url        text,
  tipo            text,
  version         integer not null default 1,
  visible_cliente boolean not null default true,
  created_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.recurring_plans (
  id              uuid primary key default gen_random_uuid(),
  client_id       uuid not null references public.clients(id) on delete cascade,
  tipo            text check (tipo in ('mantenimiento','hosting','retainer')),
  monto           numeric(14,2) not null default 0,
  moneda          text not null default 'DOP' check (moneda in ('DOP','USD')),
  frecuencia      text check (frecuencia in ('mensual','trimestral','anual')),
  proxima_factura date,
  activo          boolean not null default true,
  brand_id        uuid references public.brands(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.quotes (
  id            uuid primary key default gen_random_uuid(),
  client_id     uuid references public.clients(id) on delete set null,
  rama          text check (rama in ('designs','distribution')),
  tipo_solucion text,
  industria     text,
  modulos_json  jsonb not null default '[]'::jsonb,
  items_json    jsonb not null default '[]'::jsonb,
  notas         text,
  precio_manual numeric(14,2),
  ai_generado   boolean not null default false,
  pdf_url       text,
  fecha         date not null default current_date,
  brand_id      uuid references public.brands(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.print_products (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  categoria           text,
  tipo_personalizacion text,
  metodo_cobro        text check (metodo_cobro in ('unidad','tamano')),
  precio_base         numeric(14,2) not null default 0,
  moneda              text not null default 'DOP' check (moneda in ('DOP','USD')),
  activo              boolean not null default true,
  created_by          uuid references auth.users(id) on delete set null default auth.uid(),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create table if not exists public.influencers (
  id              uuid primary key default gen_random_uuid(),
  nombre          text not null,
  ig_url          text,
  ig_handle       text,
  tiene_whatsapp  boolean not null default false,
  whatsapp        text,
  tiene_correo    boolean not null default false,
  correo          text,
  tiene_manager   boolean not null default false,
  empresa         text,
  manager_nombre  text,
  empresa_whatsapp text,
  empresa_correo  text,
  estado          text not null default 'nuevo'
                  check (estado in ('nuevo','escrito','respondio','negociando','acuerdo','descartado')),
  fecha_escrito   date,
  fecha_respondio date,
  notas           text,
  fecha_acuerdo   date,
  brand_id        uuid references public.brands(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table if not exists public.influencer_tasks (
  id            uuid primary key default gen_random_uuid(),
  influencer_id uuid not null references public.influencers(id) on delete cascade,
  texto         text,
  hecha         boolean not null default false,
  fecha_limite  date,
  created_by    uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.email_campaigns (
  id               uuid primary key default gen_random_uuid(),
  asunto           text,
  mensaje          text,
  destinatarios_json jsonb not null default '[]'::jsonb,
  fecha            date not null default current_date,
  created_by       uuid references auth.users(id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists public.incomes (
  id             uuid primary key default gen_random_uuid(),
  monto          numeric(14,2) not null default 0,
  moneda         text not null default 'DOP' check (moneda in ('DOP','USD')),
  fecha          date not null default current_date,
  categoria      text,
  client_id      uuid references public.clients(id) on delete set null,
  project_id     uuid references public.projects(id) on delete set null,
  descripcion    text,
  comprobante_url text,
  brand_id       uuid references public.brands(id) on delete set null,
  created_by     uuid references auth.users(id) on delete set null default auth.uid(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  monto       numeric(14,2) not null default 0,
  moneda      text not null default 'DOP' check (moneda in ('DOP','USD')),
  fecha       date not null default current_date,
  categoria   text,
  descripcion text,
  factura_url text,
  project_id  uuid references public.projects(id) on delete set null,
  brand_id    uuid references public.brands(id) on delete set null,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.daily_expense_log (
  id          uuid primary key default gen_random_uuid(),
  fecha       date not null default current_date unique,
  sin_gasto   boolean not null default false,
  nota        text,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id            uuid primary key default gen_random_uuid(),
  titulo        text,
  tipo          text check (tipo in ('inicio','entrega','cobro','acuerdo','personal')),
  fecha         date not null default current_date,
  client_id     uuid references public.clients(id) on delete cascade,
  project_id    uuid references public.projects(id) on delete cascade,
  color         text,
  brand_id      uuid references public.brands(id) on delete set null,
  auto_generado boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.message_templates (
  id          uuid primary key default gen_random_uuid(),
  tipo        text not null check (tipo in ('contrato','dm','whatsapp')),
  nombre      text not null,
  contenido   text,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tipo, nombre)
);

create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  nombre      text not null,
  tipo        text not null check (tipo in ('ingreso','gasto')),
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (nombre, tipo)
);

create table if not exists public.push_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  subscription_json jsonb not null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.followups (
  id            uuid primary key default gen_random_uuid(),
  entidad       text check (entidad in ('lead','proyecto','cobro')),
  entidad_id    uuid,
  motivo        text,
  fecha_sugerida date,
  atendido      boolean not null default false,
  created_by    uuid references auth.users(id) on delete set null default auth.uid(),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- AUDITORÍA: sin updated_at; es de solo-inserción (inmutable).
create table if not exists public.audit_log (
  id             uuid primary key default gen_random_uuid(),
  accion         text not null,
  tabla          text not null,
  registro_id    uuid,
  contenido_json jsonb,
  usuario_id     uuid,
  fecha          timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- FUNCIONES AUXILIARES (SECURITY DEFINER: evitan recursión de RLS)
-- ----------------------------------------------------------------------------

create or replace function public.current_rol()
returns text language sql stable security definer set search_path = public as $$
  select rol from public.users_profiles where id = auth.uid();
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rol in ('owner','colaborador') from public.users_profiles where id = auth.uid()),
    false);
$$;

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select rol = 'owner' from public.users_profiles where id = auth.uid()),
    false);
$$;

create or replace function public.my_client_id()
returns uuid language sql stable security definer set search_path = public as $$
  select client_id from public.users_profiles where id = auth.uid();
$$;

-- updated_at automático
create or replace function public.fn_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end; $$;

-- ----------------------------------------------------------------------------
-- AUDITORÍA INMUTABLE
-- ----------------------------------------------------------------------------

create or replace function public.fn_audit()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_id uuid;
  v_content jsonb;
begin
  if (tg_op = 'DELETE') then
    v_id := old.id; v_content := to_jsonb(old);
  else
    v_id := new.id; v_content := to_jsonb(new);
  end if;

  insert into public.audit_log (accion, tabla, registro_id, contenido_json, usuario_id)
  values (tg_op, tg_table_name, v_id, v_content, auth.uid());

  if (tg_op = 'DELETE') then return old; else return new; end if;
end; $$;

-- Bloqueo total de UPDATE/DELETE sobre audit_log (aplica a TODOS, incluido
-- el dueño de la tabla; solo un superusuario que desactive triggers podría
-- saltarlo). Esto hace el historial imposible de alterar desde la app.
create or replace function public.fn_block_audit_modify()
returns trigger language plpgsql as $$
begin
  raise exception 'audit_log es inmutable: no se permite % de filas de auditoría', tg_op
    using errcode = 'insufficient_privilege';
end; $$;

drop trigger if exists trg_block_audit_modify on public.audit_log;
create trigger trg_block_audit_modify
  before update or delete on public.audit_log
  for each row execute function public.fn_block_audit_modify();

-- ----------------------------------------------------------------------------
-- DISPARO AUTOMÁTICO: contrato firmado -> factura + calendario + conversión
-- ----------------------------------------------------------------------------

create or replace function public.fn_contract_signed()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_order      public.orders%rowtype;
  v_client     public.clients%rowtype;
  v_project_id uuid;
  v_entrega    date;
begin
  -- Solo al ENTRAR al estado firmado (transición), no en cada update.
  if new.estado = 'aprobado_firmado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado_firmado') then

    -- IDEMPOTENCIA: si ya existe factura para este contrato, no repetir nada.
    if exists (select 1 from public.invoices where contract_id = new.id) then
      return new;
    end if;

    select * into v_order  from public.orders  where id = new.order_id;
    select * into v_client from public.clients where id = new.client_id;

    -- Crear proyecto si aún no existe para este order.
    select id into v_project_id
      from public.projects
     where order_id = new.order_id
     limit 1;

    if v_project_id is null then
      insert into public.projects
        (client_id, order_id, nombre, tipo, precio_total, moneda,
         fecha_inicio, fecha_entrega, estado, brand_id, created_by)
      values
        (new.client_id, new.order_id,
         'Proyecto ' || coalesce(v_client.nombre, 'Cliente'),
         coalesce(v_order.rama, 'designs'),
         coalesce(v_order.total, 0),
         coalesce(v_order.moneda, 'DOP'),
         current_date,
         current_date + interval '14 days',
         'en_progreso',
         v_order.brand_id,
         auth.uid())
      returning id into v_project_id;
    end if;

    v_entrega := coalesce(
      (select fecha_entrega from public.projects where id = v_project_id),
      current_date + interval '14 days');

    -- Factura desde el order. Campos fiscales (ncf, itbis) quedan PENDIENTES:
    -- se completan en el módulo fiscal (NCF/e-CF + ITBIS). No se inventan aquí.
    insert into public.invoices
      (contract_id, client_id, es_fiscal, ncf, rnc, items_json,
       subtotal, itbis, total, moneda, estado_pago, fecha, brand_id, created_by)
    values
      (new.id, new.client_id,
       coalesce(v_client.factura_fiscal, false),
       null,                              -- NCF PENDIENTE (módulo fiscal)
       v_client.rnc,
       coalesce(v_order.detalle_json, '[]'::jsonb),
       coalesce(v_order.total, 0),
       0,                                 -- ITBIS PENDIENTE (módulo fiscal)
       coalesce(v_order.total, 0),
       coalesce(v_order.moneda, 'DOP'),
       'pendiente',
       current_date,
       v_order.brand_id,
       auth.uid());

    -- Eventos de calendario: entrega + cobro.
    insert into public.calendar_events
      (titulo, tipo, fecha, client_id, project_id, brand_id, auto_generado, created_by)
    values
      ('Entrega de proyecto', 'entrega', v_entrega, new.client_id, v_project_id,
       v_order.brand_id, true, auth.uid()),
      ('Cobro de factura',    'cobro',   v_entrega, new.client_id, v_project_id,
       v_order.brand_id, true, auth.uid());

    -- Conversión Lead -> Cliente activo.
    update public.clients set es_lead = false where id = new.client_id;
  end if;

  return new;
end; $$;

drop trigger if exists trg_contract_signed on public.contracts;
create trigger trg_contract_signed
  after insert or update on public.contracts
  for each row execute function public.fn_contract_signed();

-- Sello de fecha de aprobación al firmar (BEFORE: puede modificar NEW).
create or replace function public.fn_contract_stamp()
returns trigger language plpgsql as $$
begin
  if new.estado = 'aprobado_firmado'
     and (tg_op = 'INSERT' or old.estado is distinct from 'aprobado_firmado')
     and new.fecha_aprobacion is null then
    new.fecha_aprobacion := now();
  end if;
  return new;
end; $$;

drop trigger if exists trg_contract_stamp on public.contracts;
create trigger trg_contract_stamp
  before insert or update on public.contracts
  for each row execute function public.fn_contract_stamp();

-- ----------------------------------------------------------------------------
-- TRIGGERS GENÉRICOS (updated_at + auditoría) sobre todas las tablas de negocio
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  business_tables text[] := array[
    'brands','clients','users_profiles','orders','order_print_items',
    'contracts','invoices','projects','project_payments','project_milestones',
    'project_files','recurring_plans','quotes','print_products','influencers',
    'influencer_tasks','email_campaigns','incomes','expenses','daily_expense_log',
    'calendar_events','message_templates','categories','push_subscriptions','followups'
  ];
begin
  foreach t in array business_tables loop
    -- updated_at
    execute format('drop trigger if exists trg_touch_%1$s on public.%1$s;', t);
    execute format(
      'create trigger trg_touch_%1$s before update on public.%1$s
         for each row execute function public.fn_touch_updated_at();', t);
    -- auditoría
    execute format('drop trigger if exists trg_audit_%1$s on public.%1$s;', t);
    execute format(
      'create trigger trg_audit_%1$s after insert or update or delete on public.%1$s
         for each row execute function public.fn_audit();', t);
  end loop;
end $$;

-- ----------------------------------------------------------------------------
-- GRANTS base (RLS sigue gobernando el acceso fila por fila)
-- ----------------------------------------------------------------------------
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to authenticated;
grant all on all sequences in schema public to authenticated;
grant select on public.brands, public.print_products to anon;

-- audit_log: NADIE (authenticated/anon) puede UPDATE ni DELETE.
revoke update, delete on public.audit_log from authenticated, anon;

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
  -- Tablas de configuración: solo OWNER escribe; staff lee.
  config_tables text[] := array['brands','categories','message_templates','print_products'];
  -- Tablas operativas (staff: lectura/escritura completa).
  op_tables text[] := array[
    'orders','order_print_items','contracts','invoices','projects',
    'project_payments','project_milestones','project_files','recurring_plans',
    'quotes','influencers','influencer_tasks','email_campaigns','incomes',
    'expenses','daily_expense_log','calendar_events','followups'
  ];
  -- Tablas que el CLIENTE puede leer (portal) por client_id.
  client_read_tables text[] := array[
    'orders','contracts','invoices','projects'
  ];
begin
  -- Activar RLS en TODAS las tablas del esquema público.
  for t in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;

  -- Config: owner full, staff read.
  foreach t in array config_tables loop
    execute format('drop policy if exists owner_all_%1$s on public.%1$s;', t);
    execute format('create policy owner_all_%1$s on public.%1$s for all to authenticated
                      using (public.is_owner()) with check (public.is_owner());', t);
    execute format('drop policy if exists staff_read_%1$s on public.%1$s;', t);
    execute format('create policy staff_read_%1$s on public.%1$s for select to authenticated
                      using (public.is_staff());', t);
  end loop;

  -- Operativas: staff full.
  foreach t in array op_tables loop
    execute format('drop policy if exists staff_all_%1$s on public.%1$s;', t);
    execute format('create policy staff_all_%1$s on public.%1$s for all to authenticated
                      using (public.is_staff()) with check (public.is_staff());', t);
  end loop;

  -- Cliente: lectura de SUS registros por client_id (portal).
  foreach t in array client_read_tables loop
    execute format('drop policy if exists client_read_%1$s on public.%1$s;', t);
    execute format('create policy client_read_%1$s on public.%1$s for select to authenticated
                      using (client_id = public.my_client_id());', t);
  end loop;
end $$;

-- clients: staff full + cliente lee su propia ficha.
drop policy if exists staff_all_clients on public.clients;
create policy staff_all_clients on public.clients for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
drop policy if exists client_read_clients on public.clients;
create policy client_read_clients on public.clients for select to authenticated
  using (id = public.my_client_id());

-- project_milestones / project_files: cliente lee lo visible de sus proyectos.
drop policy if exists client_read_milestones on public.project_milestones;
create policy client_read_milestones on public.project_milestones for select to authenticated
  using (visible_cliente and project_id in
         (select id from public.projects where client_id = public.my_client_id()));

drop policy if exists client_read_files on public.project_files;
create policy client_read_files on public.project_files for select to authenticated
  using (visible_cliente and client_id = public.my_client_id());

-- calendar_events: cliente lee sus eventos.
drop policy if exists client_read_calendar on public.calendar_events;
create policy client_read_calendar on public.calendar_events for select to authenticated
  using (client_id = public.my_client_id());

-- contracts: cliente puede FIRMAR su propio contrato (update acotado) -> Fase 7.
drop policy if exists client_sign_contract on public.contracts;
create policy client_sign_contract on public.contracts for update to authenticated
  using (client_id = public.my_client_id())
  with check (client_id = public.my_client_id());

-- users_profiles: cada quien lee su perfil; staff lee todos; owner administra.
drop policy if exists self_read_profile on public.users_profiles;
create policy self_read_profile on public.users_profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
drop policy if exists owner_manage_profiles on public.users_profiles;
create policy owner_manage_profiles on public.users_profiles for all to authenticated
  using (public.is_owner()) with check (public.is_owner());

-- push_subscriptions: cada usuario gestiona las suyas.
drop policy if exists self_push on public.push_subscriptions;
create policy self_push on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- audit_log: staff LEE; INSERT permitido (lo hace la función SECURITY DEFINER);
-- SIN políticas de update/delete (+ revoke + trigger de bloqueo arriba).
drop policy if exists staff_read_audit on public.audit_log;
create policy staff_read_audit on public.audit_log for select to authenticated
  using (public.is_staff());
drop policy if exists insert_audit on public.audit_log;
create policy insert_audit on public.audit_log for insert to authenticated
  with check (true);

-- FIN 001_schema.sql

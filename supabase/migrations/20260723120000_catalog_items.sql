-- ============================================================================
-- JM CONTROL CENTER — Catálogo editable por marca (para el flujo "Nuevo pedido")
-- AGREGA la tabla catalog_items (items/servicios por marca). NO toca
-- print_products ni ningún dato existente. Money en NUMERIC. RLS staff + audit.
-- ============================================================================

create table if not exists public.catalog_items (
  id          uuid primary key default gen_random_uuid(),
  brand_id    uuid references public.brands(id) on delete cascade,
  nombre      text not null,
  categoria   text,
  precio_base numeric(14,2) not null default 0,
  moneda      text not null default 'DOP' check (moneda in ('DOP','USD')),
  unidad      text,                    -- ej. "unidad", "millar", "proyecto"
  descripcion text,
  activo      boolean not null default true,
  orden       int not null default 0,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.catalog_items enable row level security;

drop policy if exists staff_catalog_items on public.catalog_items;
create policy staff_catalog_items on public.catalog_items for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant all on public.catalog_items to authenticated;

create index if not exists catalog_items_brand_idx on public.catalog_items (brand_id, activo, orden);

drop trigger if exists trg_touch_catalog_items on public.catalog_items;
create trigger trg_touch_catalog_items before update on public.catalog_items
  for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_audit_catalog_items on public.catalog_items;
create trigger trg_audit_catalog_items after insert or update or delete on public.catalog_items
  for each row execute function public.fn_audit();

-- Semillas iniciales (editables/borrables por el owner). Solo si la marca no
-- tiene ya items, para no duplicar en re-ejecuciones.
insert into public.catalog_items (brand_id, nombre, categoria, unidad, orden)
select b.id, x.nombre, x.categoria, x.unidad, x.orden
from public.brands b
cross join (values
  ('Camisetas (t-shirts)', 'Textil', 'unidad', 1),
  ('Gorras', 'Textil', 'unidad', 2),
  ('Bordados', 'Textil', 'unidad', 3),
  ('Papelería', 'Imprenta', 'millar', 4),
  ('Promocionales', 'Promocional', 'unidad', 5)
) as x(nombre, categoria, unidad, orden)
where b.nombre ilike '%distribution%'
  and not exists (select 1 from public.catalog_items c where c.brand_id = b.id);

insert into public.catalog_items (brand_id, nombre, categoria, unidad, orden)
select b.id, x.nombre, x.categoria, x.unidad, x.orden
from public.brands b
cross join (values
  ('Landing page', 'Web', 'proyecto', 1),
  ('Sitio web', 'Web', 'proyecto', 2),
  ('E-commerce', 'Web', 'proyecto', 3),
  ('App móvil', 'App', 'proyecto', 4),
  ('Sistema a medida', 'Software', 'proyecto', 5)
) as x(nombre, categoria, unidad, orden)
where b.nombre ilike '%designs%'
  and not exists (select 1 from public.catalog_items c where c.brand_id = b.id);

-- FIN

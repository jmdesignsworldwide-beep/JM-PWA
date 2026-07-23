-- ============================================================================
-- JM CONTROL CENTER — Categorías personales (Bloque 5.4)
-- Separa las categorías de gasto PERSONAL de las del NEGOCIO sin tocar nada de
-- lo ya registrado. La columna nueva entra con default false, así TODAS las
-- categorías actuales quedan como "negocio" (es_personal = false) sin cambiar.
-- Luego siembra un set común de categorías personales RD (idempotente).
-- No mueve ni borra ningún dato existente.
-- ============================================================================

-- 1) Columna nueva: marca si la categoría es del gasto personal del owner.
alter table public.categories
  add column if not exists es_personal boolean not null default false;

-- 2) Siembra categorías personales comunes (solo si no existen ya como personal).
insert into public.categories (nombre, tipo, es_personal)
select v.nombre, 'gasto', true
from (values ('Comida'), ('Transporte'), ('Salud'), ('Hogar'), ('Personal'), ('Ocio')) as v(nombre)
where not exists (
  select 1 from public.categories c
  where lower(c.nombre) = lower(v.nombre) and c.es_personal = true
);

-- FIN

-- ============================================================================
-- JM CONTROL CENTER — Simplificar los estados del pedido a TRES
-- ----------------------------------------------------------------------------
-- Antes: borrador / confirmado / en_proceso / completado / cancelado (def. borrador)
-- Ahora: activo / completado / cancelado (def. activo)
--
-- Un pedido nuevo nace "activo" (ya no "borrador"). Los existentes en borrador,
-- confirmado o en_proceso se migran a "activo". Sin pérdida de datos.
-- ============================================================================

-- 1) Quitar el check viejo para poder mover los datos.
alter table public.orders drop constraint if exists orders_estado_check;

-- 2) Nuevo default.
alter table public.orders alter column estado set default 'activo';

-- 3) Migrar los estados retirados a "activo" (completado/cancelado se conservan).
update public.orders
   set estado = 'activo'
 where estado in ('borrador', 'confirmado', 'en_proceso');

-- 4) Nuevo check con los tres estados.
alter table public.orders
  add constraint orders_estado_check
  check (estado in ('activo', 'completado', 'cancelado'));
-- FIN

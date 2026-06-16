-- ============================================================================
-- JM CONTROL CENTER — categoria_servicio: 4 opciones
-- Web, Software, App, JM Distribution  (valores: web, software, app, distribution)
-- ============================================================================

alter table public.clients drop constraint if exists clients_categoria_servicio_check;

-- Migra cualquier valor viejo 'ambos' a 'software' antes de re-restringir.
update public.clients set categoria_servicio = 'software' where categoria_servicio = 'ambos';

alter table public.clients add constraint clients_categoria_servicio_check
  check (categoria_servicio in ('web','software','app','distribution'));

-- FIN

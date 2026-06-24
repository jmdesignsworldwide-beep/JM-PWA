-- ============================================================================
-- JM CONTROL CENTER — visibilidad de módulos del menú (control del owner)
-- Lista de hrefs de módulos ocultos en la navegación. Los owners siguen viendo
-- TODOS los datos (esto solo afecta qué ítems aparecen en el menú).
-- ============================================================================
alter table public.app_settings
  add column if not exists modulos_ocultos jsonb not null default '[]'::jsonb;
-- FIN

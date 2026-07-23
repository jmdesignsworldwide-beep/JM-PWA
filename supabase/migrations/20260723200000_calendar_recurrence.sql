-- ============================================================================
-- JM CONTROL CENTER — Eventos recurrentes del calendario (patrón, no filas)
-- Un evento que se repite guarda SOLO su patrón en la fila "maestra"; las
-- ocurrencias se generan en código al leer un rango. Editar/borrar una sola
-- ocurrencia crea a lo sumo UNA fila de excepción (hija). No se crea una fila
-- por repetición → la base no crece con miles de filas.
--
-- 100% aditivo: columnas nuevas nullable/default. Los eventos actuales quedan
-- como únicos (recurrence = null). Cero pérdida de datos.
-- ============================================================================

alter table public.calendar_events
  add column if not exists recurrence text;                 -- null | semanal | quincenal | mensual | anual

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'calendar_events_recurrence_chk') then
    alter table public.calendar_events
      add constraint calendar_events_recurrence_chk
      check (recurrence in ('semanal','quincenal','mensual','anual'));
  end if;
end $$;

alter table public.calendar_events
  add column if not exists recurrence_until date,            -- fin opcional de la serie
  add column if not exists recurrence_parent_id uuid
    references public.calendar_events(id) on delete cascade, -- excepción -> serie maestra
  add column if not exists recurrence_skip boolean not null default false; -- excepción que oculta esa fecha

create index if not exists calendar_events_recurrence_parent_idx
  on public.calendar_events (recurrence_parent_id);
create index if not exists calendar_events_recurrence_idx
  on public.calendar_events (recurrence) where recurrence is not null;

-- FIN

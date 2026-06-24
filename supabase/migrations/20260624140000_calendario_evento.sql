-- ============================================================================
-- JM CONTROL CENTER — Calendario: eventos más completos
-- Hora, link de reunión, ubicación, descripción y recordatorio.
-- ============================================================================
alter table public.calendar_events
  add column if not exists hora            text,        -- "HH:MM"
  add column if not exists meeting_url      text,
  add column if not exists ubicacion        text,
  add column if not exists descripcion      text,
  add column if not exists recordatorio_min integer;     -- minutos antes (aviso)
-- FIN

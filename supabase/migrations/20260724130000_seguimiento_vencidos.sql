-- ============================================================================
-- JM CONTROL CENTER — Seguimiento de eventos del calendario vencidos
-- ----------------------------------------------------------------------------
-- Cuando un evento del calendario pasa su fecha SIN marcarse como completado,
-- entra en un ciclo de "reproches": ese día se pregunta 3 veces (mañana,
-- mediodía y noche) si se hizo. Si no hay respuesta ese día, deja de recordar y
-- vuelve a preguntar a los 15 días (mismo ciclo). Si se mueve a otra fecha y
-- sigue sin completarse, el ciclo se reinicia desde la fecha nueva.
--
-- El campo `completado` YA existe (migración 20260615150000_cobros_calendario).
-- Aquí solo agregamos el ESTADO del seguimiento. Sin pérdida de datos: son
-- columnas nuevas con `if not exists` y valores por defecto.
-- ============================================================================
alter table public.calendar_events
  -- Si el evento participa del ciclo de reproches. Se apaga al completarse.
  add column if not exists seguimiento_activo       boolean not null default true,
  -- Próximo día en que toca preguntar (se siembra el día que se detecta vencido;
  -- si no hay respuesta ese día, salta +15). null = aún no sembrado.
  add column if not exists seguimiento_prox          date,
  -- Último día en que ya se avisó (evita duplicar dentro del mismo día).
  add column if not exists seguimiento_ultimo_aviso  date;

-- Índice para que el cron encuentre rápido los vencidos que siguen en cola.
create index if not exists idx_calendar_events_seguimiento
  on public.calendar_events (fecha)
  where completado = false and recurrence is null and seguimiento_activo;
-- FIN

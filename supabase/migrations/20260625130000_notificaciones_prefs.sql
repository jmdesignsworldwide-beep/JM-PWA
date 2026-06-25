-- ============================================================================
-- JM CONTROL CENTER — Preferencias de notificaciones (controladas por el owner)
-- Por cada TIPO de aviso, el owner elige si le llega por push y/o por correo.
-- Todo vive en app_settings (config global del negocio). Migración aditiva.
-- Canales por defecto: correo ON (base confiable) + push ON (complemento; igual
-- requiere activar push en el dispositivo, si no, no-op).
-- ============================================================================

alter table public.app_settings
  add column if not exists notif_eventos_push      boolean not null default true,
  add column if not exists notif_eventos_email     boolean not null default true,
  add column if not exists notif_cobros_push       boolean not null default true,
  add column if not exists notif_cobros_email      boolean not null default true,
  add column if not exists notif_entregas_push     boolean not null default true,
  add column if not exists notif_entregas_email    boolean not null default true,
  add column if not exists notif_tareas_push       boolean not null default true,
  add column if not exists notif_tareas_email      boolean not null default true,
  add column if not exists notif_influencers_push  boolean not null default true,
  add column if not exists notif_influencers_email boolean not null default true,
  add column if not exists notif_resumen_push      boolean not null default true,
  add column if not exists notif_resumen_email     boolean not null default true,
  -- control de "ya envié el resumen hoy" para honrar la hora elegida con cron horario
  add column if not exists resumen_ultimo_envio    date;

-- FIN

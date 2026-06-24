-- ============================================================================
-- JM CONTROL CENTER — Colaboración con influencers (intercambio)
-- Multi-plataforma + lo que JM entrega + lo que el influencer entrega +
-- estado del trato. Plataformas y promos como jsonb (rápido de llenar).
-- ============================================================================
alter table public.influencers
  add column if not exists nicho             text,
  add column if not exists plataformas       jsonb not null default '[]'::jsonb,
  add column if not exists estado_trato      text not null default 'propuesto'
    check (estado_trato in ('propuesto','acordado','activo','completado','no_concreto')),
  add column if not exists doy_tipo          text,
  add column if not exists doy_desc          text,
  add column if not exists doy_valor         numeric(14,2),
  add column if not exists doy_moneda        text not null default 'DOP' check (doy_moneda in ('DOP','USD')),
  add column if not exists doy_fecha_entrega date,
  add column if not exists promos            jsonb not null default '[]'::jsonb;
-- FIN

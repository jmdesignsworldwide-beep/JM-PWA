-- ============================================================================
-- JM CONTROL CENTER — Handles sociales clicables
-- Agrega Instagram y Facebook a clientes/prospectos (tabla clients) y Facebook
-- a influencers (ya tienen IG y WhatsApp). Migración aditiva: no toca datos.
-- ============================================================================

alter table public.clients
  add column if not exists instagram text,
  add column if not exists facebook  text;

comment on column public.clients.instagram is 'Handle o URL de Instagram (@usuario o instagram.com/usuario).';
comment on column public.clients.facebook  is 'Handle o URL de Facebook (usuario o facebook.com/usuario).';

alter table public.influencers
  add column if not exists facebook_url text;

comment on column public.influencers.facebook_url is 'Handle o URL de Facebook del influencer.';

-- FIN

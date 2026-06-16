-- ============================================================================
-- JM CONTROL CENTER — datos de empresa por marca (para PDFs/logo)
-- ============================================================================
alter table public.brands
  add column if not exists rnc       text,
  add column if not exists telefono  text,
  add column if not exists direccion text,
  add column if not exists logo_url  text;
-- FIN

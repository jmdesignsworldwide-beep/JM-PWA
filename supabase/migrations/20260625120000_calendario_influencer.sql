-- ============================================================================
-- JM CONTROL CENTER — Calendario ligado a influencers
-- Permite ligar un evento del calendario a un influencer (igual que a un
-- cliente/proyecto). Lo usa la entrega automática de sistemas/web acordados con
-- influencers y el buscador de influencer en el formulario de evento.
-- Migración aditiva.
-- ============================================================================

alter table public.calendar_events
  add column if not exists influencer_id uuid references public.influencers(id) on delete cascade;

create index if not exists calendar_events_influencer_id_idx on public.calendar_events (influencer_id);

comment on column public.calendar_events.influencer_id is 'Influencer ligado al evento (entrega de sistema/web, reunión, etc.). NULL si no aplica.';

-- FIN

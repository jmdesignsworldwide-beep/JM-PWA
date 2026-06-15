-- ============================================================================
-- JM CONTROL CENTER — valor_estimado en leads/clientes
-- Agrega un monto estimado OPCIONAL al lead (para mostrarlo en el Kanban).
-- Es solo una referencia; cuando lleguen pedidos/cotizaciones reales (Fase 4/6),
-- el valor real manda. Idempotente.
-- ============================================================================

alter table public.clients
  add column if not exists valor_estimado numeric(14,2),
  add column if not exists valor_estimado_moneda text not null default 'DOP'
    check (valor_estimado_moneda in ('DOP','USD'));

-- FIN

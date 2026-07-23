-- ============================================================================
-- JM CONTROL CENTER — Comprobante de pago del cliente (captura/voucher)
-- AGREGA order_payments.comprobante_url para adjuntar la prueba del pago
-- (transferencia/voucher que el cliente manda por WhatsApp). El archivo vive en
-- el bucket privado `comprobantes` (ya existente); se lee con URL firmada.
-- No toca ningún dato existente (columna nueva queda null).
-- ============================================================================

alter table public.order_payments
  add column if not exists comprobante_url text;

-- FIN

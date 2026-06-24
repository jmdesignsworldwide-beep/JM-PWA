-- ============================================================================
-- JM CONTROL CENTER — Escaneo de recibos + Negocio vs Personal
-- Amplía `expenses` con los datos que la IA (Gemini Vision) extrae del recibo
-- y separa el gasto de NEGOCIO del PERSONAL (se mantienen separados en los
-- números del negocio). Migración aditiva: las filas existentes quedan intactas.
-- ============================================================================

alter table public.expenses
  add column if not exists comercio    text,
  add column if not exists itbis       numeric(14,2),
  add column if not exists metodo_pago text,
  add column if not exists es_personal boolean not null default false;

comment on column public.expenses.comercio    is 'Comercio/proveedor leído del recibo (IA). NULL si no se lee claro.';
comment on column public.expenses.itbis        is 'ITBIS del recibo si aparece (IA). NULL si no aparece.';
comment on column public.expenses.metodo_pago  is 'Método de pago: efectivo/tarjeta/transferencia (IA). NULL si no se lee.';
comment on column public.expenses.es_personal  is 'true = gasto PERSONAL (no cuenta en los números del negocio). false = NEGOCIO.';

-- Índice para filtrar negocio vs personal en los resúmenes financieros.
create index if not exists expenses_es_personal_idx on public.expenses (es_personal);

-- FIN

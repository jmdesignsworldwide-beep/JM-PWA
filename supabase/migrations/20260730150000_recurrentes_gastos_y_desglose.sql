-- ============================================================================
-- JM CONTROL CENTER — Finanzas: recurrentes (ingresos Y gastos) + desglose
-- A8: recurring_plans deja de ser solo "ingresos de cliente". Ahora modela
--   también GASTOS recurrentes (casa, luz, agua) y movimientos PERSONALES.
--   · clase: ingreso | gasto        · es_personal: Negocio vs Personal
--   · categoria/concepto: para gastos sin cliente     · client_id ahora nullable
--   · frecuencia: se añade 'quincenal'
-- A6: expenses.lineas_json guarda el desglose línea por línea que leyó el
--   escáner (o el detalle manual), igual patrón que invoices.items_json.
-- Aditivo, owner-only ya existente. Money en NUMERIC.
-- ============================================================================

-- ── A8: recurring_plans ─────────────────────────────────────────────────────
alter table public.recurring_plans
  add column if not exists clase       text not null default 'ingreso' check (clase in ('ingreso','gasto')),
  add column if not exists es_personal boolean not null default false,
  add column if not exists categoria   text,
  add column if not exists concepto    text;

-- Gastos/personal no llevan cliente.
alter table public.recurring_plans alter column client_id drop not null;

-- Añadir 'quincenal' a la frecuencia.
alter table public.recurring_plans drop constraint if exists recurring_plans_frecuencia_check;
alter table public.recurring_plans
  add constraint recurring_plans_frecuencia_check
  check (frecuencia in ('quincenal','mensual','trimestral','anual'));

-- ── A6: desglose de gasto (líneas del escáner / detalle manual) ──────────────
alter table public.expenses add column if not exists lineas_json jsonb;

-- FIN

-- ============================================================================
-- JM CONTROL CENTER — Negocio vs Personal también en ingresos
-- `expenses` ya tiene es_personal; lo agregamos a `incomes` para poder separar
-- las finanzas de NEGOCIO de las PERSONALES de forma simétrica (totales,
-- gráficos y categorías respetan el filtro). Migración aditiva.
-- ============================================================================

alter table public.incomes
  add column if not exists es_personal boolean not null default false;

comment on column public.incomes.es_personal is 'true = ingreso PERSONAL (fuera de los números del negocio). false = NEGOCIO.';

create index if not exists incomes_es_personal_idx on public.incomes (es_personal);

-- FIN

-- ============================================================================
-- JM CONTROL CENTER — Pagos del cliente (abonos por pedido), control total
-- Registro manual de pagos/abonos contra un PEDIDO. El saldo se calcula como
-- total del pedido − suma de abonos. NUMERIC. Separado de team_payments.
-- ============================================================================

create table if not exists public.order_payments (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders(id) on delete cascade,
  client_id   uuid not null references public.clients(id) on delete cascade,
  monto       numeric(14,2) not null default 0,
  moneda      text not null default 'DOP' check (moneda in ('DOP','USD')),
  fecha       date not null default current_date,
  metodo      text,
  tipo        text not null default 'abono' check (tipo in ('inicial','entrega','abono')),
  nota        text,
  created_by  uuid references auth.users(id) on delete set null default auth.uid(),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.order_payments enable row level security;

drop policy if exists staff_order_payments on public.order_payments;
create policy staff_order_payments on public.order_payments for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

grant all on public.order_payments to authenticated;

create index if not exists order_payments_order_idx  on public.order_payments (order_id);
create index if not exists order_payments_client_idx on public.order_payments (client_id);

-- updated_at + auditoría (es dinero: queda registrado en audit_log).
drop trigger if exists trg_touch_order_payments on public.order_payments;
create trigger trg_touch_order_payments before update on public.order_payments
  for each row execute function public.fn_touch_updated_at();

drop trigger if exists trg_audit_order_payments on public.order_payments;
create trigger trg_audit_order_payments after insert or update or delete on public.order_payments
  for each row execute function public.fn_audit();

-- FIN

-- ============================================================================
-- JM CONTROL CENTER — Contrato OPCIONAL: factura/recibo directo desde el pedido
-- No todos los pedidos llevan contrato. Esta migración permite ligar una
-- factura o recibo DIRECTAMENTE al pedido (sin contrato), manteniendo el
-- contrato disponible para cuando sí se quiera.
-- ============================================================================

-- 1) Enlace directo factura ↔ pedido (sin pasar por contrato).
alter table public.invoices
  add column if not exists order_id uuid references public.orders(id) on delete set null;

create index if not exists invoices_order_idx on public.invoices (order_id);

-- 2) Backfill: las facturas existentes (creadas vía contrato) heredan su pedido.
update public.invoices i
  set order_id = c.order_id
  from public.contracts c
  where i.contract_id = c.id and i.order_id is null;

-- 3) Toda factura creada desde un contrato hereda el order_id automáticamente,
--    sin tocar el gran trigger de firma. BEFORE INSERT => sin recursión.
create or replace function public.fn_invoice_fill_order()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.order_id is null and new.contract_id is not null then
    select order_id into new.order_id from public.contracts where id = new.contract_id;
  end if;
  return new;
end; $$;

drop trigger if exists trg_invoice_fill_order on public.invoices;
create trigger trg_invoice_fill_order
  before insert on public.invoices
  for each row execute function public.fn_invoice_fill_order();

-- FIN

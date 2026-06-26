import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Order = Row<"orders">;
export type OrderItem = Row<"order_print_items">;
export type OrderNote = Row<"order_notes">;
export type Contract = Row<"contracts">;
export type Invoice = Row<"invoices">;
export type OrderPayment = Row<"order_payments">;

/** Pedido con todo lo conectado: cliente, items, hilo, contrato y factura. */
export async function getOrderFull(id: string) {
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!order) return null;

  const [client, items, notes, contractRes, brand, paymentsRes] = await Promise.all([
    supabase.from("clients").select("*").eq("id", order.client_id).maybeSingle(),
    supabase.from("order_print_items").select("*").eq("order_id", id).order("created_at"),
    supabase.from("order_notes").select("*").eq("order_id", id).order("created_at", { ascending: true }),
    supabase.from("contracts").select("*").eq("order_id", id).order("created_at", { ascending: false }).limit(1),
    order.brand_id
      ? supabase.from("brands").select("nombre").eq("id", order.brand_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("order_payments").select("*").eq("order_id", id).order("fecha", { ascending: false }),
  ]);

  const contract = (contractRes.data?.[0] as Contract | undefined) ?? null;

  // Factura/recibo: directo por order_id (sin contrato) o vía contrato (legado).
  let invoice: Invoice | null = null;
  {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("order_id", id)
      .order("created_at", { ascending: false })
      .limit(1);
    invoice = (data?.[0] as Invoice | undefined) ?? null;
  }
  if (!invoice && contract) {
    const { data } = await supabase
      .from("invoices")
      .select("*")
      .eq("contract_id", contract.id)
      .order("created_at", { ascending: false })
      .limit(1);
    invoice = (data?.[0] as Invoice | undefined) ?? null;
  }

  // El "trabajo" del pedido vive en su registro de proyecto (1:1 con el pedido).
  // El owner gestiona el progreso desde el pedido; el cliente lo ve en su portal.
  const { data: projRows } = await supabase
    .from("projects")
    .select("*")
    .eq("order_id", id)
    .order("created_at", { ascending: true })
    .limit(1);
  const project = (projRows?.[0] as Row<"projects"> | undefined) ?? null;

  let milestones: Row<"project_milestones">[] = [];
  let updates: Row<"project_updates">[] = [];
  if (project) {
    const [ms, ups] = await Promise.all([
      supabase.from("project_milestones").select("*").eq("project_id", project.id).order("orden", { ascending: true }),
      supabase.from("project_updates").select("*").eq("project_id", project.id).order("created_at", { ascending: false }),
    ]);
    milestones = (ms.data ?? []) as Row<"project_milestones">[];
    updates = (ups.data ?? []) as Row<"project_updates">[];
  }

  return {
    order: order as Order,
    client: client.data,
    items: (items.data ?? []) as OrderItem[],
    notes: (notes.data ?? []) as OrderNote[],
    contract,
    invoice,
    brandName: brand.data?.nombre ?? null,
    payments: (paymentsRes.data ?? []) as OrderPayment[],
    project,
    milestones,
    updates,
  };
}

/** Pedidos de un cliente (para la pestaña Pedidos). */
export async function getOrdersByClient(clientId: string): Promise<Order[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Order[];
}

/** Pedidos recientes (todos los clientes) con nombre de cliente, para el índice. */
export async function getRecentOrders(limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, client_id, rama, estado, total, moneda, fecha, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  const orders = (data ?? []) as Pick<Order, "id" | "client_id" | "rama" | "estado" | "total" | "moneda" | "fecha">[];

  const ids = [...new Set(orders.map((o) => o.client_id))];
  let nameMap = new Map<string, string>();
  if (ids.length) {
    const { data: cls } = await supabase.from("clients").select("id, nombre, apellido").in("id", ids);
    nameMap = new Map((cls ?? []).map((c) => [c.id, `${c.nombre} ${c.apellido ?? ""}`.trim()]));
  }
  return orders.map((o) => ({ ...o, clienteNombre: nameMap.get(o.client_id) ?? "Cliente" }));
}

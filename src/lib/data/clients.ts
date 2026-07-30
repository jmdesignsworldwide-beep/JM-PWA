import { createClient } from "@/lib/supabase/server";
import { conceptoDePedido, itemsDePedido } from "@/lib/pedido-concepto";
import type { Row } from "@/lib/database.types";

export type Client = Row<"clients">;
export type ContactBank = Row<"contact_bank">;

/**
 * Datos bancarios NO sensibles del contacto (banco, titular, tipo, últimos 4).
 * El número completo NUNCA se lee aquí: se cifra en la BD y solo se revela con
 * el PIN vía RPC (revealBank). Devuelve null si el contacto no tiene datos.
 */
export async function getContactBank(clientId: string): Promise<ContactBank | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("contact_bank")
    .select("id, client_id, banco, tipo_cuenta, titular, cedula_rnc, numero_ultimos4, created_by, created_at, updated_at")
    .eq("client_id", clientId)
    .maybeSingle();
  return (data as ContactBank | null) ?? null;
}

/** Leads (es_lead = true) para el pipeline. */
export async function getLeads(): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("es_lead", true)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

/**
 * Clientes de NEGOCIO (clientes + prospectos), EXCLUYE los contactos Personal.
 * Es la que usan los selectores de pedidos/cobros/finanzas: a un Personal no se
 * le vende, solo se le debe.
 */
export async function getClients(): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("es_personal", false)
    .order("updated_at", { ascending: false });
  return data ?? [];
}

/** Marcas/categorías/industrias de un contacto DERIVADAS de sus pedidos. */
export type ContactAgg = {
  brandIds: string[];
  /** Categoría REAL de cada pedido, etiquetada con la marca de ese pedido. */
  pairs: { brand: string | null; cat: string }[];
  industrias: string[];
};

/**
 * Un cliente puede comprar en VARIAS marcas: aquí derivamos de sus pedidos el
 * conjunto de marcas/categorías/industrias con las que ha trabajado (multi-marca).
 * Sin migración. La categoría REAL sale de cada pedido, ligada a su marca:
 *   · Designs → `tipo_solucion` (Sitio web, App móvil, …)
 *   · Imprenta/Distribution/KitJoy → categoría del ítem (`order_print_items.categoria`:
 *     Gorras, Papelería, …)
 * Así al filtrar por una marca solo se ofrecen las categorías que esa marca usa.
 */
export async function getContactAggregates(): Promise<Record<string, ContactAgg>> {
  const supabase = await createClient();
  const [{ data: orders }, { data: prints }] = await Promise.all([
    supabase.from("orders").select("id, client_id, brand_id, rama, tipo_solucion, industria"),
    supabase.from("order_print_items").select("order_id, categoria"),
  ]);
  type O = { id: string; client_id: string; brand_id: string | null; rama: string | null; tipo_solucion: string | null; industria: string | null };
  const ords = (orders ?? []) as O[];
  const orderById = new Map(ords.map((o) => [o.id, o]));

  const acc: Record<string, { brandIds: Set<string>; pairs: Map<string, { brand: string | null; cat: string }>; industrias: Set<string> }> = {};
  const ensure = (id: string) => (acc[id] ??= { brandIds: new Set(), pairs: new Map(), industrias: new Set() });
  const addPair = (a: { pairs: Map<string, { brand: string | null; cat: string }> }, brand: string | null, cat: string | null) => {
    const c = cat?.trim();
    if (c) a.pairs.set(`${brand ?? ""}|${c}`, { brand: brand ?? null, cat: c });
  };

  for (const o of ords) {
    const a = ensure(o.client_id);
    if (o.brand_id) a.brandIds.add(o.brand_id);
    if (o.rama === "designs") addPair(a, o.brand_id, o.tipo_solucion);
    if (o.industria) a.industrias.add(o.industria);
  }
  for (const p of (prints ?? []) as { order_id: string; categoria: string | null }[]) {
    const o = orderById.get(p.order_id);
    if (o) addPair(ensure(o.client_id), o.brand_id, p.categoria);
  }

  return Object.fromEntries(
    Object.entries(acc).map(([id, a]) => [id, {
      brandIds: [...a.brandIds], pairs: [...a.pairs.values()], industrias: [...a.industrias],
    }]),
  );
}

/** TODOS los contactos (clientes + prospectos + personales) para la lista. */
export async function getContacts(): Promise<Client[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .order("updated_at", { ascending: false });
  return data ?? [];
}

export async function getClientById(id: string): Promise<Client | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

/** Marcas (para selectores y mostrar nombre). */
export async function getBrands() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("brands")
    .select("id, nombre")
    .order("nombre");
  return data ?? [];
}

/** Conteos del ciclo de vida del cliente (para la barra y pestañas). */
export async function getClientStats(clientId: string) {
  const supabase = await createClient();
  const [orders, contracts, invoices, projects, payments] = await Promise.all([
    supabase.from("orders").select("id, estado, total, moneda, fecha, detalle_json, tipo_solucion, industria, rama").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, estado, fecha_aprobacion").eq("client_id", clientId),
    supabase.from("invoices").select("id, estado_pago, total, moneda, fecha").eq("client_id", clientId),
    supabase.from("projects").select("id, nombre, estado, fecha_entrega").eq("client_id", clientId),
    // Abonos del cliente (pagos contra sus pedidos): control de saldo.
    supabase.from("order_payments")
      .select("id, order_id, monto, moneda, fecha, tipo, metodo, nota, comprobante_url")
      .eq("client_id", clientId)
      .order("fecha", { ascending: false }),
  ]);
  const ordersFull = ((orders.data ?? []) as { id: string; estado: string; total: number; moneda: string; fecha: string; detalle_json: unknown; tipo_solucion: string | null; industria: string | null; rama: string }[])
    .map((o) => ({ id: o.id, estado: o.estado, total: o.total, moneda: o.moneda, fecha: o.fecha, concepto: conceptoDePedido(o), items: itemsDePedido(o.detalle_json) }));
  return {
    orders: ordersFull,
    contracts: contracts.data ?? [],
    invoices: invoices.data ?? [],
    projects: projects.data ?? [],
    payments: payments.data ?? [],
  };
}

/** Proyectos del cliente con su línea de tiempo (hitos) y feed de actualizaciones. */
export async function getClientProjectsFull(clientId: string) {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("projects")
    .select("id, nombre, estado, fecha_inicio, fecha_entrega, precio_total, moneda")
    .eq("client_id", clientId)
    .order("created_at", { ascending: true });
  const ids = (projects ?? []).map((p) => p.id);
  const [ms, ups] = await Promise.all([
    ids.length
      ? supabase.from("project_milestones").select("*").in("project_id", ids).order("orden", { ascending: true })
      : Promise.resolve({ data: [] as Row<"project_milestones">[] }),
    supabase.from("project_updates").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
  ]);
  return {
    projects: projects ?? [],
    milestones: (ms.data ?? []) as Row<"project_milestones">[],
    updates: (ups.data ?? []) as Row<"project_updates">[],
  };
}

/** Documentos (bóveda) de un cliente. */
export async function getClientFiles(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("project_files")
    .select("*")
    .eq("client_id", clientId)
    .order("created_at", { ascending: false });
  return data ?? [];
}

/** Actividad (auditoría) de un cliente. */
export async function getClientActivity(clientId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, accion, tabla, fecha")
    .eq("tabla", "clients")
    .eq("registro_id", clientId)
    .order("fecha", { ascending: false })
    .limit(50);
  return data ?? [];
}

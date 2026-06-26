import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Client = Row<"clients">;

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

/** Todos los clientes (leads + activos) para la lista. */
export async function getClients(): Promise<Client[]> {
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
    supabase.from("orders").select("id, estado, total, moneda, fecha").eq("client_id", clientId).order("created_at", { ascending: false }),
    supabase.from("contracts").select("id, estado, fecha_aprobacion").eq("client_id", clientId),
    supabase.from("invoices").select("id, estado_pago, total, moneda, fecha").eq("client_id", clientId),
    supabase.from("projects").select("id, nombre, estado, fecha_entrega").eq("client_id", clientId),
    // Abonos del cliente (pagos contra sus pedidos): control de saldo.
    supabase.from("order_payments")
      .select("id, order_id, monto, moneda, fecha, tipo, metodo, nota")
      .eq("client_id", clientId)
      .order("fecha", { ascending: false }),
  ]);
  return {
    orders: orders.data ?? [],
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

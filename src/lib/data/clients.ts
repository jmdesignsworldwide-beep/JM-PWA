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
    supabase.from("orders").select("id, estado, total, moneda, fecha").eq("client_id", clientId),
    supabase.from("contracts").select("id, estado, fecha_aprobacion").eq("client_id", clientId),
    supabase.from("invoices").select("id, estado_pago, total, moneda, fecha").eq("client_id", clientId),
    supabase.from("projects").select("id, nombre, estado, fecha_entrega").eq("client_id", clientId),
    supabase.from("project_payments").select("id, monto, moneda, fecha").in(
      "project_id",
      (
        await supabase.from("projects").select("id").eq("client_id", clientId)
      ).data?.map((p) => p.id) ?? ["00000000-0000-0000-0000-000000000000"],
    ),
  ]);
  return {
    orders: orders.data ?? [],
    contracts: contracts.data ?? [],
    invoices: invoices.data ?? [],
    projects: projects.data ?? [],
    payments: payments.data ?? [],
  };
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

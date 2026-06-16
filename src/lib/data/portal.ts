import { createClient } from "@/lib/supabase/server";
import { currentLifecycleStep } from "@/lib/data/lifecycle";
import type { Row } from "@/lib/database.types";

/**
 * Datos del portal para el cliente autenticado. La RLS garantiza que solo
 * puede leer SUS registros; además filtramos por su client_id.
 */
export async function getPortalData(clientId: string) {
  const supabase = await createClient();

  const [clientRes, projects, milestones, files, invoices, contracts, payments, brand] =
    await Promise.all([
      supabase.from("clients").select("*").eq("id", clientId).maybeSingle(),
      supabase.from("projects").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("project_milestones").select("*").eq("visible_cliente", true).order("fecha", { ascending: true }),
      supabase.from("project_files").select("*").eq("client_id", clientId).eq("visible_cliente", true),
      supabase.from("invoices").select("*").eq("client_id", clientId).order("fecha", { ascending: false }),
      supabase.from("contracts").select("*").eq("client_id", clientId).order("created_at", { ascending: false }),
      supabase.from("project_payments").select("*").in(
        "project_id",
        (await supabase.from("projects").select("id").eq("client_id", clientId)).data?.map((p) => p.id) ?? ["00000000-0000-0000-0000-000000000000"],
      ),
      supabase.from("clients").select("brand_id").eq("id", clientId).maybeSingle(),
    ]);

  const client = clientRes.data as Row<"clients"> | null;
  let brandName: string | null = null;
  if (brand.data?.brand_id) {
    const { data } = await supabase.from("brands").select("nombre").eq("id", brand.data.brand_id).maybeSingle();
    brandName = data?.nombre ?? null;
  }

  const inv = (invoices.data ?? []) as Row<"invoices">[];
  const pay = (payments.data ?? []) as Row<"project_payments">[];
  const totalFacturado = inv.reduce((s, i) => s + Number(i.total), 0);
  const totalPagado = pay.reduce((s, p) => s + Number(p.monto), 0);

  const step = client
    ? currentLifecycleStep(client, {
        orders: [],
        contracts: (contracts.data ?? []) as { id: string }[],
        invoices: inv.map((i) => ({ estado_pago: i.estado_pago })),
        projects: ((projects.data ?? []) as Row<"projects">[]).map((p) => ({ estado: p.estado })),
      })
    : 0;

  return {
    client,
    brandName,
    projects: (projects.data ?? []) as Row<"projects">[],
    milestones: (milestones.data ?? []) as Row<"project_milestones">[],
    files: (files.data ?? []) as Row<"project_files">[],
    invoices: inv,
    contracts: (contracts.data ?? []) as Row<"contracts">[],
    payments: pay,
    totals: { facturado: totalFacturado, pagado: totalPagado, saldo: totalFacturado - totalPagado },
    step,
  };
}

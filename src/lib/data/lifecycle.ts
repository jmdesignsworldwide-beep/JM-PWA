import { CICLO_VIDA, type CicloPaso } from "@/lib/ventas";
import type { Client } from "@/lib/data/clients";

type Stats = {
  orders: { id: string }[];
  contracts: { id: string }[];
  invoices: { estado_pago: string }[];
  projects: { estado: string }[];
};

/**
 * Calcula el paso actual del ciclo de vida a partir de los datos reales.
 * Devuelve el índice del paso más avanzado alcanzado.
 */
export function currentLifecycleStep(client: Client, stats: Stats): number {
  const idx = (p: CicloPaso) => CICLO_VIDA.indexOf(p);

  let step = client.es_lead ? idx("Lead") : idx("Pedido");

  if (stats.orders.length > 0) step = Math.max(step, idx("Pedido"));
  if (stats.contracts.length > 0) step = Math.max(step, idx("Contrato"));
  if (stats.invoices.length > 0) step = Math.max(step, idx("Facturado"));
  if (stats.projects.some((p) => p.estado === "en_progreso"))
    step = Math.max(step, idx("En progreso"));
  if (stats.projects.some((p) => p.estado === "entregado"))
    step = Math.max(step, idx("Entregado"));
  if (
    stats.invoices.some((i) => i.estado_pago === "pagado") ||
    stats.projects.some((p) => p.estado === "pagado")
  )
    step = Math.max(step, idx("Pagado"));

  return step;
}

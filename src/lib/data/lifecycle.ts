import { CICLO_VIDA, type CicloPaso } from "@/lib/ventas";
import type { Client } from "@/lib/data/clients";

type Stats = {
  orders: { id: string }[];
  contracts: { id: string }[];
  invoices: { estado_pago: string }[];
  projects: { estado: string }[];
};

/**
 * Ciclo de vida FLEXIBLE: el contrato es opcional. Si el cliente no tiene
 * contrato, la etapa "Contrato" no aparece en la barra (no se fuerza). Devuelve
 * los pasos a mostrar y el índice del paso más avanzado alcanzado.
 */
export function getLifecycle(client: Client, stats: Stats): { steps: CicloPaso[]; current: number } {
  const hasContract = stats.contracts.length > 0;
  // Omitimos "Contrato" cuando no hay ninguno: Prospecto → Pedido → Facturado → …
  const steps = CICLO_VIDA.filter((p) => p !== "Contrato" || hasContract);
  const idx = (p: CicloPaso) => steps.indexOf(p);

  let step = client.es_lead ? idx("Prospecto") : idx("Pedido");

  if (stats.orders.length > 0) step = Math.max(step, idx("Pedido"));
  if (hasContract) step = Math.max(step, idx("Contrato"));
  if (stats.invoices.length > 0) step = Math.max(step, idx("Facturado"));
  if (stats.projects.some((p) => p.estado === "en_progreso")) step = Math.max(step, idx("En progreso"));
  if (stats.projects.some((p) => p.estado === "entregado")) step = Math.max(step, idx("Entregado"));
  if (
    stats.invoices.some((i) => i.estado_pago === "pagado") ||
    stats.projects.some((p) => p.estado === "pagado")
  )
    step = Math.max(step, idx("Pagado"));

  return { steps, current: step };
}

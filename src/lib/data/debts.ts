import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Debt = Row<"debts">;
export type ManualDebt = Debt & { personaNombre: string; personaEsPersonal: boolean; pagado: number; saldo: number };

/**
 * Deudas manuales del owner (a quién le debo), con el nombre de la persona y su
 * saldo. El "pagado" se completa en C3 (pagos de deuda); por ahora saldo = monto.
 */
export async function getManualDebts(): Promise<ManualDebt[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("debts").select("*").order("fecha", { ascending: true });
  const rows = (data ?? []) as Debt[];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((d) => d.client_id))];
  const { data: cls } = await supabase.from("clients").select("id, nombre, apellido, es_personal").in("id", ids);
  const map = new Map((cls ?? []).map((c) => [c.id, c]));

  // El "pagado" (pagos de deuda) llega en C3; por ahora es 0.
  return rows.map((d) => {
    const c = map.get(d.client_id) as { nombre: string; apellido: string | null; es_personal: boolean } | undefined;
    const pagado = 0;
    return {
      ...d,
      personaNombre: c ? `${c.nombre} ${c.apellido ?? ""}`.trim() : "Contacto",
      personaEsPersonal: !!c?.es_personal,
      pagado,
      saldo: Math.max(0, (Number(d.monto) || 0) - pagado),
    };
  });
}

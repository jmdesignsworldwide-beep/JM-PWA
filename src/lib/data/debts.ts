import { createClient } from "@/lib/supabase/server";
import type { Row } from "@/lib/database.types";

export type Debt = Row<"debts">;
export type DebtPayment = Row<"debt_payments">;
export type ManualDebt = Debt & {
  personaNombre: string;
  personaEsPersonal: boolean;
  pagado: number;
  saldo: number;
  pagos: DebtPayment[];
};

/**
 * Deudas manuales del owner (a quién le debo), con el nombre de la persona, sus
 * abonos y su saldo. Cada abono (debt_payments) se refleja como gasto en Finanzas
 * vía trigger; aquí solo lo restamos del saldo (sin re-teclear).
 */
export async function getManualDebts(): Promise<ManualDebt[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("debts").select("*").order("fecha", { ascending: true });
  const rows = (data ?? []) as Debt[];
  if (rows.length === 0) return [];

  const ids = [...new Set(rows.map((d) => d.client_id))];
  const [{ data: cls }, { data: pays }] = await Promise.all([
    supabase.from("clients").select("id, nombre, apellido, es_personal").in("id", ids),
    supabase.from("debt_payments").select("*").in("debt_id", rows.map((d) => d.id)).order("fecha", { ascending: true }),
  ]);
  const map = new Map((cls ?? []).map((c) => [c.id, c]));
  const pagosPorDeuda = new Map<string, DebtPayment[]>();
  for (const p of (pays ?? []) as DebtPayment[]) {
    const arr = pagosPorDeuda.get(p.debt_id) ?? [];
    arr.push(p);
    pagosPorDeuda.set(p.debt_id, arr);
  }

  return rows.map((d) => {
    const c = map.get(d.client_id) as { nombre: string; apellido: string | null; es_personal: boolean } | undefined;
    const pagos = pagosPorDeuda.get(d.id) ?? [];
    const pagado = pagos.reduce((s, p) => s + (Number(p.monto) || 0), 0);
    return {
      ...d,
      personaNombre: c ? `${c.nombre} ${c.apellido ?? ""}`.trim() : "Contacto",
      personaEsPersonal: !!c?.es_personal,
      pagado,
      saldo: Math.max(0, (Number(d.monto) || 0) - pagado),
      pagos,
    };
  });
}

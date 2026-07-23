"use client";

import { useMemo } from "react";
import { PieChart, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { money } from "@/lib/format";
import { rdToday, startOfMonth, endOfMonth } from "@/lib/fecha";

type Expense = { monto: number; moneda: string; fecha: string; categoria: string | null; es_personal: boolean };

/**
 * Resumen de consumo PERSONAL, en tono neutral: cuánto llevas este mes, cómo se
 * compara con el mes pasado y en qué categorías. Es información para ti, nunca
 * un juicio: no hay "gastaste mucho" ni alertas de reproche.
 */
export function ConsumoResumen({ expenses }: { expenses: Expense[] }) {
  const { esteMes, mesPasado, topCats, tieneUSD, usdMes } = useMemo(() => {
    const hoy = rdToday();
    const iniMes = startOfMonth(hoy), finMes = endOfMonth(hoy);
    const d = new Date(`${hoy}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1);
    const prev = d.toISOString().slice(0, 10);
    const iniPrev = startOfMonth(prev), finPrev = endOfMonth(prev);

    const personales = expenses.filter((e) => e.es_personal);
    let esteMes = 0, mesPasado = 0, usdMes = 0, tieneUSD = false;
    const cats: Record<string, number> = {};
    for (const e of personales) {
      const monto = Number(e.monto);
      const enMes = e.fecha >= iniMes && e.fecha <= finMes;
      if (e.moneda === "USD") { tieneUSD = true; if (enMes) usdMes += monto; continue; }
      if (enMes) { esteMes += monto; const k = e.categoria ?? "Sin categoría"; cats[k] = (cats[k] ?? 0) + monto; }
      if (e.fecha >= iniPrev && e.fecha <= finPrev) mesPasado += monto;
    }
    const topCats = Object.entries(cats).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total).slice(0, 5);
    return { esteMes, mesPasado, topCats, tieneUSD, usdMes };
  }, [expenses]);

  const diff = esteMes - mesPasado;
  const maxCat = Math.max(1, ...topCats.map((c) => c.total));
  const Icon = diff > 0 ? TrendingUp : diff < 0 ? TrendingDown : Minus;
  const comparativa = mesPasado === 0
    ? "Es tu primer mes con registro de consumo personal."
    : diff === 0
      ? "Vas igual que el mes pasado."
      : `${diff > 0 ? "Un poco más" : "Un poco menos"} que el mes pasado (${money(Math.abs(diff), "DOP")}).`;

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-1 flex items-center gap-1.5 font-semibold"><PieChart className="size-4 text-electric" /> Tu consumo personal</h3>
      <p className="mb-4 text-xs text-muted-foreground">Solo para tu control. Sin juicios: es tu dinero.</p>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Este mes</p>
          <p className="mt-1 text-xl font-bold tracking-tight">{money(esteMes, "DOP")}</p>
          {tieneUSD && usdMes > 0 && <p className="text-xs text-muted-foreground">{money(usdMes, "USD")}</p>}
        </div>
        <div className="rounded-lg border border-border bg-background/40 p-3">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Mes pasado</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-muted-foreground">{money(mesPasado, "DOP")}</p>
        </div>
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Icon className="size-4" /> {comparativa}
      </p>

      {topCats.length > 0 && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">En qué, este mes</p>
          {topCats.map((c) => (
            <div key={c.categoria}>
              <div className="flex justify-between text-xs"><span>{c.categoria}</span><span className="text-muted-foreground">{money(c.total, "DOP")}</span></div>
              <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))]" style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

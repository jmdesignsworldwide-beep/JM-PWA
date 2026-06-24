"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, TrendingUp, Repeat, ArrowDownUp, ArrowUpRight, ArrowDownRight, Wallet } from "lucide-react";
import { money, fechaCorta } from "@/lib/format";
import { AddIncomeDialog } from "./add-income-dialog";
import { AddExpenseDialog } from "./add-expense-dialog";
import { RecurringManager } from "./recurring-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Opt = { id: string; nombre: string };
type Bucket = { DOP: number; USD: number };
type Income = { id: string; monto: number; moneda: string; fecha: string; categoria: string | null; descripcion: string | null };
type Expense = Income & { project_id: string | null; es_personal?: boolean | null; comercio?: string | null };
type Margin = { id: string; nombre: string | null; precio_total: number; moneda: string; gastos: number; ganancia: number; margen: number };
type Plan = { id: string; client_id: string; tipo: string | null; monto: number; moneda: string; frecuencia: string | null; proxima_factura: string | null; activo: boolean };

export function FinanzasView({
  balance, monthly, byCategory, margins, incomes, expenses, plans, mrr,
  categoriasIngreso, categoriasGasto, clients, projects, brands, clientMap, registradoHoy,
}: {
  balance: { ingresos: Bucket; gastos: Bucket; neto: Bucket };
  monthly: { mes: string; ingresos: number; gastos: number }[];
  byCategory: { categoria: string; total: number }[];
  margins: Margin[];
  incomes: Income[];
  expenses: Expense[];
  plans: Plan[];
  mrr: number;
  categoriasIngreso: string[];
  categoriasGasto: string[];
  clients: Opt[];
  projects: Opt[];
  brands: Opt[];
  clientMap: Record<string, string>;
  registradoHoy: boolean;
}) {
  void registradoHoy;
  const [tab, setTab] = useState<"resumen" | "movimientos" | "recurrentes">("resumen");

  function exportCsv() {
    const rows = [
      ["tipo", "fecha", "monto", "moneda", "categoria", "descripcion"],
      ...incomes.map((i) => ["ingreso", i.fecha, i.monto, i.moneda, i.categoria ?? "", (i.descripcion ?? "").replace(/[\n,]/g, " ")]),
      ...expenses.map((e) => ["gasto", e.fecha, e.monto, e.moneda, e.categoria ?? "", (e.descripcion ?? "").replace(/[\n,]/g, " ")]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `finanzas-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const maxMonth = Math.max(1, ...monthly.flatMap((m) => [m.ingresos, m.gastos]));
  const maxCat = Math.max(1, ...byCategory.map((c) => c.total));

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5">
          {([["resumen", "Resumen", TrendingUp], ["movimientos", "Movimientos", ArrowDownUp], ["recurrentes", "Recurrentes", Repeat]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)}
              className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors", tab === id ? "bg-accent text-foreground" : "text-muted-foreground")}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <a href="/api/pdf/finance" target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><Download className="size-4" /> PDF</Button></a>
          <Button variant="outline" size="sm" onClick={exportCsv}><FileSpreadsheet className="size-4" /> Excel (CSV)</Button>
          <AddExpenseDialog categorias={categoriasGasto} projects={projects} brands={brands} />
          <AddIncomeDialog categorias={categoriasIngreso} clients={clients} projects={projects} brands={brands} />
        </div>
      </div>

      {tab === "resumen" && (
        <div className="space-y-5">
          {/* Balance */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BalanceCard label="Ingresos" b={balance.ingresos} tone="success" />
            <BalanceCard label="Gastos" b={balance.gastos} tone="destructive" />
            <BalanceCard label="Neto" b={balance.neto} tone="electric" />
          </div>

          {/* Ingresos vs gastos por mes */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold">Ingresos vs gastos (últimos 6 meses, DOP)</h3>
            <div className="flex items-end gap-3" style={{ height: 160 }}>
              {monthly.map((m) => (
                <div key={m.mes} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full items-end justify-center gap-1" style={{ height: 130 }}>
                    <div className="w-3 rounded-t bg-success" style={{ height: `${(m.ingresos / maxMonth) * 100}%` }} title={`Ingresos ${money(m.ingresos, "DOP")}`} />
                    <div className="w-3 rounded-t bg-destructive" style={{ height: `${(m.gastos / maxMonth) * 100}%` }} title={`Gastos ${money(m.gastos, "DOP")}`} />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{m.mes.slice(5)}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-success" /> Ingresos</span>
              <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-destructive" /> Gastos</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Gastos por categoría */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 font-semibold">Gastos por categoría</h3>
              {byCategory.length === 0 ? <Empty text="Aún no hay gastos." /> : (
                <div className="space-y-2">
                  {byCategory.slice(0, 8).map((c) => (
                    <div key={c.categoria}>
                      <div className="flex justify-between text-xs"><span>{c.categoria}</span><span className="text-muted-foreground">{money(c.total, "DOP")}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))]" style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Margen por proyecto */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-1 font-semibold">Ganancia real por proyecto</h3>
              <p className="mb-3 text-xs text-muted-foreground">Precio cobrado − gastos asignados.</p>
              {margins.length === 0 ? <Empty text="Aún no hay proyectos." /> : (
                <ul className="space-y-2">
                  {margins.slice(0, 6).map((m) => (
                    <li key={m.id} className="rounded-lg border border-border px-3 py-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="truncate font-medium">{m.nombre ?? "Proyecto"}</span>
                        <Badge dot={m.ganancia >= 0 ? "var(--success)" : "var(--destructive)"}>{money(m.ganancia, m.moneda)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">Precio {money(m.precio_total, m.moneda)} · gastos {money(m.gastos, m.moneda)} · margen {m.margen.toFixed(0)}%</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "movimientos" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <MovList title="Ingresos" rows={incomes} tone="success" />
          <MovList title="Gastos" rows={expenses} tone="destructive" />
        </div>
      )}

      {tab === "recurrentes" && (
        <RecurringManager plans={plans} mrr={mrr} clients={clients} clientMap={clientMap} />
      )}
    </div>
  );
}

function BalanceCard({ label, b, tone }: { label: string; b: Bucket; tone: string }) {
  const color = tone === "success" ? "var(--success)" : tone === "destructive" ? "var(--destructive)" : "var(--electric)";
  const Icon = tone === "success" ? ArrowUpRight : tone === "destructive" ? ArrowDownRight : Wallet;
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-all hover:border-electric/40 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color }}>{money(b.DOP, "DOP")}</p>
      {b.USD !== 0 && <p className="text-sm text-muted-foreground">{money(b.USD, "USD")}</p>}
    </div>
  );
}

function MovList({ title, rows, tone }: { title: string; rows: Income[]; tone: string }) {
  const color = tone === "success" ? "var(--success)" : "var(--destructive)";
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="border-b border-border px-4 py-3 font-semibold">{title}</div>
      <div className="max-h-[28rem] overflow-y-auto p-2">
        {rows.length === 0 ? <Empty text={`Sin ${title.toLowerCase()}.`} /> : rows.map((r) => {
          const e = r as Expense;
          const sub = [e.comercio, e.descripcion].filter(Boolean).join(" · ");
          return (
          <div key={r.id} className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-accent/40">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 truncate font-medium">
                {r.categoria ?? "—"}
                {e.es_personal ? <span className="rounded-full border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Personal</span> : null}
              </p>
              <p className="truncate text-xs text-muted-foreground">{sub ? `${sub} · ` : ""}{fechaCorta(r.fecha)}</p>
            </div>
            <span className="shrink-0 font-medium" style={{ color }}>{money(r.monto, r.moneda)}</span>
          </div>
          );
        })}
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

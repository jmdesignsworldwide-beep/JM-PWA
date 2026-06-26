"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, TrendingUp, Repeat, ArrowDownUp, ArrowUpRight, ArrowDownRight, Wallet, Building2, User, Layers, ChevronRight, Calendar } from "lucide-react";
import { money, fechaCorta } from "@/lib/format";
import { rdToday, startOfMonth, endOfMonth } from "@/lib/fecha";
import { AddIncomeDialog } from "./add-income-dialog";
import { AddExpenseDialog } from "./add-expense-dialog";
import { RecurringManager } from "./recurring-manager";
import { TransactionDetail, type Mov } from "./transaction-detail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Opt = { id: string; nombre: string };
type Bucket = { DOP: number; USD: number };
type Income = { id: string; monto: number; moneda: string; fecha: string; categoria: string | null; descripcion: string | null; brand_id: string | null; project_id: string | null; client_id: string | null; comprobante_url: string | null; es_personal: boolean; order_payment_id: string | null };
type Expense = { id: string; monto: number; moneda: string; fecha: string; categoria: string | null; descripcion: string | null; brand_id: string | null; project_id: string | null; comercio: string | null; itbis: number | null; metodo_pago: string | null; factura_url: string | null; es_personal: boolean };
type Margin = { id: string; nombre: string | null; precio_total: number; moneda: string; gastos: number; ganancia: number; margen: number };
type Plan = { id: string; client_id: string; tipo: string | null; monto: number; moneda: string; frecuencia: string | null; proxima_factura: string | null; activo: boolean };

type Scope = "todo" | "negocio" | "personal";

export function FinanzasView({
  margins, incomes, expenses, plans, mrr,
  categoriasIngreso, categoriasGasto, clients, projects, brands, clientMap, registradoHoy,
}: {
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
  const [scope, setScope] = useState<Scope>("todo");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [brandId, setBrandId] = useState("");
  const [preset, setPreset] = useState<"todo" | "mes" | "mespasado" | "anio" | "custom">("todo");

  // Drill-down (lista filtrada) y detalle de un movimiento.
  const [drill, setDrill] = useState<{ title: string; rows: Mov[] } | null>(null);
  const [detail, setDetail] = useState<Mov | null>(null);

  const brandMap = useMemo(() => Object.fromEntries(brands.map((b) => [b.id, b.nombre])), [brands]);

  // Movimientos unificados con discriminador kind.
  const allMovs: Mov[] = useMemo(() => [
    ...incomes.map((i) => ({ ...i, kind: "income" as const })),
    ...expenses.map((e) => ({ ...e, kind: "expense" as const })),
  ], [incomes, expenses]);

  const filtered = useMemo(() => allMovs.filter((m) => {
    if (scope === "negocio" && m.es_personal) return false;
    if (scope === "personal" && !m.es_personal) return false;
    if (desde && m.fecha < desde) return false;
    if (hasta && m.fecha > hasta) return false;
    if (brandId && m.brand_id !== brandId) return false;
    return true;
  }), [allMovs, scope, desde, hasta, brandId]);

  const fIncomes = useMemo(() => filtered.filter((m) => m.kind === "income"), [filtered]);
  const fExpenses = useMemo(() => filtered.filter((m) => m.kind === "expense"), [filtered]);

  // Balance por moneda.
  const balance = useMemo(() => {
    const ingresos: Bucket = { DOP: 0, USD: 0 };
    const gastos: Bucket = { DOP: 0, USD: 0 };
    for (const m of fIncomes) ingresos[m.moneda === "USD" ? "USD" : "DOP"] += Number(m.monto);
    for (const m of fExpenses) gastos[m.moneda === "USD" ? "USD" : "DOP"] += Number(m.monto);
    return { ingresos, gastos, neto: { DOP: ingresos.DOP - gastos.DOP, USD: ingresos.USD - gastos.USD } };
  }, [fIncomes, fExpenses]);

  // Flujo mensual (respeta todos los filtros): por YYYY-MM, últimos 12 con datos.
  const monthly = useMemo(() => {
    const map: Record<string, { ingresos: number; gastos: number }> = {};
    for (const m of filtered) {
      const k = m.fecha.slice(0, 7);
      (map[k] ??= { ingresos: 0, gastos: 0 });
      if (m.kind === "income") map[k].ingresos += Number(m.monto);
      else map[k].gastos += Number(m.monto);
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([mes, v]) => ({ mes, ...v }));
  }, [filtered]);

  // Gastos por categoría (respeta filtros).
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const m of fExpenses) { const k = m.categoria ?? "Sin categoría"; map[k] = (map[k] ?? 0) + Number(m.monto); }
    return Object.entries(map).map(([categoria, total]) => ({ categoria, total })).sort((a, b) => b.total - a.total);
  }, [fExpenses]);

  const maxMonth = Math.max(1, ...monthly.flatMap((m) => [m.ingresos, m.gastos]));
  const maxCat = Math.max(1, ...byCategory.map((c) => c.total));

  function applyPreset(p: typeof preset) {
    setPreset(p);
    const today = rdToday();
    if (p === "todo") { setDesde(""); setHasta(""); }
    else if (p === "mes") { setDesde(startOfMonth(today)); setHasta(endOfMonth(today)); }
    else if (p === "mespasado") {
      const d = new Date(`${today}T12:00:00Z`); d.setUTCMonth(d.getUTCMonth() - 1);
      const prev = d.toISOString().slice(0, 10); setDesde(startOfMonth(prev)); setHasta(endOfMonth(prev));
    } else if (p === "anio") { setDesde(`${today.slice(0, 4)}-01-01`); setHasta(`${today.slice(0, 4)}-12-31`); }
  }

  function exportCsv() {
    const rows = [
      ["tipo", "fecha", "monto", "moneda", "categoria", "comercio", "negocio_personal", "descripcion"],
      ...filtered.map((m) => [
        m.kind === "income" ? "ingreso" : "gasto", m.fecha, m.monto, m.moneda, m.categoria ?? "",
        m.comercio ?? "", m.es_personal ? "personal" : "negocio", (m.descripcion ?? "").replace(/[\n,]/g, " "),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = `finanzas-${scope}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const sortByDate = (rows: Mov[]) => [...rows].sort((a, b) => b.fecha.localeCompare(a.fecha));

  return (
    <div className="space-y-5">
      {/* Barra superior: tabs + acciones */}
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

      {/* Filtros: Negocio/Personal/Todo + fecha + marca */}
      {tab !== "recurrentes" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
          <div className="flex rounded-lg border border-border p-0.5">
            {([["todo", "Todo", Layers], ["negocio", "Negocio", Building2], ["personal", "Personal", User]] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setScope(id)}
                className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors", scope === id ? "bg-electric/15 text-electric" : "text-muted-foreground hover:bg-accent/40")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {([["todo", "Todo"], ["mes", "Este mes"], ["mespasado", "Mes pasado"], ["anio", "Este año"]] as const).map(([id, label]) => (
              <button key={id} onClick={() => applyPreset(id)}
                className={cn("rounded-md px-2.5 py-1.5 text-xs transition-colors", preset === id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40")}>
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Calendar className="size-4" />
            <input type="date" value={desde} onChange={(e) => { setDesde(e.target.value); setPreset("custom"); }} className="h-8 rounded-lg border border-border bg-background/50 px-2 text-xs" />
            <span>—</span>
            <input type="date" value={hasta} onChange={(e) => { setHasta(e.target.value); setPreset("custom"); }} className="h-8 rounded-lg border border-border bg-background/50 px-2 text-xs" />
          </div>

          {brands.length > 0 && (
            <Select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="h-8 w-auto text-sm">
              <option value="">Todas las marcas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          )}

          <span className="ml-auto text-xs text-muted-foreground">{filtered.length} movimiento{filtered.length === 1 ? "" : "s"}</span>
        </div>
      )}

      {tab === "resumen" && (
        <div className="space-y-5">
          {/* Balance — clicable */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <BalanceCard label="Ingresos" b={balance.ingresos} tone="success" onClick={() => setDrill({ title: "Ingresos", rows: sortByDate(fIncomes) })} />
            <BalanceCard label="Gastos" b={balance.gastos} tone="destructive" onClick={() => setDrill({ title: "Gastos", rows: sortByDate(fExpenses) })} />
            <BalanceCard label="Neto" b={balance.neto} tone="electric" onClick={() => setDrill({ title: "Todos los movimientos", rows: sortByDate(filtered) })} />
          </div>

          {/* Ingresos vs gastos por mes — barras clicables */}
          <div className="rounded-xl border border-border bg-card p-5">
            <h3 className="mb-4 font-semibold">Ingresos vs gastos por mes</h3>
            {monthly.length === 0 ? <Empty text="Sin movimientos en este filtro." /> : (
              <>
                <div className="flex items-end gap-3" style={{ height: 160 }}>
                  {monthly.map((m) => (
                    <button key={m.mes} onClick={() => setDrill({ title: `Movimientos de ${m.mes}`, rows: sortByDate(filtered.filter((x) => x.fecha.slice(0, 7) === m.mes)) })}
                      className="group flex flex-1 flex-col items-center gap-1 rounded-lg pt-1 transition-colors hover:bg-accent/40">
                      <div className="flex w-full items-end justify-center gap-1" style={{ height: 130 }}>
                        <div className="w-3 rounded-t bg-success transition-all group-hover:opacity-80" style={{ height: `${(m.ingresos / maxMonth) * 100}%` }} title={`Ingresos ${money(m.ingresos, "DOP")}`} />
                        <div className="w-3 rounded-t bg-destructive transition-all group-hover:opacity-80" style={{ height: `${(m.gastos / maxMonth) * 100}%` }} title={`Gastos ${money(m.gastos, "DOP")}`} />
                      </div>
                      <span className="text-[10px] text-muted-foreground">{m.mes.slice(5)}/{m.mes.slice(2, 4)}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-success" /> Ingresos</span>
                  <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full bg-destructive" /> Gastos</span>
                  <span className="ml-auto">Clic en un mes para ver el detalle</span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {/* Gastos por categoría — clicable */}
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-4 font-semibold">Gastos por categoría</h3>
              {byCategory.length === 0 ? <Empty text="Aún no hay gastos." /> : (
                <div className="space-y-2">
                  {byCategory.slice(0, 8).map((c) => (
                    <button key={c.categoria} onClick={() => setDrill({ title: `Gastos · ${c.categoria}`, rows: sortByDate(fExpenses.filter((e) => (e.categoria ?? "Sin categoría") === c.categoria)) })}
                      className="block w-full rounded-lg px-1 py-1 text-left transition-colors hover:bg-accent/40">
                      <div className="flex justify-between text-xs"><span className="flex items-center gap-1">{c.categoria}<ChevronRight className="size-3 text-muted-foreground" /></span><span className="text-muted-foreground">{money(c.total, "DOP")}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-secondary"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))]" style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Margen por proyecto (negocio) */}
            {scope !== "personal" && (
              <div className="rounded-xl border border-border bg-card p-5">
                <h3 className="mb-1 font-semibold">Ganancia real por proyecto</h3>
                <p className="mb-3 text-xs text-muted-foreground">Precio cobrado − gastos asignados (negocio).</p>
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
            )}
          </div>
        </div>
      )}

      {tab === "movimientos" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <MovList title="Ingresos" rows={sortByDate(fIncomes)} tone="success" brandMap={brandMap} onPick={setDetail} />
          <MovList title="Gastos" rows={sortByDate(fExpenses)} tone="destructive" brandMap={brandMap} onPick={setDetail} />
        </div>
      )}

      {tab === "recurrentes" && (
        <RecurringManager plans={plans} mrr={mrr} clients={clients} clientMap={clientMap} />
      )}

      {/* Modal drill-down: lista que abre el detalle */}
      {drill && (
        <Dialog open onClose={() => setDrill(null)} title={drill.title} description={`${drill.rows.length} movimiento${drill.rows.length === 1 ? "" : "s"}`} className="max-w-lg">
          <div className="max-h-[60vh] overflow-y-auto">
            {drill.rows.length === 0 ? <Empty text="Sin movimientos." /> : (
              <div className="space-y-1">
                {drill.rows.map((m) => <MovRow key={`${m.kind}-${m.id}`} m={m} brandMap={brandMap} onClick={() => { setDrill(null); setDetail(m); }} />)}
              </div>
            )}
          </div>
        </Dialog>
      )}

      {/* Modal detalle/editar/borrar */}
      {detail && (
        <TransactionDetail
          mov={detail} onClose={() => setDetail(null)}
          categoriasIngreso={categoriasIngreso} categoriasGasto={categoriasGasto}
          projects={projects} brands={brands} clients={clients} brandMap={brandMap}
        />
      )}
    </div>
  );
}

function BalanceCard({ label, b, tone, onClick }: { label: string; b: Bucket; tone: string; onClick: () => void }) {
  const color = tone === "success" ? "var(--success)" : tone === "destructive" ? "var(--destructive)" : "var(--electric)";
  const Icon = tone === "success" ? ArrowUpRight : tone === "destructive" ? ArrowDownRight : Wallet;
  return (
    <button onClick={onClick} className="rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-electric/40 hover:shadow-md">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className="flex size-8 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-bold tracking-tight" style={{ color }}>{money(b.DOP, "DOP")}</p>
      {b.USD !== 0 && <p className="text-sm text-muted-foreground">{money(b.USD, "USD")}</p>}
      <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">Ver detalle <ChevronRight className="size-3" /></p>
    </button>
  );
}

function MovList({ title, rows, tone, brandMap, onPick }: { title: string; rows: Mov[]; tone: string; brandMap: Record<string, string>; onPick: (m: Mov) => void }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <span className="font-semibold">{title}</span>
        <Badge dot={tone === "success" ? "var(--success)" : "var(--destructive)"}>{rows.length}</Badge>
      </div>
      <div className="max-h-[32rem] overflow-y-auto p-2">
        {rows.length === 0 ? <Empty text={`Sin ${title.toLowerCase()}.`} /> : (
          <div className="space-y-1">{rows.map((m) => <MovRow key={`${m.kind}-${m.id}`} m={m} brandMap={brandMap} onClick={() => onPick(m)} />)}</div>
        )}
      </div>
    </div>
  );
}

function MovRow({ m, brandMap, onClick }: { m: Mov; brandMap: Record<string, string>; onClick: () => void }) {
  const color = m.kind === "income" ? "var(--success)" : "var(--destructive)";
  const sub = [m.comercio, m.brand_id ? brandMap[m.brand_id] : null, m.descripcion].filter(Boolean).join(" · ");
  return (
    <button onClick={onClick} className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-medium">
          {m.categoria ?? "—"}
          {m.es_personal ? <span className="rounded-full border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">Personal</span> : null}
          {m.kind === "income" && m.order_payment_id ? <span className="rounded-full border border-electric/40 bg-electric/10 px-1.5 py-0.5 text-[10px] font-medium text-electric">Auto · Cobros</span> : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">{sub ? `${sub} · ` : ""}{fechaCorta(m.fecha)}</p>
      </div>
      <span className="shrink-0 font-medium" style={{ color }}>{m.kind === "income" ? "+" : "−"}{money(m.monto, m.moneda)}</span>
    </button>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{text}</p>;
}

"use client";

import { useMemo, useState } from "react";
import { Search, ArrowUpDown, Building2, User, Layers, Calendar, ArrowUpRight, ArrowDownRight, Paperclip } from "lucide-react";
import { money, fechaCorta } from "@/lib/format";
import { rdToday, startOfMonth, endOfMonth } from "@/lib/fecha";
import { TransactionDetail, type Mov } from "./transaction-detail";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Opt = { id: string; nombre: string };
type Income = { id: string; monto: number; moneda: string; fecha: string; categoria: string | null; descripcion: string | null; brand_id: string | null; project_id: string | null; client_id: string | null; comprobante_url: string | null; es_personal: boolean; order_payment_id: string | null };
type Expense = { id: string; monto: number; moneda: string; fecha: string; categoria: string | null; descripcion: string | null; brand_id: string | null; project_id: string | null; comercio: string | null; itbis: number | null; metodo_pago: string | null; factura_url: string | null; es_personal: boolean };

type Scope = "todo" | "negocio" | "personal";
type Tipo = "todo" | "ingreso" | "gasto";

/**
 * Página de Movimientos: TODOS los ingresos/gastos con buscar, filtrar
 * (cliente, marca, fecha, negocio/personal, tipo), ordenar, y el total de lo
 * filtrado arriba. Cada fila abre su detalle y comprobante.
 */
export function MovimientosView({
  incomes, expenses, clients, brands, projects = [], categoriasIngreso, categoriasGasto, categoriasGastoPersonal = [],
  initialTipo = "todo",
}: {
  incomes: Income[]; expenses: Expense[]; clients: Opt[]; brands: Opt[]; projects?: Opt[];
  categoriasIngreso: string[]; categoriasGasto: string[]; categoriasGastoPersonal?: string[]; initialTipo?: Tipo;
}) {
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<Tipo>(initialTipo);
  const [scope, setScope] = useState<Scope>("todo");
  const [clientId, setClientId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [preset, setPreset] = useState<"todo" | "mes" | "mespasado" | "anio" | "custom">("todo");
  const [orden, setOrden] = useState<"fecha" | "monto">("fecha");
  const [detail, setDetail] = useState<Mov | null>(null);

  const brandMap = useMemo(() => Object.fromEntries(brands.map((b) => [b.id, b.nombre])), [brands]);
  const clientMap = useMemo(() => Object.fromEntries(clients.map((c) => [c.id, c.nombre])), [clients]);

  const all: Mov[] = useMemo(() => [
    ...incomes.map((i) => ({ ...i, kind: "income" as const })),
    ...expenses.map((e) => ({ ...e, kind: "expense" as const })),
  ], [incomes, expenses]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const rows = all.filter((m) => {
      if (tipo === "ingreso" && m.kind !== "income") return false;
      if (tipo === "gasto" && m.kind !== "expense") return false;
      if (scope === "negocio" && m.es_personal) return false;
      if (scope === "personal" && !m.es_personal) return false;
      if (clientId && (m.kind !== "income" || m.client_id !== clientId)) return false;
      if (brandId && m.brand_id !== brandId) return false;
      if (desde && m.fecha < desde) return false;
      if (hasta && m.fecha > hasta) return false;
      if (term) {
        const cli = m.kind === "income" && m.client_id ? clientMap[m.client_id] ?? "" : "";
        const hay = `${m.categoria ?? ""} ${m.descripcion ?? ""} ${m.comercio ?? ""} ${cli}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
    rows.sort((a, b) => orden === "monto" ? Number(b.monto) - Number(a.monto) : b.fecha.localeCompare(a.fecha));
    return rows;
  }, [all, q, tipo, scope, clientId, brandId, desde, hasta, orden, clientMap]);

  // Total de lo filtrado por moneda (ingresos − gastos = neto; y por lado).
  const totals = useMemo(() => {
    const t = { ingreso: { DOP: 0, USD: 0 }, gasto: { DOP: 0, USD: 0 } };
    for (const m of filtered) {
      const cur = m.moneda === "USD" ? "USD" : "DOP";
      if (m.kind === "income") t.ingreso[cur] += Number(m.monto);
      else t.gasto[cur] += Number(m.monto);
    }
    return t;
  }, [filtered]);

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

  const netoDOP = totals.ingreso.DOP - totals.gasto.DOP;
  const netoUSD = totals.ingreso.USD - totals.gasto.USD;

  return (
    <div className="space-y-4">
      {/* Total de lo filtrado */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <TotalCard label="Ingresos" dop={totals.ingreso.DOP} usd={totals.ingreso.USD} tone="success" />
        <TotalCard label="Gastos" dop={totals.gasto.DOP} usd={totals.gasto.USD} tone="destructive" />
        <TotalCard label="Neto" dop={netoDOP} usd={netoUSD} tone="electric" />
      </div>

      {/* Filtros */}
      <div className="space-y-2 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px] flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar (cliente, concepto, comercio…)"
              className="h-9 w-full rounded-lg border border-border bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </div>
          <div className="flex rounded-lg border border-border p-0.5">
            {([["todo", "Todo", Layers], ["negocio", "Negocio", Building2], ["personal", "Personal", User]] as const).map(([id, label, Icon]) => (
              <button key={id} onClick={() => { setScope(id); if (id === "personal") setBrandId(""); }}
                className={cn("flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm transition-colors", scope === id ? "bg-electric/15 text-electric" : "text-muted-foreground hover:bg-accent/40")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} className="h-9 w-auto text-sm">
            <option value="todo">Ingresos y gastos</option>
            <option value="ingreso">Solo ingresos</option>
            <option value="gasto">Solo gastos</option>
          </Select>
          {clients.length > 0 && (
            <Select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-9 w-auto text-sm">
              <option value="">Todo cliente</option>
              {clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </Select>
          )}
          {/* Las marcas son del negocio: no se muestran en Personal */}
          {scope !== "personal" && brands.length > 0 && (
            <Select value={brandId} onChange={(e) => setBrandId(e.target.value)} className="h-9 w-auto text-sm">
              <option value="">Todas las marcas</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          )}
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
          <button onClick={() => setOrden((o) => o === "fecha" ? "monto" : "fecha")}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/40">
            <ArrowUpDown className="size-3.5" /> Orden: {orden === "fecha" ? "fecha" : "monto"}
          </button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} movimiento{filtered.length === 1 ? "" : "s"}</p>

      {/* Lista */}
      <div className="rounded-xl border border-border bg-card p-2">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Sin movimientos con estos filtros.</p>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((m) => {
              const color = m.kind === "income" ? "var(--success)" : "var(--destructive)";
              const cli = m.kind === "income" && m.client_id ? clientMap[m.client_id] : null;
              const tieneComprobante = m.kind === "income" ? !!m.comprobante_url : !!m.factura_url;
              const sub = [cli, m.comercio, m.brand_id ? brandMap[m.brand_id] : null, m.descripcion].filter(Boolean).join(" · ");
              return (
                <li key={`${m.kind}-${m.id}`}>
                  <button onClick={() => setDetail(m)} className="flex w-full items-center justify-between gap-3 px-2 py-2.5 text-left text-sm transition-colors hover:bg-accent/40">
                    <div className="min-w-0">
                      <p className="flex items-center gap-1.5 truncate font-medium">
                        {m.categoria ?? "—"}
                        {m.es_personal && <span className="rounded-full border border-border bg-secondary/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">Personal</span>}
                        {!tieneComprobante && <span title="Sin comprobante"><Paperclip className="size-3 text-warning" /></span>}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{sub ? `${sub} · ` : ""}{fechaCorta(m.fecha)}</p>
                    </div>
                    <span className="shrink-0 font-medium" style={{ color }}>{m.kind === "income" ? "+" : "−"}{money(m.monto, m.moneda)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {detail && (
        <TransactionDetail
          mov={detail} onClose={() => setDetail(null)}
          categoriasIngreso={categoriasIngreso} categoriasGasto={categoriasGasto} categoriasGastoPersonal={categoriasGastoPersonal}
          projects={projects} brands={brands} clients={clients} brandMap={brandMap}
        />
      )}
    </div>
  );
}

function TotalCard({ label, dop, usd, tone }: { label: string; dop: number; usd: number; tone: string }) {
  const color = tone === "success" ? "var(--success)" : tone === "destructive" ? "var(--destructive)" : "var(--electric)";
  const Icon = tone === "success" ? ArrowUpRight : tone === "destructive" ? ArrowDownRight : ArrowUpDown;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label} (filtrado)</p>
        <span className="flex size-7 items-center justify-center rounded-lg" style={{ backgroundColor: `color-mix(in srgb, ${color} 14%, transparent)`, color }}><Icon className="size-4" /></span>
      </div>
      <p className="mt-2 text-xl font-bold tracking-tight tabular-nums" style={{ color }}>{money(dop, "DOP")}</p>
      {usd !== 0 && <p className="text-sm text-muted-foreground tabular-nums">{money(usd, "USD")}</p>}
    </div>
  );
}

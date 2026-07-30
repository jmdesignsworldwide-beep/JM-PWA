"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, RefreshCw, Repeat, TrendingUp, TrendingDown, Building2, User } from "lucide-react";
import { addRecurringPlan, toggleRecurring, generateRecurringDue } from "@/app/(app)/finanzas/actions";
import { money, fechaCorta } from "@/lib/format";
import { rdToday } from "@/lib/fecha";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Plan = {
  id: string; client_id: string | null; clase: string; es_personal: boolean;
  categoria: string | null; concepto: string | null; tipo: string | null; monto: number; moneda: string;
  frecuencia: string | null; proxima_factura: string | null; activo: boolean;
};
type Opt = { id: string; nombre: string };

export function RecurringManager({ plans, mrr, mreGasto = 0, clients, clientMap, brands = [], categoriasGasto = [], categoriasGastoPersonal = [] }: {
  plans: Plan[]; mrr: number; mreGasto?: number; clients: Opt[]; clientMap: Record<string, string>;
  brands?: Opt[]; categoriasGasto?: string[]; categoriasGastoPersonal?: string[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [genMsg, setGenMsg] = useState<string | null>(null);

  // Form (controlado por los condicionales clase/ámbito).
  const [clase, setClase] = useState<"ingreso" | "gasto">("ingreso");
  const [personal, setPersonal] = useState(false);
  const [clientId, setClientId] = useState("");
  const [tipo, setTipo] = useState("mantenimiento");
  const [categoria, setCategoria] = useState("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"DOP" | "USD">("DOP");
  const [frecuencia, setFrecuencia] = useState<"quincenal" | "mensual" | "trimestral" | "anual">("mensual");
  const [prox, setProx] = useState(rdToday());
  const [brandId, setBrandId] = useState("");

  function reset() {
    setClase("ingreso"); setPersonal(false); setClientId(""); setTipo("mantenimiento");
    setCategoria(""); setConcepto(""); setMonto(""); setMoneda("DOP"); setFrecuencia("mensual");
    setProx(rdToday()); setBrandId(""); setError(null);
  }

  function create() {
    setError(null);
    const m = Number(monto);
    if (!m || m <= 0) { setError("Escribe un monto mayor que cero."); return; }
    if (clase === "ingreso" && !personal && !clientId) { setError("Elige el cliente del ingreso recurrente."); return; }
    startTransition(async () => {
      const res = await addRecurringPlan({
        clase, es_personal: personal,
        client_id: clase === "ingreso" && !personal ? clientId : null,
        tipo: clase === "ingreso" && !personal ? (tipo as "mantenimiento" | "hosting" | "retainer") : null,
        categoria: categoria || null, concepto: concepto || null,
        monto: m, moneda, frecuencia, proxima_factura: prox,
        brand_id: personal ? null : (brandId || null),
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false); reset(); router.refresh();
    });
  }

  const catBase = personal && categoriasGastoPersonal.length ? categoriasGastoPersonal : categoriasGasto;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><TrendingUp className="size-3.5 text-success" /> Ingreso recurrente / mes</p>
          <p className="text-2xl font-semibold text-gradient">{money(mrr, "DOP")}</p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground"><TrendingDown className="size-3.5 text-destructive" /> Gasto recurrente / mes</p>
          <p className="text-2xl font-semibold" style={{ color: "var(--destructive)" }}>{money(mreGasto, "DOP")}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" disabled={pending}
            onClick={() => startTransition(async () => { const r = await generateRecurringDue(); setGenMsg(`Generadas: ${r.generadas ?? 0}`); router.refresh(); })}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Generar vencidas
          </Button>
          <Button variant="gradient" onClick={() => { reset(); setOpen(true); }}><Plus className="size-4" /> Nuevo plan</Button>
        </div>
      </div>
      {genMsg && <p className="text-sm text-success">{genMsg}</p>}

      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          Sin planes recurrentes. Crea ingresos (mantenimiento, hosting) o gastos (casa, luz, agua).
        </div>
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => {
            const esGasto = p.clase === "gasto";
            const titulo = esGasto
              ? (p.concepto || p.categoria || "Gasto recurrente")
              : (p.tipo || p.concepto || "Ingreso recurrente");
            const quien = p.es_personal ? "Personal" : (p.client_id ? clientMap[p.client_id] ?? "Cliente" : "Negocio");
            return (
              <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg", esGasto ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success")}>
                  {esGasto ? <TrendingDown className="size-4" /> : <Repeat className="size-4" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium capitalize">{titulo} · <span className="text-muted-foreground">{quien}</span></p>
                  <p className="text-xs text-muted-foreground">{p.frecuencia} · próxima: {fechaCorta(p.proxima_factura)}</p>
                </div>
                <Badge dot={esGasto ? "var(--destructive)" : "var(--success)"}>{esGasto ? "−" : "+"}{money(p.monto, p.moneda)}</Badge>
                <Switch checked={p.activo} onCheckedChange={(v) => startTransition(async () => { await toggleRecurring(p.id, v); router.refresh(); })} />
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo plan recurrente" description="Se genera solo cada período, sin que lo metas a mano." className="max-w-md">
        <div className="space-y-4">
          {/* Clase: ingreso vs gasto */}
          <div className="grid grid-cols-2 gap-2">
            {([["ingreso", "Ingreso", TrendingUp], ["gasto", "Gasto", TrendingDown]] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => setClase(k)}
                className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  clase === k ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          {/* Ámbito: negocio vs personal */}
          <div className="grid grid-cols-2 gap-2">
            {([["negocio", false, Building2, "Negocio"], ["personal", true, User, "Personal"]] as const).map(([k, val, Icon, label]) => (
              <button key={k} type="button" onClick={() => setPersonal(val)}
                className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  personal === val ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          {/* Ingreso de negocio → cliente + tipo */}
          {clase === "ingreso" && !personal && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2"><Label>Cliente</Label>
                <Select value={clientId} onChange={(e) => setClientId(e.target.value)}><option value="">— Elegir —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select>
              </div>
              <div className="space-y-1.5"><Label>Tipo</Label>
                <Select value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="mantenimiento">Mantenimiento</option><option value="hosting">Hosting</option><option value="retainer">Retainer</option></Select>
              </div>
              {brands.length > 0 && (
                <div className="space-y-1.5"><Label>Marca</Label>
                  <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}><option value="">— Ninguna —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</Select>
                </div>
              )}
            </div>
          )}

          {/* Gasto (o ingreso personal) → concepto + categoría */}
          {(clase === "gasto" || personal) && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label>Concepto</Label>
                <Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder={clase === "gasto" ? "Ej. Luz, Casa, Agua" : "Ej. Suscripción"} />
              </div>
              <div className="space-y-1.5"><Label>Categoría</Label>
                {clase === "gasto" && catBase.length ? (
                  <Select value={categoria} onChange={(e) => setCategoria(e.target.value)}><option value="">— Sin categoría —</option>{catBase.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
                ) : (
                  <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Opcional" />
                )}
              </div>
              {!personal && brands.length > 0 && (
                <div className="space-y-1.5 sm:col-span-2"><Label>Marca</Label>
                  <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}><option value="">— Ninguna —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</Select>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monto</Label><Input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Moneda</Label><Select value={moneda} onChange={(e) => setMoneda(e.target.value as "DOP" | "USD")}><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            <div className="space-y-1.5"><Label>Frecuencia</Label>
              <Select value={frecuencia} onChange={(e) => setFrecuencia(e.target.value as typeof frecuencia)}>
                <option value="quincenal">Quincenal</option><option value="mensual">Mensual</option><option value="trimestral">Trimestral</option><option value="anual">Anual</option>
              </Select></div>
            <div className="space-y-1.5"><Label>Próxima fecha</Label><DatePicker value={prox} onChange={setProx} /></div>
          </div>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="gradient" onClick={create} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Guardar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

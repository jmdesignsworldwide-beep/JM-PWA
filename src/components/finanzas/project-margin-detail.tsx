"use client";

import { useState, useTransition } from "react";
import { ArrowUpRight, ArrowDownRight, ImageIcon, User, Tag, Wallet } from "lucide-react";
import { money, fechaCorta } from "@/lib/format";
import { getSignedDocUrl } from "@/app/(app)/clientes/actions";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { ProjectMargin } from "@/lib/data/finanzas";

const TIPO_LABEL: Record<string, string> = { inicial: "Inicial", entrega: "Entrega", abono: "Abono" };

/**
 * Detalle de "Ganancia real por proyecto": cliente, marca, cada abono cobrado
 * (con su comprobante) y cada gasto asignado. La ganancia es precio contratado −
 * gastos. Un proyecto en RD$0 (p. ej. un favor o software regalado) no es un
 * error: se muestra con su gasto y una nota neutral.
 */
export function ProjectMarginDetail({ m, onClose }: { m: ProjectMargin; onClose: () => void }) {
  const [, start] = useTransition();
  const [abriendo, setAbriendo] = useState<string | null>(null);

  function ver(url: string) {
    setAbriendo(url);
    start(async () => {
      const res = await getSignedDocUrl(url);
      if (res?.url) window.open(res.url, "_blank");
      else alert(res?.error ?? "No se pudo abrir el comprobante");
      setAbriendo(null);
    });
  }

  const sinCobro = m.precio_total === 0;
  const pendiente = m.precio_total - m.cobrado;

  return (
    <Dialog open onClose={onClose} title={m.nombre ?? "Proyecto"} description="Historial real de este trabajo" className="max-w-lg">
      <div className="max-h-[70vh] space-y-4 overflow-y-auto">
        {/* Cliente + marca */}
        <div className="flex flex-wrap gap-2">
          {m.clienteNombre && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs">
              <User className="size-3" /> {m.clienteNombre}
            </span>
          )}
          {m.brandNombre && (
            <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-xs">
              <Tag className="size-3" /> {m.brandNombre}
            </span>
          )}
        </div>

        {/* Resumen de números */}
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Contratado" value={money(m.precio_total, m.moneda)} />
          <Stat label="Cobrado" value={money(m.cobrado, m.moneda)} tone="success" />
          <Stat label="Gastos" value={money(m.gastos, m.moneda)} tone="destructive" />
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground"><Wallet className="size-4" /> Ganancia real</span>
            <span className="text-lg font-bold" style={{ color: m.ganancia >= 0 ? "var(--success)" : "var(--destructive)" }}>{money(m.ganancia, m.moneda)}</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {sinCobro
              ? "Este trabajo no tiene precio de cobro (RD$0). Se muestra solo su gasto asignado."
              : <>Precio contratado − gastos · margen {m.margen.toFixed(0)}%{pendiente > 0 ? ` · falta cobrar ${money(pendiente, m.moneda)}` : ""}</>}
          </p>
        </div>

        {/* Abonos cobrados */}
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ArrowUpRight className="size-4 text-success" /> Cobros ({m.abonos.length})</h4>
          {m.abonos.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">Aún no hay pagos registrados.</p>
          ) : (
            <ul className="space-y-1.5">
              {m.abonos.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 font-medium">
                      {money(a.monto, a.moneda)}
                      <Badge dot="var(--electric)">{TIPO_LABEL[a.tipo] ?? a.tipo}</Badge>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{[a.metodo, a.nota].filter(Boolean).join(" · ") || "—"} · {fechaCorta(a.fecha)}</p>
                  </div>
                  {a.comprobante_url && (
                    <button onClick={() => ver(a.comprobante_url!)} disabled={abriendo === a.comprobante_url}
                      className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent/40 disabled:opacity-50" title="Ver comprobante">
                      <ImageIcon className="size-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Gastos asignados */}
        <section>
          <h4 className="mb-2 flex items-center gap-1.5 text-sm font-semibold"><ArrowDownRight className="size-4 text-destructive" /> Gastos asignados ({m.gastosList.length})</h4>
          {m.gastosList.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">Sin gastos asignados a este trabajo.</p>
          ) : (
            <ul className="space-y-1.5">
              {m.gastosList.map((g) => (
                <li key={g.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{g.categoria ?? "Gasto"}</p>
                    <p className="truncate text-xs text-muted-foreground">{[g.comercio, g.descripcion].filter(Boolean).join(" · ") || "—"} · {fechaCorta(g.fecha)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="font-medium text-destructive">−{money(g.monto, g.moneda)}</span>
                    {g.factura_url && (
                      <button onClick={() => ver(g.factura_url!)} disabled={abriendo === g.factura_url}
                        className="rounded-lg border border-border p-1.5 text-muted-foreground transition-colors hover:bg-accent/40 disabled:opacity-50" title="Ver comprobante">
                        <ImageIcon className="size-4" />
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "success" | "destructive" }) {
  const color = tone === "success" ? "var(--success)" : tone === "destructive" ? "var(--destructive)" : undefined;
  return (
    <div className="rounded-lg border border-border bg-card px-2 py-2 text-center">
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm font-bold" style={color ? { color } : undefined}>{value}</p>
    </div>
  );
}

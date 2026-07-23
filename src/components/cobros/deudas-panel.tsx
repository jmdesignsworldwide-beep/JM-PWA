"use client";

import { useState } from "react";
import Link from "next/link";
import { Wallet, ChevronRight, CheckCircle2, ExternalLink } from "lucide-react";
import type { SaldoCliente } from "@/lib/data/agenda";
import { money } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PagosManager } from "@/components/pedidos/pagos-manager";

/**
 * Saldos por cliente en Cobros: lo que cada uno debe (pendiente), lo pagado y
 * el total contratado — desde pedidos + pagos. Clic en un cliente abre el
 * registro de pago (mismo control que en el pedido), sin doble registro.
 */
export function DeudasPanel({ saldos, openClientId }: { saldos: SaldoCliente[]; openClientId?: string }) {
  // Deep-link desde la ficha del cliente (?cliente=<id>): abre su pago al cargar.
  const [sel, setSel] = useState<SaldoCliente | null>(
    () => (openClientId ? saldos.find((c) => c.id === openClientId) ?? null : null),
  );

  const conSaldo = saldos.filter((c) => c.porMoneda.some((m) => m.saldo > 0));
  const saldados = saldos.filter((c) => !c.porMoneda.some((m) => m.saldo > 0));

  if (saldos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
        Aún no hay pedidos con saldo. Cuando crees pedidos y registres pagos, aquí verás lo que cada cliente debe.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {conSaldo.map((c) => <Fila key={c.id} c={c} onClick={() => setSel(c)} />)}
        {saldados.length > 0 && (
          <details className="rounded-xl border border-border bg-card/60">
            <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-muted-foreground">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" /> {saldados.length} cliente{saldados.length === 1 ? "" : "s"} al día (sin saldo)
              </span>
            </summary>
            <div className="space-y-2 px-2 pb-2">
              {saldados.map((c) => <Fila key={c.id} c={c} onClick={() => setSel(c)} />)}
            </div>
          </details>
        )}
      </div>

      {sel && (
        <Dialog open onClose={() => setSel(null)} title={`Pagos · ${sel.nombre}`} className="max-w-xl">
          <div className="mb-3 flex justify-end">
            <Link href={`/clientes/${sel.id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground">
              Ver cliente <ExternalLink className="size-3.5" />
            </Link>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <PagosManager clientId={sel.id} orders={sel.orders} payments={sel.payments} />
          </div>
        </Dialog>
      )}
    </>
  );
}

function Fila({ c, onClick }: { c: SaldoCliente; onClick: () => void }) {
  const saldado = !c.porMoneda.some((m) => m.saldo > 0);
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left transition-colors hover:border-electric/40 hover:bg-accent/40"
    >
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-electric/10 text-electric">
          <Wallet className="size-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate font-medium">{c.nombre}</p>
          <p className="truncate text-xs text-muted-foreground">
            {c.porMoneda.map((m) => `Pagado ${money(m.pagado, m.moneda)} de ${money(m.total, m.moneda)}`).join(" · ")}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {saldado ? (
          <Badge dot="var(--success)">Al día</Badge>
        ) : (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Saldo</p>
            {c.porMoneda.filter((m) => m.saldo > 0).map((m) => (
              <p key={m.moneda} className="font-semibold tabular-nums text-warning">{money(m.saldo, m.moneda)}</p>
            ))}
          </div>
        )}
        <ChevronRight className="size-4 text-muted-foreground" />
      </div>
    </button>
  );
}

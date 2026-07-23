"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wallet, Plus, Loader2, Trash2, CheckCircle2, HandCoins, Banknote, Paperclip, ImageIcon,
} from "lucide-react";
import { addOrderPayment, deleteOrderPayment } from "@/app/(app)/pedidos/actions";
import { getSignedDocUrl } from "@/app/(app)/clientes/actions";
import { uploadFile } from "@/lib/upload";
import { money, fechaCorta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

export type PagoOrder = { id: string; total: number; moneda: string; fecha: string; estado: string };
export type Pago = {
  id: string; order_id: string; monto: number; moneda: string;
  fecha: string; tipo: string; metodo: string | null; nota: string | null;
  comprobante_url: string | null;
};

const TIPO_LABEL: Record<string, string> = {
  inicial: "Inicial",
  entrega: "A la entrega",
  abono: "Abono",
};

function hoyIso() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Control total de pagos del cliente: registra abonos manualmente (plan 50/50 o
 * monto libre con fecha) y muestra de un vistazo Total / Pagado / Falta.
 * Reutilizable: en un pedido (lockedOrderId) o en el cliente (varios pedidos).
 */
export function PagosManager({
  clientId,
  orders,
  payments,
  lockedOrderId,
  readOnly = false,
  cobrosHref,
}: {
  clientId: string;
  orders: PagoOrder[];
  payments: Pago[];
  lockedOrderId?: string;
  /** Solo lectura (ficha del cliente): muestra saldo + historial, sin registrar. */
  readOnly?: boolean;
  /** Si se pasa, un botón lleva a Cobros con este cliente para registrar el pago. */
  cobrosHref?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const scopeOrders = lockedOrderId ? orders.filter((o) => o.id === lockedOrderId) : orders;
  const scopePayments = lockedOrderId ? payments.filter((p) => p.order_id === lockedOrderId) : payments;

  // Resumen por moneda: Total (suma de pedidos) / Pagado (suma de abonos) / Falta.
  const resumen = useMemo(() => {
    const map = new Map<string, { total: number; pagado: number }>();
    for (const o of scopeOrders) {
      const e = map.get(o.moneda) ?? { total: 0, pagado: 0 };
      e.total += Number(o.total) || 0;
      map.set(o.moneda, e);
    }
    for (const p of scopePayments) {
      const e = map.get(p.moneda) ?? { total: 0, pagado: 0 };
      e.pagado += Number(p.monto) || 0;
      map.set(p.moneda, e);
    }
    return [...map.entries()].map(([moneda, v]) => ({
      moneda,
      total: v.total,
      pagado: v.pagado,
      falta: Math.max(0, v.total - v.pagado),
    }));
  }, [scopeOrders, scopePayments]);

  // Pedido seleccionado para registrar (fijo si lockedOrderId).
  const [orderId, setOrderId] = useState(lockedOrderId ?? orders[0]?.id ?? "");
  const selOrder = orders.find((o) => o.id === orderId);
  const moneda = (selOrder?.moneda as "DOP" | "USD") ?? "DOP";

  const [monto, setMonto] = useState("");
  const [fecha, setFecha] = useState(() => hoyIso());
  const [tipo, setTipo] = useState<"inicial" | "entrega" | "abono">("abono");
  const [metodo, setMetodo] = useState("");
  const [nota, setNota] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);
  const [fileKey, setFileKey] = useState(0);

  function registrar(montoNum: number, tipoPago: "inicial" | "entrega" | "abono", reset: () => void) {
    setError(null);
    if (!orderId) { setError("Crea un pedido primero para registrar el pago."); return; }
    if (!montoNum || montoNum <= 0) { setError("Escribe un monto mayor que cero."); return; }
    start(async () => {
      // Comprobante opcional: sube la captura/voucher al bucket privado.
      let comprobante_url: string | null = null;
      if (comprobante) {
        comprobante_url = await uploadFile("comprobantes", comprobante);
        if (!comprobante_url) { setError("No se pudo subir el comprobante."); return; }
      }
      const res = await addOrderPayment({
        order_id: orderId, monto: montoNum, moneda, fecha,
        tipo: tipoPago, metodo, nota, comprobante_url,
      });
      if (res?.error) { setError(res.error); return; }
      setComprobante(null); setFileKey((k) => k + 1);
      reset();
      router.refresh();
    });
  }

  function borrar(id: string, ordId: string) {
    if (!confirm("¿Borrar este pago? El saldo se recalcula.")) return;
    start(async () => {
      await deleteOrderPayment(id, ordId, clientId);
      router.refresh();
    });
  }

  async function verComprobante(url: string) {
    const res = await getSignedDocUrl(url);
    if (res?.url) window.open(res.url, "_blank");
    else alert(res?.error ?? "No se pudo abrir el comprobante");
  }

  const mitad = selOrder ? Math.round((Number(selOrder.total) / 2) * 100) / 100 : 0;
  const noOrders = orders.length === 0;

  return (
    <div className="space-y-5">
      {/* Resumen Total / Pagado / Falta */}
      {resumen.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-10 text-center text-sm text-muted-foreground">
          {noOrders
            ? "Aún no hay pedidos. Crea uno para empezar a registrar pagos."
            : "Sin movimientos todavía. Registra el primer abono abajo."}
        </div>
      ) : (
        <div className="space-y-3">
          {resumen.map((r) => {
            const saldado = r.falta <= 0 && r.total > 0;
            return (
              <div key={r.moneda} className="rounded-xl border border-border bg-card p-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <Resumen label="Total" value={money(r.total, r.moneda)} />
                  <Resumen label="Pagado" value={money(r.pagado, r.moneda)} accent="text-success" />
                  <Resumen
                    label="Falta"
                    value={money(r.falta, r.moneda)}
                    accent={saldado ? "text-success" : "text-warning"}
                  />
                </div>
                {saldado && (
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="size-3.5" /> Pagado por completo · {r.moneda}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Solo lectura: botón para registrar el pago en Cobros (no dentro de la ficha) */}
      {readOnly && cobrosHref && resumen.length > 0 && (
        <Link href={cobrosHref}>
          <Button variant="outline" size="sm" className="w-full justify-center">
            <Wallet className="size-4" /> Registrar pago en Cobros
          </Button>
        </Link>
      )}

      {/* Registrar pago */}
      {!readOnly && !noOrders && (
        <div className="rounded-xl border border-border bg-background/40 p-4">
          <h4 className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="size-4 text-electric" /> Registrar pago
          </h4>

          {/* Selector de pedido (solo en la vista del cliente con varios pedidos) */}
          {!lockedOrderId && orders.length > 1 && (
            <div className="mt-3 space-y-1.5">
              <Label>Pedido</Label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-3 text-sm"
              >
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {fechaCorta(o.fecha)} · {money(o.total, o.moneda)} · {o.estado}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Atajos plan 50/50 */}
          {selOrder && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                variant="outline" size="sm" disabled={pending}
                onClick={() => registrar(mitad, "inicial", () => {})}
              >
                <HandCoins className="size-4" /> 50% inicial · {money(mitad, moneda)}
              </Button>
              <Button
                variant="outline" size="sm" disabled={pending}
                onClick={() => registrar(mitad, "entrega", () => {})}
              >
                <Banknote className="size-4" /> 50% a la entrega · {money(mitad, moneda)}
              </Button>
            </div>
          )}

          {/* Abono libre */}
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Monto ({moneda})</Label>
              <Input
                type="number" inputMode="decimal" min="0" step="0.01"
                value={monto} onChange={(e) => setMonto(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Fecha del pago</Label>
              <DatePicker value={fecha} onChange={setFecha} />
            </div>
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <div className="flex gap-1.5">
                {(["abono", "inicial", "entrega"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTipo(t)}
                    className={cn(
                      "flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition-colors",
                      tipo === t
                        ? "border-electric bg-electric/10 text-foreground"
                        : "border-border text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {TIPO_LABEL[t]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Método (opcional)</Label>
              <Input value={metodo} onChange={(e) => setMetodo(e.target.value)} placeholder="Transferencia, efectivo…" />
            </div>
          </div>
          <div className="mt-3 space-y-1.5">
            <Label>Nota (opcional)</Label>
            <Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Referencia, banco, detalle…" />
          </div>
          <div className="mt-3 space-y-1.5">
            <Label className="flex items-center gap-1.5"><Paperclip className="size-3.5" /> Comprobante (captura / voucher)</Label>
            <Input key={fileKey} type="file" accept="image/*,application/pdf" onChange={(e) => setComprobante(e.target.files?.[0] ?? null)} />
            {comprobante && <p className="text-xs text-muted-foreground">Se adjuntará: {comprobante.name}</p>}
          </div>

          <div className="mt-3 flex items-center justify-between gap-3">
            {error ? <p className="text-sm text-destructive">{error}</p> : <span />}
            <Button
              variant="gradient" size="sm" disabled={pending}
              onClick={() => registrar(Number(monto), tipo, () => { setMonto(""); setNota(""); setMetodo(""); })}
            >
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Registrar abono
            </Button>
          </div>
        </div>
      )}

      {/* Lista de abonos */}
      {scopePayments.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Historial de pagos</p>
          <ul className="space-y-2">
            {scopePayments.map((p) => (
              <li key={p.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                <Wallet className="size-4 shrink-0 text-success" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {money(p.monto, p.moneda)}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">{TIPO_LABEL[p.tipo] ?? p.tipo}</span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {fechaCorta(p.fecha)}{p.metodo ? ` · ${p.metodo}` : ""}{p.nota ? ` · ${p.nota}` : ""}
                  </p>
                </div>
                <Badge dot="var(--success)">Pagado</Badge>
                {p.comprobante_url && (
                  <button
                    title="Ver comprobante"
                    onClick={() => verComprobante(p.comprobante_url!)}
                    className="text-muted-foreground transition-colors hover:text-electric"
                  >
                    <ImageIcon className="size-4" />
                  </button>
                )}
                {!readOnly && (
                  <button
                    title="Borrar pago"
                    onClick={() => borrar(p.id, p.order_id)}
                    className="text-muted-foreground transition-colors hover:text-destructive"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function Resumen({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("mt-0.5 text-base font-semibold tabular-nums", accent)}>{value}</p>
    </div>
  );
}

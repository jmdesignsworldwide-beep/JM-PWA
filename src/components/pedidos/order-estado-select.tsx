"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setOrderEstado } from "@/app/(app)/pedidos/actions";
import { ORDER_ESTADOS, ORDER_ESTADO_COLOR, type OrderEstado } from "@/lib/pedidos";
import { cn } from "@/lib/utils";

/**
 * Selector con color del estado del pedido. Sirve igual en la lista y en el
 * detalle: cambia el estado a mano sin recrear el pedido. El color permite leer
 * la lista de un vistazo.
 */
export function OrderEstadoSelect({
  orderId, estado, className,
}: {
  orderId: string;
  estado: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState(false);

  const value = (ORDER_ESTADOS.some((e) => e.id === estado) ? estado : "borrador") as OrderEstado;
  const color = ORDER_ESTADO_COLOR[value] ?? "var(--muted-foreground)";

  function onChange(next: string) {
    setError(false);
    start(async () => {
      const res = await setOrderEstado(orderId, next as OrderEstado);
      if (res?.error) { setError(true); return; }
      router.refresh();
    });
  }

  return (
    // Frena la propagación para que, dentro de un enlace (tarjeta de la lista),
    // abrir/cambiar el estado no dispare la navegación al detalle.
    <span
      className={cn("relative inline-flex items-center", className)}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="pointer-events-none absolute left-2.5 size-2 rounded-full" style={{ background: color }} />
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        aria-label="Estado del pedido"
        className={cn(
          "h-8 cursor-pointer appearance-none rounded-lg border bg-background/50 pl-6 pr-7 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error ? "border-destructive" : "border-border hover:border-electric/40",
        )}
        style={{ color }}
      >
        {ORDER_ESTADOS.map((e) => (
          <option key={e.id} value={e.id} className="text-foreground">{e.label}</option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2 text-muted-foreground">
        {pending
          ? <Loader2 className="size-3.5 animate-spin" />
          : <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
    </span>
  );
}

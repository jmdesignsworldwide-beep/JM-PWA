"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { setClientEstado } from "@/app/(app)/clientes/actions";
import { ETAPAS } from "@/lib/ventas";
import { cn } from "@/lib/utils";

/**
 * Cambia el estado de una persona (prospecto + etapa, o cliente activo) sin
 * recrearla. Sirve en la ficha y en la lista. Codifica el valor como
 * "lead:<etapa>" o "active:ganado".
 */
const OPCIONES: { value: string; label: string; es_lead: boolean; etapa: string; color: string }[] = [
  ...ETAPAS.filter((e) => e.id !== "ganado").map((e) => ({
    value: `lead:${e.id}`, label: `Prospecto · ${e.label}`, es_lead: true, etapa: e.id, color: e.color,
  })),
  { value: "active:ganado", label: "Cliente activo", es_lead: false, etapa: "ganado", color: "var(--success)" },
];

export function EstadoSelect({
  clientId, esLead, etapa, className,
}: {
  clientId: string;
  esLead: boolean;
  etapa: string;
  className?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const current = esLead ? `lead:${etapa}` : "active:ganado";
  const activeColor = OPCIONES.find((o) => o.value === current)?.color ?? "var(--muted-foreground)";

  function onChange(value: string) {
    const opt = OPCIONES.find((o) => o.value === value);
    if (!opt) return;
    setError(false);
    startTransition(async () => {
      const res = await setClientEstado(clientId, { es_lead: opt.es_lead, etapa_venta: opt.etapa as never });
      if (res?.error) { setError(true); return; }
      router.refresh();
    });
  }

  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <span className="pointer-events-none absolute left-2.5 size-2 rounded-full" style={{ background: activeColor }} />
      <select
        value={current}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className={cn(
          "h-9 cursor-pointer appearance-none rounded-lg border bg-background/50 pl-6 pr-7 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          error ? "border-destructive" : "border-border hover:border-electric/40",
        )}
      >
        {OPCIONES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <span className="pointer-events-none absolute right-2 text-muted-foreground">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <svg width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
      </span>
    </span>
  );
}

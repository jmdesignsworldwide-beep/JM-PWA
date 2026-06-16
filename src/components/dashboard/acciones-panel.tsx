"use client";

import { useState } from "react";
import Link from "next/link";
import { MessageCircle, Sparkles, X, Loader2, Zap } from "lucide-react";
import type { SuggestedAction } from "@/lib/data/acciones";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const TIPO_COLOR: Record<string, string> = {
  cobro: "var(--success)", contrato: "var(--electric)", lead: "var(--brand-purple)",
  proyecto: "var(--warning)", recurrente: "var(--teal)",
};

export function AccionesPanel({ acciones }: { acciones: SuggestedAction[] }) {
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const visibles = acciones.filter((a) => !hidden.has(a.id));

  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <Zap className="size-4 text-warning" />
        <h2 className="font-semibold">Acciones sugeridas hoy</h2>
        {visibles.length > 0 && <Badge>{visibles.length}</Badge>}
      </div>
      <div className="space-y-2 p-3">
        {visibles.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Nada urgente por ahora. El sistema sigue vigilando. ✅</p>
        ) : visibles.map((a) => (
          <AccionRow key={a.id} a={a} onHide={() => setHidden((s) => new Set(s).add(a.id))} />
        ))}
      </div>
    </div>
  );
}

function AccionRow({ a, onHide }: { a: SuggestedAction; onHide: () => void }) {
  const [waText, setWaText] = useState(a.waText);
  const [loadingAI, setLoadingAI] = useState(false);
  const phone = (a.phone ?? "").replace(/\D/g, "");
  const waHref = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waText)}` : null;

  async function redactarIA() {
    setLoadingAI(true);
    try {
      const r = await fetch("/api/ai/followup", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: a.tipo, nombre: a.nombre, detalle: a.detalle }),
      });
      const j = await r.json();
      if (j.ok && j.mensaje) setWaText(j.mensaje);
    } catch { /* mantiene el mensaje por defecto */ }
    finally { setLoadingAI(false); }
  }

  return (
    <div className={cn("flex items-start gap-3 rounded-lg border px-3 py-2.5 text-sm",
      a.prioridad >= 100 ? "border-destructive/40 bg-destructive/10" : "border-border")}>
      <span className="mt-1.5 size-2 shrink-0 rounded-full" style={{ background: TIPO_COLOR[a.tipo] }} />
      <div className="min-w-0 flex-1">
        <p className="font-medium">
          {a.clientId ? <Link href={`/clientes/${a.clientId}`} className="hover:text-electric">{a.titulo}</Link> : a.titulo}
        </p>
        <p className="text-xs text-muted-foreground">{a.detalle}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        {phone && (
          <button onClick={redactarIA} disabled={loadingAI} title="Redactar con IA" className="rounded-md p-1.5 text-electric hover:bg-accent">
            {loadingAI ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          </button>
        )}
        {waHref && (
          <a href={waHref} target="_blank" rel="noopener noreferrer" title="Enviar WhatsApp">
            <Button variant="ghost" size="icon" className="size-8 text-success"><MessageCircle className="size-4" /></Button>
          </a>
        )}
        <button onClick={onHide} title="Descartar" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, MessageCircle, Loader2 } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS } from "@/lib/eventos";
import { waLink } from "@/lib/mensajes";
import { money, fechaCorta } from "@/lib/format";
import { toggleCompletado } from "@/app/(app)/cobros/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function EventItem({
  e,
  vencido = false,
  showDate = true,
}: {
  e: AgendaEvent;
  vencido?: boolean;
  showDate?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tipo = e.tipo ? EVENT_TIPOS[e.tipo] : null;
  const wa = waLink(e);
  const nombre = e.cliente ? `${e.cliente.nombre} ${e.cliente.apellido ?? ""}`.trim() : null;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors",
        vencido ? "border-destructive/40 bg-destructive/10" : "border-border bg-card",
      )}
    >
      <span className="size-2 shrink-0 rounded-full" style={{ background: tipo?.color }} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {tipo && <Badge dot={tipo.color}>{tipo.label}</Badge>}
          {nombre && (
            e.client_id ? (
              <Link href={`/clientes/${e.client_id}`} className="truncate font-medium hover:text-electric">
                {nombre}
              </Link>
            ) : <span className="truncate font-medium">{nombre}</span>
          )}
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {e.titulo}
          {showDate ? ` · ${fechaCorta(e.fecha)}` : ""}
        </p>
      </div>

      {e.monto != null && (
        <span className={cn("shrink-0 font-medium", vencido && "text-destructive")}>
          {money(e.monto, e.moneda ?? "DOP")}
        </span>
      )}

      <div className="flex shrink-0 items-center gap-1">
        {wa && (
          <a href={wa} target="_blank" rel="noopener noreferrer" title="Enviar WhatsApp (ya redactado)">
            <Button variant="ghost" size="icon" className="size-8 text-success">
              <MessageCircle className="size-4" />
            </Button>
          </a>
        )}
        <Button
          variant="ghost" size="icon" className="size-8"
          title="Marcar como hecho"
          disabled={pending}
          onClick={() => startTransition(async () => { await toggleCompletado(e.id, true); router.refresh(); })}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, RotateCcw, Trash2, MessageCircle, Video, MapPin, User, Megaphone, Clock } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS } from "@/lib/eventos";
import { waLink } from "@/lib/mensajes";
import { money, fechaCorta } from "@/lib/format";
import { toggleCompletado, deleteEvent } from "@/app/(app)/cobros/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function EventDetail({ e, onClose }: { e: AgendaEvent; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tipo = e.tipo ? EVENT_TIPOS[e.tipo] : null;
  const wa = waLink(e);
  const nombre = e.cliente ? `${e.cliente.nombre} ${e.cliente.apellido ?? ""}`.trim() : null;

  function done(v: boolean) {
    startTransition(async () => { await toggleCompletado(e.id, v); router.refresh(); onClose(); });
  }
  function borrar() {
    startTransition(async () => { await deleteEvent(e.id); router.refresh(); onClose(); });
  }

  return (
    <Dialog open onClose={onClose} title={e.titulo ?? tipo?.label ?? "Evento"} className="max-w-md">
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          {tipo && <Badge dot={tipo.color}>{tipo.label}</Badge>}
          <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
            <Clock className="size-3.5" /> {fechaCorta(e.fecha)}{e.hora ? ` · ${e.hora}` : ""}
          </span>
          {e.completado && <Badge dot="var(--success)">Completado</Badge>}
        </div>

        {e.monto != null && (
          <p className="text-2xl font-bold tracking-tight" style={{ color: tipo?.color }}>{money(e.monto, e.moneda ?? "DOP")}</p>
        )}

        <div className="space-y-2 text-sm">
          {nombre && (
            <Row icon={<User className="size-4" />}>
              {e.client_id ? <Link href={`/clientes/${e.client_id}`} className="font-medium hover:text-electric">{nombre}</Link> : <span className="font-medium">{nombre}</span>}
            </Row>
          )}
          {e.influencer && (
            <Row icon={<Megaphone className="size-4" />}>
              {e.influencer_id ? <Link href={`/influencers/${e.influencer_id}`} className="font-medium hover:text-electric">{e.influencer.nombre}</Link> : <span className="font-medium">{e.influencer.nombre}</span>}
            </Row>
          )}
          {e.ubicacion && <Row icon={<MapPin className="size-4" />}><span>{e.ubicacion}</span></Row>}
          {e.descripcion && <p className="whitespace-pre-wrap rounded-lg border border-border bg-background/40 p-3 text-muted-foreground">{e.descripcion}</p>}
        </div>

        {/* Enlaces rápidos */}
        <div className="flex flex-wrap gap-2">
          {e.meeting_url && (
            <a href={e.meeting_url} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm"><Video className="size-4" /> Unirse a la reunión</Button>
            </a>
          )}
          {wa && (
            <a href={wa} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="text-success"><MessageCircle className="size-4" /> WhatsApp</Button>
            </a>
          )}
        </div>

        {/* Acciones */}
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={borrar} disabled={pending}>
            <Trash2 className="size-4" /> Borrar
          </Button>
          {e.completado ? (
            <Button variant="outline" size="sm" onClick={() => done(false)} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <RotateCcw className="size-4" />} Marcar pendiente
            </Button>
          ) : (
            <Button variant="gradient" size="sm" onClick={() => done(true)} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Marcar hecho
            </Button>
          )}
        </div>
      </div>
    </Dialog>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-muted-foreground">{icon}<div className="min-w-0 text-foreground">{children}</div></div>;
}

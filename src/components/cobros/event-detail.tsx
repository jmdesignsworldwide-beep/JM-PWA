"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Check, RotateCcw, Trash2, MessageCircle, Video, MapPin, User, Megaphone, Clock, Repeat, Pencil, X } from "lucide-react";
import type { AgendaEvent } from "@/lib/data/agenda";
import { EVENT_TIPOS, EVENT_TIPO_LIST } from "@/lib/eventos";
import { FREQ_LABEL, type Freq } from "@/lib/recurrence";
import { waLink } from "@/lib/mensajes";
import { money, fechaCorta } from "@/lib/format";
import { toggleCompletado, deleteEvent, updateEvent, type EventScope } from "@/app/(app)/cobros/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";

type EvTipo = "inicio" | "entrega" | "cobro" | "acuerdo" | "personal";

export function EventDetail({ e, onClose }: { e: AgendaEvent; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const tipo = e.tipo ? EVENT_TIPOS[e.tipo] : null;
  const wa = waLink(e);
  const nombre = e.cliente ? `${e.cliente.nombre} ${e.cliente.apellido ?? ""}`.trim() : null;
  const esRecurrente = !!(e.recurrence || e.recurrence_parent_id || e.esOcurrencia);

  const [editing, setEditing] = useState(false);
  const [delScope, setDelScope] = useState(false); // pedir alcance al borrar (recurrente)
  const [saveScope, setSaveScope] = useState(false); // pedir alcance al guardar (recurrente)

  // Form de edición
  const [f, setF] = useState({
    titulo: e.titulo ?? "",
    tipo: (e.tipo ?? "personal") as EvTipo,
    fecha: e.fecha,
    hora: e.hora ?? "",
    monto: e.monto != null ? String(e.monto) : "",
    moneda: (e.moneda === "USD" ? "USD" : "DOP") as "DOP" | "USD",
    descripcion: e.descripcion ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  function done(v: boolean) {
    startTransition(async () => { await toggleCompletado(e.id, v); router.refresh(); onClose(); });
  }
  function borrar(scope: EventScope = "una") {
    startTransition(async () => { await deleteEvent(e.id, scope); router.refresh(); onClose(); });
  }
  function guardar(scope: EventScope = "una") {
    const patch = {
      titulo: f.titulo.trim() || null,
      tipo: f.tipo,
      fecha: f.fecha,
      hora: f.hora || null,
      monto: f.tipo === "cobro" && f.monto ? Number(f.monto) : null,
      moneda: f.tipo === "cobro" && f.monto ? f.moneda : null,
      descripcion: f.descripcion.trim() || null,
    };
    startTransition(async () => { await updateEvent(e.id, patch, scope); router.refresh(); onClose(); });
  }

  const freqLabel = e.recurrence ? FREQ_LABEL[e.recurrence as Freq] : null;

  return (
    <Dialog open onClose={onClose} title={e.titulo ?? tipo?.label ?? "Evento"} className="max-w-md">
      {!editing ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {tipo && <Badge dot={tipo.color}>{tipo.label}</Badge>}
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Clock className="size-3.5" /> {fechaCorta(e.fecha)}{e.hora ? ` · ${e.hora}` : ""}
            </span>
            {esRecurrente && <Badge dot="var(--electric)"><Repeat className="mr-1 inline size-3" />{freqLabel ?? "Recurrente"}</Badge>}
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

          {/* Pedir alcance al borrar un recurrente */}
          {delScope ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <p className="mb-2 text-sm text-destructive">Este evento se repite. ¿Qué quieres borrar?</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setDelScope(false)}>Cancelar</Button>
                <Button variant="outline" size="sm" onClick={() => borrar("una")} disabled={pending}>Solo esta</Button>
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => borrar("serie")} disabled={pending}>Toda la serie</Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => (esRecurrente ? setDelScope(true) : borrar("una"))} disabled={pending}>
                <Trash2 className="size-4" /> Borrar
              </Button>
              <Button variant="outline" size="sm" onClick={() => setEditing(true)} disabled={pending}><Pencil className="size-4" /> Editar</Button>
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
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">Editar evento</p>
            <button onClick={() => setEditing(false)} className="rounded-md p-1 text-muted-foreground hover:bg-accent"><X className="size-4" /></button>
          </div>
          <div className="space-y-1.5"><Label>Título</Label><Input value={f.titulo} onChange={(ev) => set("titulo", ev.target.value)} /></div>
          <div className="space-y-1.5"><Label>Tipo</Label>
            <Select value={f.tipo} onChange={(ev) => set("tipo", ev.target.value as EvTipo)}>
              {EVENT_TIPO_LIST.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha</Label><DatePicker value={f.fecha} onChange={(v) => set("fecha", v)} /></div>
            <div className="space-y-1.5"><Label>Hora</Label><Input type="time" value={f.hora} onChange={(ev) => set("hora", ev.target.value)} /></div>
          </div>
          {f.tipo === "cobro" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Monto</Label><Input type="number" step="0.01" min="0" value={f.monto} onChange={(ev) => set("monto", ev.target.value)} /></div>
              <div className="space-y-1.5"><Label>Moneda</Label><Select value={f.moneda} onChange={(ev) => set("moneda", ev.target.value as "DOP" | "USD")}><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            </div>
          )}
          <div className="space-y-1.5"><Label>Descripción</Label><Textarea rows={2} value={f.descripcion} onChange={(ev) => set("descripcion", ev.target.value)} /></div>
          {esRecurrente && f.fecha !== e.fecha && <p className="text-xs text-muted-foreground">Cambiar la fecha aplica solo a esta ocurrencia (la serie mantiene su patrón).</p>}

          {saveScope ? (
            <div className="rounded-lg border border-electric/30 bg-electric/10 p-3">
              <p className="mb-2 text-sm">Este evento se repite. ¿Qué quieres guardar?</p>
              <div className="flex flex-wrap justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={() => setSaveScope(false)}>Cancelar</Button>
                <Button variant="outline" size="sm" onClick={() => guardar("una")} disabled={pending}>Solo esta</Button>
                <Button variant="gradient" size="sm" onClick={() => guardar("serie")} disabled={pending}>Toda la serie</Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => setEditing(false)}>Cancelar</Button>
              <Button variant="gradient" size="sm" onClick={() => (esRecurrente ? setSaveScope(true) : guardar("una"))} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : null} Guardar
              </Button>
            </div>
          )}
        </div>
      )}
    </Dialog>
  );
}

function Row({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <div className="flex items-center gap-2 text-muted-foreground">{icon}<div className="min-w-0 text-foreground">{children}</div></div>;
}

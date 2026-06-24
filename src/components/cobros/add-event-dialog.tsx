"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2, MessageCircle, Video, MapPin } from "lucide-react";
import { addEvent, createQuickProject } from "@/app/(app)/cobros/actions";
import { createLead } from "@/app/(app)/leads/actions";
import { EVENT_TIPO_LIST } from "@/lib/eventos";
import { rdToday } from "@/lib/fecha";
import { fechaCorta } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";

type EvTipo = "inicio" | "entrega" | "cobro" | "acuerdo" | "personal";
type Client = { id: string; nombre: string; apellido: string | null; whatsapp: string | null; telefono: string | null };
type Project = { id: string; nombre: string };

const RECORDATORIOS = [
  { v: "", label: "Sin recordatorio" },
  { v: "10", label: "10 min antes" },
  { v: "30", label: "30 min antes" },
  { v: "60", label: "1 hora antes" },
  { v: "1440", label: "1 día antes" },
];

export function AddEventDialog({ clients = [], projects = [] }: { clients?: Client[]; projects?: Project[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [titulo, setTitulo] = useState("");
  const [tipo, setTipo] = useState<EvTipo>("personal");
  const [fecha, setFecha] = useState(rdToday());
  const [hora, setHora] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [recordatorio, setRecordatorio] = useState("");
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"DOP" | "USD">("DOP");
  const [telManual, setTelManual] = useState("");

  const client = clients.find((c) => c.id === clientId) ?? null;
  const waNum = (telManual || client?.whatsapp || client?.telefono || "").replace(/\D/g, "");
  const waText = useMemo(() => {
    const nombre = client?.nombre ?? "";
    const cuando = `${fechaCorta(fecha)}${hora ? ` a las ${hora}` : ""}`;
    let m = `Hola ${nombre}, te confirmo nuestra reunión el ${cuando}.`;
    if (meetingUrl) m += `\nEnlace: ${meetingUrl}`;
    if (ubicacion) m += `\nUbicación: ${ubicacion}`;
    return m.trim();
  }, [client, fecha, hora, meetingUrl, ubicacion]);

  function reset() {
    setTitulo(""); setTipo("personal"); setFecha(rdToday()); setHora(""); setClientId(""); setProjectId("");
    setMeetingUrl(""); setUbicacion(""); setDescripcion(""); setRecordatorio(""); setMonto(""); setMoneda("DOP");
    setTelManual(""); setError(null); setDone(false);
  }

  function submit() {
    setError(null);
    if (!titulo.trim() || !fecha) { setError("Título y fecha son obligatorios."); return; }
    startTransition(async () => {
      const res = await addEvent({
        titulo: titulo.trim(), tipo, fecha, hora: hora || null,
        client_id: clientId || null, project_id: projectId || null,
        meeting_url: meetingUrl.trim() || null, ubicacion: ubicacion.trim() || null,
        descripcion: descripcion.trim() || null,
        recordatorio_min: recordatorio ? Number(recordatorio) : null,
        monto: tipo === "cobro" && monto ? Number(monto) : null,
        moneda: tipo === "cobro" && monto ? moneda : null,
      });
      if (res?.error) { setError(res.error); return; }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => { reset(); setOpen(true); }}>
        <CalendarPlus className="size-4" /> Nuevo evento
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo evento" description="Ligado a tu cliente/proyecto. Compártelo por WhatsApp." className="max-w-2xl">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Reunión con cliente" />
          </div>

          {/* Tipo con color */}
          <div className="space-y-1.5">
            <Label>Tipo</Label>
            <div className="flex flex-wrap gap-2">
              {EVENT_TIPO_LIST.map((t) => (
                <button key={t.id} type="button" onClick={() => setTipo(t.id as EvTipo)}
                  className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${tipo === t.id ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-accent/40"}`}
                  style={tipo === t.id ? { background: t.color } : undefined}>
                  <span className="size-2 rounded-full" style={{ background: tipo === t.id ? "rgba(255,255,255,.9)" : t.color }} /> {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Hora</Label><Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} /></div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente (opcional)</Label>
              <Combobox
                options={clients.map((c) => ({ value: c.id, label: `${c.nombre} ${c.apellido ?? ""}`.trim() }))}
                value={clientId} onChange={setClientId} placeholder="Buscar o crear cliente…"
                createLabel="Agregar cliente"
                onCreate={async (label) => {
                  setError(null);
                  const r = await createLead({ nombre: label, fuente: "Calendario" });
                  if ("id" in r && r.id) return { value: r.id, label };
                  setError(("error" in r && r.error) || "No se pudo crear el cliente.");
                  return null;
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Proyecto (opcional)</Label>
              <Combobox
                options={projects.map((p) => ({ value: p.id, label: p.nombre }))}
                value={projectId} onChange={setProjectId} placeholder="Buscar o crear proyecto…"
                createLabel="Crear proyecto"
                onCreate={async (label) => {
                  setError(null);
                  if (!clientId) { setError("Para crear un proyecto, primero elige o crea un cliente."); return null; }
                  const r = await createQuickProject(label, clientId);
                  if ("id" in r && r.id) return { value: r.id, label };
                  setError(("error" in r && r.error) || "No se pudo crear el proyecto.");
                  return null;
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Video className="size-3.5" /> Link de reunión</Label><Input type="url" value={meetingUrl} onChange={(e) => setMeetingUrl(e.target.value)} placeholder="https://meet.google.com/…" /></div>
            <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><MapPin className="size-3.5" /> Ubicación</Label><Input value={ubicacion} onChange={(e) => setUbicacion(e.target.value)} placeholder="Dirección física (opcional)" /></div>
          </div>

          <div className="space-y-1.5"><Label>Notas / descripción</Label><Textarea rows={2} value={descripcion} onChange={(e) => setDescripcion(e.target.value)} /></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Recordatorio</Label>
              <Select value={recordatorio} onChange={(e) => setRecordatorio(e.target.value)}>
                {RECORDATORIOS.map((r) => <option key={r.v} value={r.v}>{r.label}</option>)}
              </Select>
            </div>
            {tipo === "cobro" && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5"><Label>Monto</Label><Input type="number" step="0.01" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" /></div>
                <div className="space-y-1.5"><Label>Moneda</Label><Select value={moneda} onChange={(e) => setMoneda(e.target.value as "DOP" | "USD")}><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
              </div>
            )}
          </div>

          {/* WhatsApp */}
          <div className="rounded-lg border border-border bg-background/40 p-3 space-y-2">
            <Label className="flex items-center gap-1.5 text-success"><MessageCircle className="size-4" /> Enviar confirmación por WhatsApp</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Input value={telManual} onChange={(e) => setTelManual(e.target.value)} type="tel" placeholder={client?.whatsapp || client?.telefono ? "Usa el número del cliente" : "Número (ej. 1 809 000 0000)"} className="h-9 flex-1 min-w-44" />
              {waNum ? (
                <a href={`https://wa.me/${waNum}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="outline" size="sm" className="text-success"><MessageCircle className="size-4" /> Enviar</Button>
                </a>
              ) : <span className="text-xs text-muted-foreground">Liga un cliente o escribe un número</span>}
            </div>
          </div>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {done && <p className="rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">✅ Evento guardado en el calendario.</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>{done ? "Cerrar" : "Cancelar"}</Button>
            {!done && <Button onClick={submit} variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Guardar evento</Button>}
          </div>
        </div>
      </Dialog>
    </>
  );
}

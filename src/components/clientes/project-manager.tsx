"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Circle, Eye, EyeOff, Trash2, Plus, Loader2, Megaphone, Flag, Send, BellRing,
} from "lucide-react";
import type { Row } from "@/lib/database.types";
import {
  updateProjectEstado, addMilestone, toggleMilestoneComplete, toggleMilestoneVisible,
  deleteMilestone, publishUpdate, deleteUpdate,
} from "@/app/(app)/clientes/proyecto-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";

type Project = { id: string; nombre: string | null; estado: string; fecha_inicio: string | null; fecha_entrega: string | null; precio_total: number; moneda: string };
type Milestone = Row<"project_milestones">;
type Update = Row<"project_updates">;

const ESTADOS = [
  { id: "pendiente", label: "Pendiente" },
  { id: "en_progreso", label: "En progreso" },
  { id: "entregado", label: "Entregado" },
  { id: "pagado", label: "Pagado" },
  { id: "cancelado", label: "Cancelado" },
];

export function ProjectManager({
  clientId, projects, milestones, updates,
}: { clientId: string; projects: Project[]; milestones: Milestone[]; updates: Update[] }) {
  if (projects.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
        Aún no hay proyectos. Créalo desde el pedido (botón “Crear proyecto”) — con o sin contrato — o se crea solo al firmar uno.
        <br />Desde aquí controlarás su línea de tiempo y avisos del portal.
      </div>
    );
  }
  return (
    <div className="space-y-5">
      {projects.map((p) => (
        <ProjectCard
          key={p.id}
          clientId={clientId}
          project={p}
          milestones={milestones.filter((m) => m.project_id === p.id)}
          updates={updates.filter((u) => u.project_id === p.id || u.project_id === null)}
        />
      ))}
    </div>
  );
}

function ProjectCard({ clientId, project, milestones, updates }: {
  clientId: string; project: Project; milestones: Milestone[]; updates: Update[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [notificar, setNotificar] = useState(true);
  const [aviso, setAviso] = useState<string | null>(null);

  function run(fn: () => Promise<{ error?: string; notified?: { email: boolean; push: number } | null }>) {
    setAviso(null);
    start(async () => {
      const r = await fn();
      if (r?.error) setAviso(`Error: ${r.error}`);
      else if (r?.notified) setAviso(`Aviso enviado · correo: ${r.notified.email ? "sí" : "no"} · push: ${r.notified.push}`);
      router.refresh();
    });
  }

  const completados = milestones.filter((m) => m.completado).length;

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Cabecera */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Flag className="size-4 text-brand-purple" />
          <span className="font-semibold">{project.nombre ?? "Proyecto"}</span>
          <Badge>{completados}/{milestones.length} hitos</Badge>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Estado:</span>
          <Select className="h-8 w-36" defaultValue={project.estado}
            onChange={(e) => run(() => updateProjectEstado(project.id, e.target.value as "pendiente", clientId))}>
            {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
          </Select>
        </div>
      </div>

      <div className="space-y-5 p-4">
        {/* Switch de notificación */}
        <label className="flex items-center gap-2 rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
          <Switch checked={notificar} onCheckedChange={setNotificar} />
          <BellRing className="size-4 text-electric" />
          Avisar al cliente (correo + push) al completar un hito o publicar una novedad
        </label>
        {aviso && <p className={cn("text-xs", aviso.startsWith("Error") ? "text-destructive" : "text-success")}>{aviso}</p>}

        {/* Línea de tiempo */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><Flag className="size-4 text-electric" /> Línea de tiempo (lo que ve el cliente)</h3>
          <ul className="space-y-2">
            {milestones.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                <button title={m.completado ? "Marcar pendiente" : "Marcar completado"} disabled={pending}
                  onClick={() => run(() => toggleMilestoneComplete(m.id, clientId, !m.completado, notificar))}>
                  {m.completado ? <CheckCircle2 className="size-5 text-success" /> : <Circle className="size-5 text-muted-foreground" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn("font-medium", m.completado && "text-muted-foreground line-through")}>{m.nombre}</p>
                  {m.descripcion && <p className="truncate text-xs text-muted-foreground">{m.descripcion}</p>}
                </div>
                <button title={m.visible_cliente ? "Visible para el cliente" : "Oculto"} disabled={pending}
                  onClick={() => run(() => toggleMilestoneVisible(m.id, clientId, !m.visible_cliente))}
                  className={m.visible_cliente ? "text-electric" : "text-muted-foreground"}>
                  {m.visible_cliente ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </button>
                <button title="Eliminar" disabled={pending} onClick={() => run(() => deleteMilestone(m.id, clientId))}
                  className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </li>
            ))}
            {milestones.length === 0 && <li className="text-xs text-muted-foreground">Sin pasos todavía. Agrega el primero (ej. Diseño, Desarrollo, Pruebas, Entrega).</li>}
          </ul>
          <AddMilestone projectId={project.id} clientId={clientId} pending={pending} run={run} />
        </div>

        {/* Feed de actualizaciones */}
        <div>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium"><Megaphone className="size-4 text-brand-purple" /> En qué estamos trabajando (feed del cliente)</h3>
          <PublishUpdate projectId={project.id} clientId={clientId} notificar={notificar} pending={pending} run={run} />
          <ul className="mt-2 space-y-2">
            {updates.map((u) => (
              <li key={u.id} className="flex items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{u.titulo}</p>
                  {u.contenido && <p className="text-xs text-muted-foreground">{u.contenido}</p>}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{fechaCorta(u.created_at)}</p>
                </div>
                <button title="Eliminar" disabled={pending} onClick={() => run(() => deleteUpdate(u.id, clientId))}
                  className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
              </li>
            ))}
            {updates.length === 0 && <li className="text-xs text-muted-foreground">Sin novedades publicadas.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function AddMilestone({ projectId, clientId, pending, run }: {
  projectId: string; clientId: string; pending: boolean;
  run: (fn: () => Promise<{ error?: string }>) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [desc, setDesc] = useState("");
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nuevo paso (ej. Diseño)" className="h-9 flex-1 min-w-40" />
      <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="Descripción (opcional)" className="h-9 flex-1 min-w-40" />
      <Button size="sm" variant="outline" disabled={pending || !nombre.trim()}
        onClick={() => { run(() => addMilestone(projectId, clientId, { nombre, descripcion: desc })); setNombre(""); setDesc(""); }}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Agregar paso
      </Button>
    </div>
  );
}

function PublishUpdate({ projectId, clientId, notificar, pending, run }: {
  projectId: string; clientId: string; notificar: boolean; pending: boolean;
  run: (fn: () => Promise<{ error?: string; notified?: { email: boolean; push: number } | null }>) => void;
}) {
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  return (
    <div className="space-y-2 rounded-lg border border-border bg-background/40 p-3">
      <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título (ej. Esta semana: construyendo tu inicio)" className="h-9" />
      <Textarea value={contenido} onChange={(e) => setContenido(e.target.value)} rows={2} placeholder="Detalle cálido para el cliente (opcional)" />
      <div className="flex justify-end">
        <Button size="sm" variant="gradient" disabled={pending || !titulo.trim()}
          onClick={() => { run(() => publishUpdate(projectId, clientId, { titulo, contenido, notificar })); setTitulo(""); setContenido(""); }}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Publicar{notificar ? " y avisar" : ""}
        </Button>
      </div>
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lightbulb, Plus, Trash2, Loader2, Pencil, X } from "lucide-react";
import { addIdea, updateIdea, deleteIdea } from "@/app/(app)/pendientes/venture-ideas-actions";
import { IDEA_TIPOS, ideaTemplate, type IdeaCampo } from "@/lib/ventures";
import type { VentureIdea } from "@/lib/data/ventures";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

function tipoLabel(id: string | null) { return IDEA_TIPOS.find((t) => t.id === id)?.label ?? null; }

export function VentureIdeas({ ventureId, ideas }: { ventureId: string; ideas: VentureIdea[] }) {
  const [editing, setEditing] = useState<VentureIdea | "new" | null>(null);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Lightbulb className="size-4 text-electric" /> Ideas</h2>
        <Button variant="outline" size="sm" onClick={() => setEditing("new")}><Plus className="size-4" /> Nueva idea</Button>
      </div>

      {ideas.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Vuelca aquí tus ideas con detalle. Elige una plantilla y añade tus propios campos; puedes seguir editándola siempre.</p>
      ) : (
        <ul className="space-y-2">
          {ideas.map((i) => {
            const campos = (Array.isArray(i.campos_json) ? i.campos_json : []) as IdeaCampo[];
            const llenos = campos.filter((c) => c.valor?.trim());
            return (
              <li key={i.id}>
                <button onClick={() => setEditing(i)} className="w-full rounded-xl border border-border bg-background/40 p-3 text-left transition-colors hover:border-electric/40">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{i.titulo}</span>
                    {tipoLabel(i.tipo) && <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground">{tipoLabel(i.tipo)}</span>}
                    <Pencil className="ml-auto size-3.5 text-muted-foreground" />
                  </div>
                  {llenos.length > 0 && (
                    <p className="mt-1 truncate text-xs text-muted-foreground">{llenos.map((c) => c.label).join(" · ")}</p>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <IdeaEditor
          ventureId={ventureId}
          idea={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function IdeaEditor({ ventureId, idea, onClose }: { ventureId: string; idea: VentureIdea | null; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const isEdit = !!idea;

  const [titulo, setTitulo] = useState(idea?.titulo ?? "");
  const [tipo, setTipo] = useState<string | null>(idea?.tipo ?? null);
  const [campos, setCampos] = useState<IdeaCampo[]>(
    idea ? ((Array.isArray(idea.campos_json) ? idea.campos_json : []) as IdeaCampo[]) : [],
  );

  function elegirTipo(id: string) {
    setTipo(id);
    // Al elegir tipo en una idea nueva (o vacía), carga su plantilla.
    if (!isEdit && campos.length === 0) setCampos(ideaTemplate(id));
  }
  function setCampo(i: number, patch: Partial<IdeaCampo>) { setCampos((a) => a.map((c, idx) => idx === i ? { ...c, ...patch } : c)); }
  function addCampo() { setCampos((a) => [...a, { label: "", valor: "" }]); }
  function delCampo(i: number) { setCampos((a) => a.filter((_, idx) => idx !== i)); }

  function guardar() {
    setError(null);
    if (!titulo.trim()) { setError("Ponle un título a la idea."); return; }
    const limpios = campos.filter((c) => c.label.trim() || c.valor.trim());
    start(async () => {
      const res = isEdit
        ? await updateIdea(idea!.id, ventureId, titulo, limpios)
        : await addIdea(ventureId, titulo, tipo, limpios);
      if (res?.error) { setError(res.error); return; }
      onClose(); router.refresh();
    });
  }
  function borrar() {
    start(async () => { await deleteIdea(idea!.id, ventureId); onClose(); router.refresh(); });
  }

  return (
    <Dialog open onClose={onClose} title={isEdit ? "Editar idea" : "Nueva idea"} className="max-w-lg">
      <div className="space-y-4">
        <div className="space-y-1.5"><Label>Título *</Label>
          <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. App de reservas" /></div>

        {!isEdit && (
          <div className="space-y-1.5">
            <Label>Plantilla (según tipo)</Label>
            <div className="flex flex-wrap gap-2">
              {IDEA_TIPOS.map((t) => (
                <button key={t.id} type="button" onClick={() => elegirTipo(t.id)}
                  className={cn("rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    tipo === t.id ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>{t.label}</button>
              ))}
            </div>
          </div>
        )}

        {/* Campos: plantilla + propios. Label y valor editables. */}
        <div className="space-y-2">
          {campos.map((c, i) => (
            <div key={i} className="rounded-lg border border-border bg-background/40 p-2.5">
              <div className="mb-1.5 flex items-center gap-2">
                <Input value={c.label} onChange={(e) => setCampo(i, { label: e.target.value })} placeholder="Nombre del campo" className="h-8 flex-1 text-sm font-medium" />
                <button type="button" onClick={() => delCampo(i)} className="text-muted-foreground hover:text-destructive" aria-label="Quitar campo"><X className="size-4" /></button>
              </div>
              <Textarea value={c.valor} onChange={(e) => setCampo(i, { valor: e.target.value })} placeholder="Escribe con detalle…" className="min-h-[60px]" />
            </div>
          ))}
          <Button type="button" variant="outline" size="sm" onClick={addCampo}><Plus className="size-4" /> Añadir campo</Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex items-center justify-between gap-2">
          {isEdit
            ? <Button type="button" variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={borrar} disabled={pending}><Trash2 className="size-4" /> Borrar</Button>
            : <span />}
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
            <Button type="button" variant="gradient" onClick={guardar} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />} {isEdit ? "Guardar" : "Crear idea"}
            </Button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}

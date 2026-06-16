"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, FileText, Loader2 } from "lucide-react";
import { createTemplate, updateTemplate, deleteTemplate } from "@/app/(app)/configuracion/actions";
import { AnimatedCard } from "@/components/animations/motion";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

type Tpl = { id: string; tipo: string; nombre: string; contenido: string | null };
const TIPO_LABEL: Record<string, string> = { contrato: "Contrato", dm: "DM influencer", whatsapp: "WhatsApp" };

export function TemplatesSettings({ templates }: { templates: Tpl[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Tpl | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const nombre = (fd.get("nombre") as string).trim();
    const contenido = fd.get("contenido") as string;
    startTransition(async () => {
      if (edit) await updateTemplate(edit.id, { nombre, contenido });
      else await createTemplate({ tipo: fd.get("tipo") as "contrato" | "dm" | "whatsapp", nombre, contenido });
      setEdit(null); setAdding(false); router.refresh();
    });
  }

  const open = adding || !!edit;

  return (
    <AnimatedCard className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold"><FileText className="size-4 text-electric" /> Plantillas</h2>
        <Button variant="outline" size="sm" onClick={() => { setEdit(null); setAdding(true); }}><Plus className="size-4" /> Nueva plantilla</Button>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Contrato, DM de influencers y WhatsApp. Usa variables como {"{nombre}"}, {"{total}"}.</p>
      <ul className="mt-4 space-y-2">
        {templates.map((t) => (
          <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
            <Badge>{TIPO_LABEL[t.tipo] ?? t.tipo}</Badge>
            <span className="flex-1 truncate font-medium">{t.nombre}</span>
            <button onClick={() => { setAdding(false); setEdit(t); }} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
            <button onClick={() => startTransition(async () => { await deleteTemplate(t.id); router.refresh(); })} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
          </li>
        ))}
        {templates.length === 0 && <li className="text-sm text-muted-foreground">Sin plantillas.</li>}
      </ul>

      <Dialog open={open} onClose={() => { setEdit(null); setAdding(false); }} title={edit ? "Editar plantilla" : "Nueva plantilla"} className="max-w-2xl">
        <form onSubmit={save} className="space-y-4">
          {!edit && (
            <div className="space-y-1.5"><Label>Tipo</Label>
              <Select name="tipo" defaultValue="whatsapp"><option value="contrato">Contrato</option><option value="dm">DM influencer</option><option value="whatsapp">WhatsApp</option></Select>
            </div>
          )}
          <div className="space-y-1.5"><Label>Nombre</Label><Input name="nombre" required defaultValue={edit?.nombre ?? ""} /></div>
          <div className="space-y-1.5"><Label>Contenido</Label><Textarea name="contenido" rows={6} defaultValue={edit?.contenido ?? ""} /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => { setEdit(null); setAdding(false); }}>Cancelar</Button><Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Guardar</Button></div>
        </form>
      </Dialog>
    </AnimatedCard>
  );
}

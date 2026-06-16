"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createTask } from "@/app/(app)/equipo/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Opt = { id: string; nombre: string };

export function NewTaskDialog({
  members, projects, defaultMemberId, trigger,
}: {
  members: Opt[]; projects: Opt[]; defaultMemberId?: string; trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null; };
    startTransition(async () => {
      const res = await createTask({
        descripcion: (fd.get("descripcion") as string).trim(),
        team_member_id: get("team_member_id"),
        project_id: get("project_id"),
        monto: Number(fd.get("monto")) || 0,
        moneda: (fd.get("moneda") as "DOP" | "USD") ?? "DOP",
        fecha_limite: get("fecha_limite"),
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false); router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>{trigger ?? <Button variant="gradient"><Plus className="size-4" /> Nueva tarea</Button>}</span>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva tarea" description="Asigna a una persona con su pago acordado.">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>Descripción *</Label><Textarea name="descripcion" required placeholder="¿Qué hay que hacer?" /></div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Persona asignada</Label>
              <Select name="team_member_id" defaultValue={defaultMemberId ?? ""}><option value="">— Sin asignar —</option>{members.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}</Select>
            </div>
            <div className="space-y-1.5"><Label>Proyecto (opcional)</Label>
              <Select name="project_id" defaultValue=""><option value="">— Ninguno —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Select>
            </div>
            <div className="space-y-1.5"><Label>Pago acordado</Label><Input name="monto" type="number" step="0.01" min="0" defaultValue="0" /></div>
            <div className="space-y-1.5"><Label>Moneda</Label><Select name="moneda" defaultValue="DOP"><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Fecha límite</Label><Input name="fecha_limite" type="date" /></div>
          </div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Crear tarea</Button></div>
        </form>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Mail } from "lucide-react";
import { createAccount } from "@/app/(app)/sistemas/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function NewAccountDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [correo, setCorreo] = useState("");
  const [etiqueta, setEtiqueta] = useState("");
  const [capacidad, setCapacidad] = useState("2");
  const [notas, setNotas] = useState("");

  function reset() { setCorreo(""); setEtiqueta(""); setCapacidad("2"); setNotas(""); setError(null); }

  function submit() {
    setError(null);
    start(async () => {
      const res = await createAccount({ correo, etiqueta, capacidad: Number(capacidad), notas });
      if (res?.error) { setError(res.error); return; }
      setOpen(false); reset(); router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => { reset(); setOpen(true); }}><Plus className="size-4" /> Nueva cuenta</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva cuenta de correo" description="Un correo de Google con capacidad para proyectos de Supabase." className="max-w-md">
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Correo *</Label>
            <div className="relative"><Mail className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@gmail.com" className="pl-9" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Etiqueta</Label><Input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} placeholder="Ej. Trend Shop" /></div>
            <div className="space-y-1.5"><Label>Capacidad</Label><Input type="number" min="0" max="50" value={capacidad} onChange={(e) => setCapacidad(e.target.value)} /></div>
          </div>
          <p className="text-xs text-muted-foreground">Supabase permite 2 proyectos por correo. Editable por si cambian el límite.</p>
          <div className="space-y-1.5"><Label>Notas (opcional)</Label><Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="gradient" onClick={submit} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Crear cuenta</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

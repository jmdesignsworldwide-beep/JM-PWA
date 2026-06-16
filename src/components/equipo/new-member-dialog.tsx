"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import { createMember } from "@/app/(app)/equipo/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";

type Brand = { id: string; nombre: string };

export function NewMemberDialog({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null; };
    startTransition(async () => {
      const res = await createMember({
        nombre: (fd.get("nombre") as string).trim(),
        telefono: get("telefono"), whatsapp: get("whatsapp"),
        correo: get("correo"),
        rol_especialidad: get("rol_especialidad"), notas: get("notas"),
        brand_id: get("brand_id"),
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false); router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}><Plus className="size-4" /> Nueva persona</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nueva persona del equipo">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input name="nombre" required /></div>
            <div className="space-y-1.5"><Label>Rol / especialidad</Label><Input name="rol_especialidad" placeholder="Ej. Diseñador, Bordador" /></div>
            <div className="space-y-1.5"><Label>Teléfono</Label><Input name="telefono" /></div>
            <div className="space-y-1.5"><Label>WhatsApp</Label><Input name="whatsapp" placeholder="1 809 000 0000" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Correo (para su acceso)</Label><Input name="correo" type="email" placeholder="correo@ejemplo.com" /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label>Marca</Label>
              <Select name="brand_id" defaultValue=""><option value="">— Ninguna —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Notas</Label><Textarea name="notas" /></div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Guardar</Button></div>
        </form>
      </Dialog>
    </>
  );
}

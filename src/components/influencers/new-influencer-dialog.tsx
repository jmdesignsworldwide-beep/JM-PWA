"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, AtSign } from "lucide-react";
import { createInfluencer } from "@/app/(app)/influencers/actions";
import { igHandle } from "@/lib/influencers";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Brand = { id: string; nombre: string };

export function NewInfluencerDialog({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [ig, setIg] = useState("");
  const [tieneWa, setTieneWa] = useState(false);
  const [tieneCorreo, setTieneCorreo] = useState(false);
  const [tieneManager, setTieneManager] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handle = igHandle(ig);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null; };
    startTransition(async () => {
      const res = await createInfluencer({
        nombre: (fd.get("nombre") as string).trim(),
        ig_url: ig || null, ig_handle: handle,
        tiene_whatsapp: tieneWa, whatsapp: tieneWa ? get("whatsapp") : null,
        tiene_correo: tieneCorreo, correo: tieneCorreo ? get("correo") : null,
        tiene_manager: tieneManager,
        empresa: tieneManager ? get("empresa") : null,
        manager_nombre: tieneManager ? get("manager_nombre") : null,
        empresa_whatsapp: tieneManager ? get("empresa_whatsapp") : null,
        empresa_correo: tieneManager ? get("empresa_correo") : null,
        notas: get("notas"),
        brand_id: get("brand_id"),
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false); router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}><Plus className="size-4" /> Nuevo influencer</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo influencer" className="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Nombre *</Label><Input name="nombre" required /></div>
            <div className="space-y-1.5">
              <Label>Link de perfil IG</Label>
              <Input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="instagram.com/usuario" />
              {handle && <p className="flex items-center gap-1 text-xs text-electric"><AtSign className="size-3" /> {handle}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center gap-3"><Switch checked={tieneWa} onCheckedChange={setTieneWa} /><Label>¿Tiene WhatsApp?</Label></div>
            {tieneWa && <Input name="whatsapp" placeholder="1 809 000 0000" />}
            <div className="flex items-center gap-3"><Switch checked={tieneCorreo} onCheckedChange={setTieneCorreo} /><Label>¿Tiene correo?</Label></div>
            {tieneCorreo && <Input name="correo" type="email" placeholder="correo@ejemplo.com" />}
          </div>

          <div className="rounded-lg border border-border p-3 space-y-3">
            <div className="flex items-center gap-3"><Switch checked={tieneManager} onCheckedChange={setTieneManager} /><Label>¿Tiene manager / agencia?</Label></div>
            {!tieneManager ? <p className="text-xs text-muted-foreground">Independiente</p> : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Input name="empresa" placeholder="Empresa / agencia" />
                <Input name="manager_nombre" placeholder="Nombre del manager" />
                <Input name="empresa_whatsapp" placeholder="WhatsApp de la empresa" />
                <Input name="empresa_correo" type="email" placeholder="Correo de la empresa" />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>Marca</Label>
              <select name="brand_id" defaultValue="" className="h-11 w-full rounded-lg border border-input bg-background/60 px-3 text-sm">
                <option value="">— Ninguna —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </select>
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

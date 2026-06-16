"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Loader2, Check } from "lucide-react";
import { sendEmailCampaign } from "@/app/(app)/influencers/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Inf = { id: string; nombre: string; correo: string | null };

export function EmailCampaignDialog({ influencers }: { influencers: Inf[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const conCorreo = influencers.filter((i) => i.correo);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(id: string) {
    setSel((p) => { const n = new Set(p); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null); setMsg(null);
    if (sel.size === 0) { setError("Selecciona al menos un influencer."); return; }
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await sendEmailCampaign({
        asunto: fd.get("asunto") as string,
        mensaje: fd.get("mensaje") as string,
        influencerIds: [...sel],
      });
      if (res?.error) { setError(res.error); return; }
      setMsg(res.aviso ?? `Enviados: ${res.enviados}/${res.registrados}`);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}><Mail className="size-4" /> Campaña por correo</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Campaña por correo" description="Usa {nombre} para personalizar." className="max-w-2xl">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5"><Label>Asunto</Label><Input name="asunto" required /></div>
          <div className="space-y-1.5"><Label>Mensaje</Label><Textarea name="mensaje" rows={4} required defaultValue={"Hola {nombre},\n\n"} /></div>
          <div>
            <Label>Destinatarios ({sel.size} seleccionados de {conCorreo.length} con correo)</Label>
            <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border p-2">
              {conCorreo.length === 0 ? <p className="p-3 text-sm text-muted-foreground">Ningún influencer tiene correo registrado.</p> :
                conCorreo.map((i) => (
                  <label key={i.id} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-accent">
                    <input type="checkbox" checked={sel.has(i.id)} onChange={() => toggle(i.id)} />
                    <span className="flex-1">{i.nombre}</span>
                    <span className="text-xs text-muted-foreground">{i.correo}</span>
                  </label>
                ))}
            </div>
            {conCorreo.length > 0 && (
              <button type="button" className="mt-1 text-xs text-electric" onClick={() => setSel(sel.size === conCorreo.length ? new Set() : new Set(conCorreo.map((i) => i.id)))}>
                {sel.size === conCorreo.length ? "Quitar todos" : "Seleccionar todos"}
              </button>
            )}
          </div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          {msg && <p className="flex items-center gap-1.5 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success"><Check className="size-4" /> {msg}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button><Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Enviar</Button></div>
        </form>
      </Dialog>
    </>
  );
}

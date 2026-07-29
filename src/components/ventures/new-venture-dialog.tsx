"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rocket, Loader2, ImagePlus, X } from "lucide-react";
import { createVenture, updateVenture } from "@/app/(app)/pendientes/venture-actions";
import { uploadFile } from "@/lib/upload";
import type { Venture } from "@/lib/data/ventures";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

/**
 * Crear/editar un proyecto de la incubadora. Perfil base: nombre, ¿registrado?,
 * logo (a Supabase Storage), descripción y correo. Si no hay logo, el sistema
 * crea solo el pendiente "Subir/crear logo".
 */
export function NewVentureDialog({
  venture, logoUrl, trigger,
}: {
  venture?: Venture;
  logoUrl?: string | null;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const isEdit = !!venture;
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(venture?.nombre ?? "");
  const [registrado, setRegistrado] = useState(!!venture?.registrado);
  const [descripcion, setDescripcion] = useState(venture?.descripcion ?? "");
  const [correo, setCorreo] = useState(venture?.correo ?? "");
  const [logoPath, setLogoPath] = useState<string | null>(venture?.logo_path ?? null);
  const [preview, setPreview] = useState<string | null>(logoUrl ?? null);

  function reinit() {
    setNombre(venture?.nombre ?? ""); setRegistrado(!!venture?.registrado);
    setDescripcion(venture?.descripcion ?? ""); setCorreo(venture?.correo ?? "");
    setLogoPath(venture?.logo_path ?? null); setPreview(logoUrl ?? null); setError(null);
  }

  async function pickLogo(file: File | null) {
    if (!file) return;
    setError(null);
    setPreview(URL.createObjectURL(file));
    setUploading(true);
    const path = await uploadFile("ventures", file);
    setUploading(false);
    if (!path) { setError("No se pudo subir el logo."); return; }
    setLogoPath(path);
  }

  function submit() {
    setError(null);
    if (!nombre.trim()) { setError("El nombre del proyecto es obligatorio."); return; }
    start(async () => {
      const payload = { nombre, registrado, logo_path: logoPath, descripcion, correo };
      const res = isEdit ? await updateVenture(venture!.id, payload) : await createVenture(payload);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
      if (!isEdit && (res as { id?: string }).id) router.push(`/proyectos/${(res as { id: string }).id}`);
    });
  }

  return (
    <>
      {trigger
        ? <span onClick={() => { reinit(); setOpen(true); }}>{trigger}</span>
        : <Button variant="gradient" onClick={() => { reinit(); setOpen(true); }}><Rocket className="size-4" /> Nuevo negocio/proyecto</Button>}
      <Dialog open={open} onClose={() => setOpen(false)} title={isEdit ? "Editar proyecto" : "Nuevo negocio/proyecto"} className="max-w-lg">
        <div className="space-y-4">
          {/* Logo */}
          <div className="flex items-center gap-4">
            <div className="relative flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background/40">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Logo" className="size-full object-cover" />
              ) : <Rocket className="size-7 text-muted-foreground" />}
              {uploading && <span className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="size-5 animate-spin text-white" /></span>}
            </div>
            <div className="space-y-1.5">
              <Label>Logo</Label>
              <div className="flex items-center gap-2">
                <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:bg-accent/40">
                  <ImagePlus className="size-4 text-electric" /> {logoPath ? "Cambiar" : "Subir"}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => pickLogo(e.target.files?.[0] ?? null)} />
                </label>
                {logoPath && (
                  <button type="button" onClick={() => { setLogoPath(null); setPreview(null); }} className="text-muted-foreground hover:text-destructive" aria-label="Quitar logo"><X className="size-4" /></button>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">Si no subes logo, se crea un pendiente para hacerlo.</p>
            </div>
          </div>

          <div className="space-y-1.5"><Label>Nombre *</Label>
            <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Agencia Luum" /></div>

          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
            <span>¿Está registrado?</span>
            <Switch checked={registrado} onCheckedChange={setRegistrado} />
          </label>

          <div className="space-y-1.5"><Label>Descripción — qué es</Label>
            <Textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} placeholder="Describe el negocio/proyecto…" /></div>

          <div className="space-y-1.5"><Label>Correo del proyecto (opcional)</Label>
            <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="proyecto@ejemplo.com" /></div>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} variant="gradient" disabled={pending || uploading}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Rocket className="size-4" />} {isEdit ? "Guardar" : "Crear proyecto"}
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

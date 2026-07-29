"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Users, Plus, Trash2, Loader2, FileText, Paperclip, AlertTriangle } from "lucide-react";
import { addSocio, deleteSocio, ventureFileUrl } from "@/app/(app)/pendientes/venture-socios-actions";
import { uploadFile } from "@/lib/upload";
import type { VentureSocio } from "@/lib/data/ventures";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function VentureSocios({ ventureId, socios }: { ventureId: string; socios: VentureSocio[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [nombre, setNombre] = useState("");
  const [porcentaje, setPorcentaje] = useState("");
  const [contratoPath, setContratoPath] = useState<string | null>(null);
  const [contratoName, setContratoName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const totalPct = socios.reduce((s, x) => s + (Number(x.porcentaje) || 0), 0);

  async function pickContrato(file: File | null) {
    if (!file) return;
    setUploading(true);
    const path = await uploadFile("ventures", file);
    setUploading(false);
    if (!path) { setError("No se pudo subir el contrato."); return; }
    setContratoPath(path); setContratoName(file.name);
  }
  function agregar() {
    setError(null);
    if (!nombre.trim()) { setError("Escribe el nombre del socio."); return; }
    start(async () => {
      const res = await addSocio(ventureId, { nombre, porcentaje: porcentaje.trim() ? Number(porcentaje) : 0, contrato_path: contratoPath });
      if (res?.error) { setError(res.error); return; }
      setNombre(""); setPorcentaje(""); setContratoPath(null); setContratoName(null); setOpen(false);
      router.refresh();
    });
  }
  function borrar(id: string) { start(async () => { await deleteSocio(id, ventureId); router.refresh(); }); }
  async function abrir(path: string) {
    const res = await ventureFileUrl(path);
    if (res.url) window.open(res.url, "_blank");
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Users className="size-4 text-electric" /> Socios
          {socios.length > 0 && <span className="text-sm font-normal text-muted-foreground">· {totalPct}%</span>}
        </h2>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Añadir socio</Button>
      </div>

      {socios.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Sin socios. Si el negocio es solo tuyo, déjalo así.</p>
      ) : (
        <ul className="space-y-2">
          {socios.map((s) => (
            <li key={s.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium">{s.nombre}</span>
                <span className="ml-2 text-xs text-muted-foreground">{Number(s.porcentaje)}%</span>
                {s.contrato_path ? (
                  <button onClick={() => abrir(s.contrato_path!)} className="ml-2 inline-flex items-center gap-1 text-xs text-electric hover:underline"><FileText className="size-3" /> contrato</button>
                ) : (
                  <span className="ml-2 inline-flex items-center gap-1 rounded bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning"><AlertTriangle className="size-3" /> falta contrato</span>
                )}
              </div>
              <button type="button" onClick={() => borrar(s.id)} disabled={pending} className="text-muted-foreground hover:text-destructive" aria-label="Quitar socio"><Trash2 className="size-4" /></button>
            </li>
          ))}
          {totalPct !== 100 && socios.length > 0 && (
            <li className="px-1 text-[11px] text-muted-foreground">Los porcentajes suman {totalPct}% (no 100%).</li>
          )}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Añadir socio" className="max-w-md">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5"><Label>Nombre *</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre del socio" /></div>
            <div className="space-y-1.5"><Label>%</Label><Input type="number" inputMode="decimal" min="0" max="100" step="0.01" value={porcentaje} onChange={(e) => setPorcentaje(e.target.value)} placeholder="0" /></div>
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5"><Paperclip className="size-3.5" /> Contrato del socio (PDF)</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/40">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <Paperclip className="size-4" />}
              {contratoName ?? "Subir PDF del contrato"}
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => pickContrato(e.target.files?.[0] ?? null)} />
            </label>
            <p className="text-[11px] text-muted-foreground">Todos los socios deben tener contrato. Si no lo subes, se crea el pendiente.</p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="gradient" onClick={agregar} disabled={pending || uploading}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Añadir socio
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

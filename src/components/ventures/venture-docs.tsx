"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FolderOpen, Plus, Trash2, Loader2, FileText, ShieldCheck } from "lucide-react";
import { addDoc, deleteDoc, ventureFileUrl } from "@/app/(app)/pendientes/venture-socios-actions";
import { uploadFile } from "@/lib/upload";
import type { VentureDoc } from "@/lib/data/ventures";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type DocTipo = "contrato" | "legalizacion" | "plan" | "cotizacion" | "otro";
const TIPO_LABEL: Record<DocTipo, string> = {
  contrato: "Contrato", legalizacion: "Legalización", plan: "Plan", cotizacion: "Cotización", otro: "Otro",
};

export function VentureDocs({ ventureId, docs, legalizado }: { ventureId: string; docs: VentureDoc[]; legalizado: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [tipo, setTipo] = useState<DocTipo>("plan");
  const [nombre, setNombre] = useState("");
  const [filePath, setFilePath] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function pickFile(file: File | null) {
    if (!file) return;
    setUploading(true);
    const path = await uploadFile("ventures", file);
    setUploading(false);
    if (!path) { setError("No se pudo subir el archivo."); return; }
    setFilePath(path); setFileName(file.name);
  }
  function agregar() {
    setError(null);
    if (!filePath) { setError("Sube un archivo primero."); return; }
    start(async () => {
      const res = await addDoc(ventureId, { tipo, nombre: nombre.trim() || fileName, file_path: filePath });
      if (res?.error) { setError(res.error); return; }
      setTipo("plan"); setNombre(""); setFilePath(null); setFileName(null); setOpen(false);
      router.refresh();
    });
  }
  function borrar(id: string) { start(async () => { await deleteDoc(id, ventureId); router.refresh(); }); }
  async function abrir(path: string) { const res = await ventureFileUrl(path); if (res.url) window.open(res.url, "_blank"); }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><FolderOpen className="size-4 text-electric" /> Documentos y legalización</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Subir PDF</Button>
      </div>

      <div className={`mb-3 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${legalizado ? "border-success/30 bg-success/5 text-success" : "border-border text-muted-foreground"}`}>
        <ShieldCheck className="size-4" /> {legalizado ? "Proyecto legalizado" : "Sin legalizar — sube el documento de legalización cuando lo tengas."}
      </div>

      {docs.length === 0 ? (
        <p className="py-2 text-sm text-muted-foreground">Sin documentos. Sube contratos, planes, cotizaciones o el documento de legalización.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <FileText className="size-4 shrink-0 text-electric" />
              <button onClick={() => abrir(d.file_path)} className="min-w-0 flex-1 truncate text-left text-sm hover:underline">
                {d.nombre || "Documento"}
                <span className="ml-2 rounded bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground">{TIPO_LABEL[d.tipo as DocTipo] ?? d.tipo}</span>
              </button>
              <button type="button" onClick={() => borrar(d.id)} disabled={pending} className="text-muted-foreground hover:text-destructive" aria-label="Borrar documento"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Subir documento" className="max-w-md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Tipo</Label>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as DocTipo)}>
                {(Object.keys(TIPO_LABEL) as DocTipo[]).map((t) => <option key={t} value={t}>{TIPO_LABEL[t]}</option>)}
              </Select></div>
            <div className="space-y-1.5"><Label>Nombre (opcional)</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Plan de negocio" /></div>
          </div>
          <div className="space-y-1.5">
            <Label>Archivo (PDF o imagen)</Label>
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/40">
              {uploading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
              {fileName ?? "Subir archivo"}
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => pickFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="gradient" onClick={agregar} disabled={pending || uploading}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Guardar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

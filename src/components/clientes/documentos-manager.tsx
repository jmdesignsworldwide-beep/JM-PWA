"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, Download, Trash2, Eye, EyeOff, FileText } from "lucide-react";
import { addClientDocument, toggleDocumentVisible, deleteDocument, getSignedDocUrl } from "@/app/(app)/clientes/actions";
import { uploadFile } from "@/lib/upload";
import { fechaCorta } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type Doc = {
  id: string; file_url: string | null; tipo: string | null; version: number; visible_cliente: boolean; created_at: string;
};

export function DocumentosManager({ clientId, docs }: { clientId: string; docs: Doc[] }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("");
  const [visible, setVisible] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, start] = useTransition();

  async function upload() {
    setError(null);
    if (!file) { setError("Elige un archivo."); return; }
    setUploading(true);
    const path = await uploadFile("proyectos", file);
    setUploading(false);
    if (!path) { setError("No se pudo subir el archivo."); return; }
    const res = await addClientDocument({ client_id: clientId, file_url: path, tipo: tipo.trim() || file.name, visible_cliente: visible });
    if (res?.error) { setError(res.error); return; }
    setFile(null); setTipo(""); setVisible(false);
    router.refresh();
  }

  async function descargar(fileUrl: string) {
    const res = await getSignedDocUrl(fileUrl);
    if (res?.url) window.open(res.url, "_blank");
    else alert(res?.error ?? "No se pudo generar el enlace");
  }

  return (
    <div className="space-y-4">
      {/* Subir */}
      <div className="rounded-lg border border-border bg-background/40 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Tipo / nombre</Label><Input value={tipo} onChange={(e) => setTipo(e.target.value)} placeholder="Contrato, brief, entregable…" /></div>
          <div className="space-y-1.5"><Label>Archivo</Label><Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} /></div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm"><Switch checked={visible} onCheckedChange={setVisible} /> Visible para el cliente (en su portal)</label>
          <Button variant="gradient" size="sm" onClick={upload} disabled={uploading}>
            {uploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Subir documento
          </Button>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </div>

      {/* Lista */}
      {docs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Aún no hay documentos. Sube contratos, briefs, brand assets o entregables.</p>
      ) : (
        <ul className="space-y-2">
          {docs.map((d) => (
            <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
              <FileText className="size-4 text-electric" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{d.tipo} <span className="text-xs text-muted-foreground">v{d.version}</span></p>
                <p className="text-xs text-muted-foreground">{fechaCorta(d.created_at)}</p>
              </div>
              {d.visible_cliente ? <Badge dot="var(--success)">Visible</Badge> : <Badge>Privado</Badge>}
              <button title={d.visible_cliente ? "Ocultar al cliente" : "Mostrar al cliente"}
                onClick={() => start(async () => { await toggleDocumentVisible(d.id, !d.visible_cliente, clientId); router.refresh(); })}
                className="text-muted-foreground hover:text-foreground">
                {d.visible_cliente ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
              {d.file_url && <button title="Descargar" onClick={() => descargar(d.file_url!)} className="text-muted-foreground hover:text-electric"><Download className="size-4" /></button>}
              <button title="Eliminar" onClick={() => start(async () => { await deleteDocument(d.id, clientId); router.refresh(); })} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

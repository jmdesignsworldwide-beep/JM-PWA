"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileUp } from "lucide-react";
import { uploadExternalContract } from "@/app/(app)/pedidos/actions";
import { uploadFile } from "@/lib/upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Sube un contrato firmado FUERA del sistema (PDF) y lo adjunta al pedido.
 * Al adjuntarlo queda firmado y dispara el mismo flujo (factura + fechas).
 */
export function ExternalContractUpload({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir() {
    setError(null);
    if (!file) { setError("Elige el PDF del contrato firmado."); return; }
    setBusy(true);
    const path = await uploadFile("proyectos", file);
    if (!path) { setBusy(false); setError("No se pudo subir el archivo."); return; }
    const res = await uploadExternalContract(orderId, path);
    setBusy(false);
    if (res?.error) { setError(res.error); return; }
    setFile(null);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-dashed border-border bg-background/40 p-3">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <FileUp className="size-3.5" /> ¿Ya lo firmaron por fuera? Sube el PDF y queda registrado como firmado.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input
          type="file" accept="application/pdf,image/*"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="max-w-xs text-xs"
        />
        <Button variant="outline" size="sm" onClick={subir} disabled={busy}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
          Subir contrato firmado
        </Button>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}

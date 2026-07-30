"use client";

import { useState, useTransition } from "react";
import { Download, Loader2 } from "lucide-react";
import { exportVenture } from "@/app/(app)/pendientes/venture-export-actions";
import { Button } from "@/components/ui/button";

/** Descarga el brief del proyecto (Markdown + adjuntos) como .zip. */
export function VentureExportButton({ ventureId }: { ventureId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function exportar() {
    setError(null);
    start(async () => {
      const res = await exportVenture(ventureId);
      if (res?.error || !res?.base64) { setError(res?.error ?? "No se pudo exportar."); return; }
      // base64 → Blob → descarga.
      const bin = atob(res.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const url = URL.createObjectURL(new Blob([bytes], { type: "application/zip" }));
      const a = document.createElement("a");
      a.href = url; a.download = res.filename ?? "proyecto-brief.zip";
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <Button variant="outline" size="sm" onClick={exportar} disabled={pending} title="Descarga el brief + adjuntos para pegárselo a Claude Code">
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Exportar proyecto
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </span>
  );
}

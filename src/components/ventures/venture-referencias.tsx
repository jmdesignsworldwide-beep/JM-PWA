"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Images, ImagePlus, Trash2, Loader2, Check } from "lucide-react";
import { addReferencia, updateReferenciaNota, deleteReferencia } from "@/app/(app)/pendientes/venture-ideas-actions";
import { uploadFile } from "@/lib/upload";
import type { VentureReferencia } from "@/lib/data/ventures";

type RefCard = VentureReferencia & { url: string | null };

export function VentureReferencias({ ventureId, refs }: { ventureId: string; refs: RefCard[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function subir(file: File | null) {
    if (!file) return;
    setError(null);
    setUploading(true);
    const path = await uploadFile("ventures", file);
    setUploading(false);
    if (!path) { setError("No se pudo subir la imagen."); return; }
    start(async () => { await addReferencia(ventureId, path, null); router.refresh(); });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Images className="size-4 text-electric" /> Referencias visuales</h2>
        <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent/40">
          {uploading ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4 text-electric" />} Subir foto
          <input type="file" accept="image/*" className="hidden" onChange={(e) => subir(e.target.files?.[0] ?? null)} />
        </label>
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {refs.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Sube fotos de lo que te gustó (moodboard) para guardarlas para cuando crees el proyecto.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {refs.map((r) => <RefItem key={r.id} r={r} ventureId={ventureId} pending={pending} start={start} router={router} />)}
        </div>
      )}
    </div>
  );
}

function RefItem({ r, ventureId, pending, start, router }: {
  r: RefCard; ventureId: string; pending: boolean;
  start: React.TransitionStartFunction; router: ReturnType<typeof useRouter>;
}) {
  const [nota, setNota] = useState(r.nota ?? "");
  const [saved, setSaved] = useState(false);

  function guardarNota() {
    if (nota === (r.nota ?? "")) return;
    start(async () => { await updateReferenciaNota(r.id, ventureId, nota); setSaved(true); router.refresh(); });
  }
  function borrar() { start(async () => { await deleteReferencia(r.id, ventureId); router.refresh(); }); }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-background/40">
      <div className="relative aspect-square bg-secondary/40">
        {r.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.url} alt={r.nota ?? "Referencia"} className="size-full object-cover" />
        )}
        <button type="button" onClick={borrar} disabled={pending}
          className="absolute right-1.5 top-1.5 rounded-md bg-black/50 p-1 text-white/90 transition-colors hover:bg-destructive" aria-label="Borrar referencia">
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="relative p-2">
        <input
          value={nota}
          onChange={(e) => { setNota(e.target.value); setSaved(false); }}
          onBlur={guardarNota}
          placeholder="Nota (¿por qué te gustó?)"
          className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus-visible:outline-none"
        />
        {saved && <Check className="absolute right-2 top-2.5 size-3 text-success" />}
      </div>
    </div>
  );
}

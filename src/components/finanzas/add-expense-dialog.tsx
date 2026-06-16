"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Receipt } from "lucide-react";
import { addExpense } from "@/app/(app)/finanzas/actions";
import { uploadFile } from "@/lib/upload";
import { rdToday } from "@/lib/fecha";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Opt = { id: string; nombre: string };

export function AddExpenseDialog({
  categorias, projects, brands, trigger,
}: {
  categorias: string[]; projects: Opt[]; brands: Opt[]; trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("factura") as File | null;
    let factura_url: string | null = null;
    if (file && file.size > 0) {
      setUploading(true);
      factura_url = await uploadFile("comprobantes", file);
      setUploading(false);
      if (!factura_url) { setError("No se pudo subir el archivo (se guardará sin él)."); }
    }
    const get = (k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null; };
    startTransition(async () => {
      const res = await addExpense({
        monto: Number(fd.get("monto")),
        moneda: (fd.get("moneda") as "DOP" | "USD") ?? "DOP",
        fecha: fd.get("fecha") as string,
        categoria: get("categoria"),
        descripcion: get("descripcion"),
        project_id: get("project_id"),
        brand_id: get("brand_id"),
        factura_url,
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => setOpen(true)}>
        {trigger ?? <Button variant="outline"><Receipt className="size-4" /> Registrar gasto</Button>}
      </span>
      <Dialog open={open} onClose={() => setOpen(false)} title="Registrar gasto" description="Etiqueta a un proyecto para ver tu margen real.">
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monto</Label><Input name="monto" type="number" step="0.01" min="0" required /></div>
            <div className="space-y-1.5"><Label>Moneda</Label><Select name="moneda" defaultValue="DOP"><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            <div className="space-y-1.5"><Label>Fecha</Label><Input name="fecha" type="date" defaultValue={rdToday()} required /></div>
            <div className="space-y-1.5"><Label>Categoría</Label>
              <Select name="categoria" defaultValue=""><option value="">— Seleccionar —</option>{categorias.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            </div>
            <div className="space-y-1.5 col-span-2"><Label>Proyecto (para margen)</Label>
              <Select name="project_id" defaultValue=""><option value="">— Ninguno —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Select>
            </div>
            <div className="space-y-1.5 col-span-2"><Label>Marca</Label>
              <Select name="brand_id" defaultValue=""><option value="">— Ninguna —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Descripción</Label><Textarea name="descripcion" placeholder="¿En qué fue?" /></div>
          <div className="space-y-1.5"><Label>Factura / recibo (opcional)</Label><Input name="factura" type="file" accept="image/*,application/pdf" /></div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="gradient" disabled={pending || uploading}>
              {(pending || uploading) && <Loader2 className="size-4 animate-spin" />} {uploading ? "Subiendo…" : "Guardar gasto"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

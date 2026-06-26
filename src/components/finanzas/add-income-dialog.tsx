"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Building2, User } from "lucide-react";
import { addIncome } from "@/app/(app)/finanzas/actions";
import { uploadFile } from "@/lib/upload";
import { rdToday } from "@/lib/fecha";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

type Opt = { id: string; nombre: string };

export function AddIncomeDialog({
  categorias, clients, projects, brands,
}: {
  categorias: string[]; clients: Opt[]; projects: Opt[]; brands: Opt[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [esPersonal, setEsPersonal] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("comprobante") as File | null;
    let comprobante_url: string | null = null;
    if (file && file.size > 0) {
      setUploading(true);
      comprobante_url = await uploadFile("comprobantes", file);
      setUploading(false);
    }
    const get = (k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null; };
    startTransition(async () => {
      const res = await addIncome({
        monto: Number(fd.get("monto")),
        moneda: (fd.get("moneda") as "DOP" | "USD") ?? "DOP",
        fecha: fd.get("fecha") as string,
        categoria: get("categoria"),
        client_id: get("client_id"),
        project_id: get("project_id"),
        descripcion: get("descripcion"),
        brand_id: get("brand_id"),
        comprobante_url,
        es_personal: esPersonal,
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}><Plus className="size-4" /> Registrar ingreso</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Registrar ingreso">
        <form onSubmit={submit} className="space-y-4">
          <p className="rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs text-muted-foreground">
            Para <strong>pagos de clientes</strong> no uses esto: regístralos en el <strong>Pedido → Pagos</strong> o en Cobros y entran solos aquí (sin doble conteo). Esta ventana es para otros ingresos.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {([["negocio", false, Building2, "Negocio"], ["personal", true, User, "Personal"]] as const).map(([k, val, Icon, label]) => (
              <button key={k} type="button" onClick={() => setEsPersonal(val)}
                className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  esPersonal === val ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monto</Label><Input name="monto" type="number" step="0.01" min="0" required /></div>
            <div className="space-y-1.5"><Label>Moneda</Label><Select name="moneda" defaultValue="DOP"><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            <div className="space-y-1.5"><Label>Fecha</Label><DatePicker name="fecha" defaultValue={rdToday()} required /></div>
            <div className="space-y-1.5"><Label>Categoría</Label>
              <Select name="categoria" defaultValue=""><option value="">— Seleccionar —</option>{categorias.map((c) => <option key={c} value={c}>{c}</option>)}</Select>
            </div>
            <div className="space-y-1.5"><Label>Cliente</Label>
              <Select name="client_id" defaultValue=""><option value="">— Ninguno —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select>
            </div>
            <div className="space-y-1.5"><Label>Proyecto</Label>
              <Select name="project_id" defaultValue=""><option value="">— Ninguno —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}</Select>
            </div>
            <div className="space-y-1.5 col-span-2"><Label>Marca</Label>
              <Select name="brand_id" defaultValue=""><option value="">— Ninguna —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}</Select>
            </div>
          </div>
          <div className="space-y-1.5"><Label>Descripción</Label><Textarea name="descripcion" /></div>
          <div className="space-y-1.5"><Label>Comprobante (opcional)</Label><Input name="comprobante" type="file" accept="image/*,application/pdf" /></div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="gradient" disabled={pending || uploading}>
              {(pending || uploading) && <Loader2 className="size-4 animate-spin" />} {uploading ? "Subiendo…" : "Guardar ingreso"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

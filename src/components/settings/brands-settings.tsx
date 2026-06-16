"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Pencil, Upload, Building2 } from "lucide-react";
import { createBrand, updateBrand } from "@/app/(app)/configuracion/actions";
import { uploadFile } from "@/lib/upload";
import { AnimatedCard } from "@/components/animations/motion";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type Brand = { id: string; nombre: string; activo: boolean; rnc: string | null; telefono: string | null; direccion: string | null; logo_url: string | null };

export function BrandsSettings({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [edit, setEdit] = useState<Brand | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();

  function add(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const nombre = (new FormData(e.currentTarget).get("nombre") as string).trim();
    if (!nombre) return;
    startTransition(async () => { await createBrand(nombre); setAdding(false); router.refresh(); });
  }

  return (
    <AnimatedCard className="p-6">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-semibold"><Building2 className="size-4 text-electric" /> Marcas</h2>
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}><Plus className="size-4" /> Nueva marca</Button>
      </div>
      <ul className="mt-4 space-y-2">
        {brands.map((b) => (
          <li key={b.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
            <span className="flex-1 font-medium">{b.nombre}</span>
            {b.activo ? <Badge dot="var(--success)">Activa</Badge> : <Badge>Inactiva</Badge>}
            <button onClick={() => setEdit(b)} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
          </li>
        ))}
      </ul>

      <Dialog open={adding} onClose={() => setAdding(false)} title="Nueva marca">
        <form onSubmit={add} className="space-y-4">
          <div className="space-y-1.5"><Label>Nombre</Label><Input name="nombre" required /></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button><Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Crear</Button></div>
        </form>
      </Dialog>

      {edit && <EditBrandDialog brand={edit} onClose={() => setEdit(null)} />}
    </AnimatedCard>
  );
}

function EditBrandDialog({ brand, onClose }: { brand: Brand; onClose: () => void }) {
  const router = useRouter();
  const [activo, setActivo] = useState(brand.activo);
  const [logoUrl, setLogoUrl] = useState(brand.logo_url);
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setUploading(true);
    const path = await uploadFile("brand_assets", f);
    setUploading(false);
    if (path) setLogoUrl(path);
  }

  function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const g = (k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null; };
    startTransition(async () => {
      await updateBrand(brand.id, { nombre: (fd.get("nombre") as string).trim(), rnc: g("rnc"), telefono: g("telefono"), direccion: g("direccion"), logo_url: logoUrl, activo });
      onClose(); router.refresh();
    });
  }

  return (
    <Dialog open onClose={onClose} title={`Editar ${brand.nombre}`} description="Datos para PDFs (contrato/factura/cotización).">
      <form onSubmit={save} className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Nombre</Label><Input name="nombre" required defaultValue={brand.nombre} /></div>
          <div className="space-y-1.5"><Label>RNC</Label><Input name="rnc" defaultValue={brand.rnc ?? ""} /></div>
          <div className="space-y-1.5"><Label>Teléfono</Label><Input name="telefono" defaultValue={brand.telefono ?? ""} /></div>
          <div className="space-y-1.5"><Label>Dirección</Label><Input name="direccion" defaultValue={brand.direccion ?? ""} /></div>
        </div>
        <div className="space-y-1.5">
          <Label>Logo</Label>
          <div className="flex items-center gap-3">
            <Input type="file" accept="image/*" onChange={onFile} />
            {uploading && <Loader2 className="size-4 animate-spin" />}
            {logoUrl && !uploading && <Badge dot="var(--success)"><Upload className="size-3" /> cargado</Badge>}
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={activo} onCheckedChange={setActivo} /> Activa</label>
        <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button><Button type="submit" variant="gradient" disabled={pending || uploading}>{pending && <Loader2 className="size-4 animate-spin" />} Guardar</Button></div>
      </form>
    </Dialog>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Plus, Trash2, Loader2 } from "lucide-react";
import { addCatalogItem, deleteCatalogItem } from "@/app/(app)/pedidos/catalog-actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { money } from "@/lib/format";

type CatLite = { id: string; nombre: string; precio_base: number; categoria: string | null; unidad: string | null };

/**
 * Editor del catálogo de UNA marca: agrega/borra los atajos rápidos que salen
 * en "Nuevo pedido". Cada marca tiene su propio catálogo (KitJoy incluido).
 */
export function CatalogManagerDialog({
  brandId, brandName, items, moneda,
}: {
  brandId: string;
  brandName: string;
  items: CatLite[];
  moneda: "DOP" | "USD";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [nombre, setNombre] = useState("");
  const [precio, setPrecio] = useState("");
  const [categoria, setCategoria] = useState("");
  const [error, setError] = useState<string | null>(null);

  function agregar() {
    setError(null);
    if (!nombre.trim()) { setError("Escribe el nombre del ítem."); return; }
    start(async () => {
      const res = await addCatalogItem(brandId, {
        nombre, precio_base: precio.trim() ? Number(precio) : 0, categoria, moneda,
      });
      if (res?.error) { setError(res.error); return; }
      setNombre(""); setPrecio(""); setCategoria("");
      router.refresh();
    });
  }
  function borrar(id: string) {
    start(async () => { await deleteCatalogItem(id); router.refresh(); });
  }

  return (
    <>
      <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(true)} disabled={!brandId}>
        <Pencil className="size-3.5" /> Editar catálogo
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={`Catálogo · ${brandName || "marca"}`} className="max-w-lg">
        <div className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Estos son los atajos rápidos que aparecen al crear un pedido de esta marca. Agrega o borra los que quieras.
          </p>

          {/* Lista actual */}
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
              Esta marca aún no tiene ítems. Agrega el primero abajo.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {items.map((c) => (
                <li key={c.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <span className="font-medium">{c.nombre}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {Number(c.precio_base) > 0 ? money(Number(c.precio_base), moneda) : "sin precio"}{c.categoria ? ` · ${c.categoria}` : ""}
                    </span>
                  </div>
                  <button type="button" onClick={() => borrar(c.id)} disabled={pending}
                    className="text-muted-foreground transition-colors hover:text-destructive" aria-label={`Borrar ${c.nombre}`}>
                    <Trash2 className="size-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          {/* Agregar */}
          <div className="rounded-xl border border-border bg-background/40 p-3">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Agregar ítem</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div className="space-y-1 sm:col-span-2"><Label className="text-xs">Nombre *</Label>
                <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Toppers personalizados" /></div>
              <div className="space-y-1"><Label className="text-xs">Precio ({moneda})</Label>
                <Input type="number" inputMode="decimal" min="0" step="0.01" value={precio} onChange={(e) => setPrecio(e.target.value)} placeholder="0.00" /></div>
              <div className="space-y-1"><Label className="text-xs">Categoría (opcional)</Label>
                <Input value={categoria} onChange={(e) => setCategoria(e.target.value)} placeholder="Ej. Fiestas" /></div>
            </div>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
            <div className="mt-3 flex justify-end">
              <Button type="button" variant="gradient" size="sm" onClick={agregar} disabled={pending}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Agregar al catálogo
              </Button>
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cerrar</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

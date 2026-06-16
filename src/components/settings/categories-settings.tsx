"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Tags, Loader2 } from "lucide-react";
import { createCategory, deleteCategory } from "@/app/(app)/configuracion/actions";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Cat = { id: string; nombre: string; tipo: string };

export function CategoriesSettings({ categories }: { categories: Cat[] }) {
  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold"><Tags className="size-4 text-electric" /> Categorías</h2>
      <p className="mt-1 text-sm text-muted-foreground">Categorías de ingresos y gastos para Finanzas.</p>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Column tipo="ingreso" titulo="Ingresos" items={categories.filter((c) => c.tipo === "ingreso")} />
        <Column tipo="gasto" titulo="Gastos" items={categories.filter((c) => c.tipo === "gasto")} />
      </div>
    </AnimatedCard>
  );
}

function Column({ tipo, titulo, items }: { tipo: "ingreso" | "gasto"; titulo: string; items: Cat[] }) {
  const router = useRouter();
  const [nombre, setNombre] = useState("");
  const [pending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-border p-3">
      <p className="mb-2 text-sm font-medium">{titulo}</p>
      <ul className="space-y-1">
        {items.map((c) => (
          <li key={c.id} className="flex items-center justify-between rounded px-2 py-1.5 text-sm hover:bg-accent/40">
            {c.nombre}
            <button onClick={() => startTransition(async () => { await deleteCategory(c.id); router.refresh(); })} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3.5" /></button>
          </li>
        ))}
        {items.length === 0 && <li className="px-2 py-1 text-xs text-muted-foreground">Sin categorías</li>}
      </ul>
      <div className="mt-2 flex gap-2">
        <Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nueva categoría" className="h-9" />
        <Button size="icon" variant="outline" className="size-9 shrink-0" disabled={pending || !nombre.trim()}
          onClick={() => startTransition(async () => { await createCategory(nombre, tipo); setNombre(""); router.refresh(); })}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
        </Button>
      </div>
    </div>
  );
}

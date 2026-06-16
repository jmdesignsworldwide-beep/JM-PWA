"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Combobox } from "@/components/ui/combobox";

type Cli = { id: string; nombre: string };

/** Botón "Nuevo pedido": elige cliente y lleva al formulario de pedido. */
export function NewOrderButton({ clients }: { clients: Cli[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}><Plus className="size-4" /> Nuevo pedido</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo pedido" description="Elige el cliente para empezar.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Cliente</Label>
            <Combobox
              name="cliente_pedido"
              options={clients.map((c) => ({ value: c.id, label: c.nombre }))}
              defaultValue=""
              placeholder="Buscar cliente…"
            />
            {/* Espejo del valor para el botón (Combobox usa input oculto) */}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              variant="gradient"
              onClick={(e) => {
                const form = (e.currentTarget.closest("[role=dialog]") as HTMLElement) ?? document;
                const v = (form.querySelector('input[name="cliente_pedido"]') as HTMLInputElement)?.value;
                if (v) router.push(`/pedidos/nuevo?cliente=${v}`);
              }}
            >
              Continuar
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

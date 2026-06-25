"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, AlertTriangle } from "lucide-react";
import { deleteClient } from "@/app/(app)/clientes/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Borra un cliente/prospecto (solo owner). Pide confirmación y advierte qué se
 * borra en cascada. Si no eres owner, no se muestra.
 */
export function DeleteClientButton({
  clientId, clientName, isOwner, esLead, impacto,
}: {
  clientId: string;
  clientName: string;
  isOwner: boolean;
  esLead: boolean;
  impacto: { pedidos: number; contratos: number; facturas: number; proyectos: number };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!isOwner) return null;

  const relacionados = [
    impacto.pedidos && `${impacto.pedidos} pedido${impacto.pedidos === 1 ? "" : "s"}`,
    impacto.contratos && `${impacto.contratos} contrato${impacto.contratos === 1 ? "" : "s"}`,
    impacto.facturas && `${impacto.facturas} factura${impacto.facturas === 1 ? "" : "s"}`,
    impacto.proyectos && `${impacto.proyectos} proyecto${impacto.proyectos === 1 ? "" : "s"}`,
  ].filter(Boolean) as string[];

  function confirmar() {
    setError(null);
    startTransition(async () => {
      const res = await deleteClient(clientId);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.push("/clientes");
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="outline" className="text-destructive hover:bg-destructive/10" onClick={() => { setError(null); setOpen(true); }}>
        <Trash2 className="size-4" /> Borrar
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title={`Borrar ${esLead ? "prospecto" : "cliente"}`} className="max-w-md">
        <div className="space-y-4">
          <div className="flex gap-3 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-destructive" />
            <div className="text-sm">
              <p>Vas a borrar a <strong>{clientName}</strong>. Esta acción <strong>no se puede deshacer</strong>.</p>
              {relacionados.length > 0 && (
                <p className="mt-2 text-muted-foreground">
                  También se borrarán en cascada: <strong className="text-destructive">{relacionados.join(" · ")}</strong>.
                </p>
              )}
              <p className="mt-2 text-xs text-muted-foreground">Quedará registrado en el historial (audit log).</p>
            </div>
          </div>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={confirmar} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Sí, borrar definitivamente
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

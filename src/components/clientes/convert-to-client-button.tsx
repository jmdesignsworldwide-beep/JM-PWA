"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserCheck, ArrowRight } from "lucide-react";
import { convertToActive } from "@/app/(app)/clientes/actions";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

/**
 * Convierte un prospecto en cliente activo. Al hacerlo, se desbloquea el flujo
 * completo (Pedido → Contrato → Factura → Pago). Confirma antes para evitar
 * conversiones por error.
 */
export function ConvertToClientButton({ clientId, clientName }: { clientId: string; clientName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function convertir() {
    setError(null);
    start(async () => {
      const res = await convertToActive(clientId);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" size="sm" onClick={() => setOpen(true)}>
        <UserCheck className="size-4" /> Convertir a cliente
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Convertir a cliente">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground">{clientName}</strong> pasará de prospecto a <strong className="text-foreground">cliente activo</strong>.
            Se desbloquea el flujo completo: pedidos, contratos, facturas, pagos y el progreso del proyecto.
          </p>
          <div className="flex items-center justify-center gap-2 rounded-lg border border-border bg-background/40 py-3 text-sm">
            <span className="rounded-full border border-warning/40 px-2 py-0.5 text-warning">Prospecto</span>
            <ArrowRight className="size-4 text-muted-foreground" />
            <span className="rounded-full border border-success/40 px-2 py-0.5 text-success">Cliente activo</span>
          </div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="gradient" onClick={convertir} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Sí, convertir
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

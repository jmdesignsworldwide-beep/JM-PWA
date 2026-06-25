"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, HandCoins } from "lucide-react";
import { registerTeamPayment } from "@/app/(app)/equipo/actions";
import { rdToday } from "@/lib/fecha";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export function PaymentDialog({ memberId, saldo }: { memberId: string; saldo: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setError(null);
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => { const v = (fd.get(k) as string)?.trim(); return v ? v : null; };
    startTransition(async () => {
      const res = await registerTeamPayment({
        team_member_id: memberId,
        monto: Number(fd.get("monto")) || 0,
        moneda: (fd.get("moneda") as "DOP" | "USD") ?? "DOP",
        fecha: fd.get("fecha") as string,
        metodo: get("metodo"), nota: get("nota"),
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false); router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}><HandCoins className="size-4" /> Registrar pago</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Registrar pago al equipo" description={saldo > 0 ? `Saldo pendiente: RD$ ${saldo.toLocaleString("es-DO")}` : undefined}>
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monto</Label><Input name="monto" type="number" step="0.01" min="0" required defaultValue={saldo > 0 ? saldo : ""} /></div>
            <div className="space-y-1.5"><Label>Moneda</Label><Select name="moneda" defaultValue="DOP"><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            <div className="space-y-1.5"><Label>Fecha</Label><DatePicker name="fecha" defaultValue={rdToday()} required /></div>
            <div className="space-y-1.5"><Label>Método</Label><Input name="metodo" placeholder="Efectivo, transferencia…" /></div>
          </div>
          <div className="space-y-1.5"><Label>Nota</Label><Textarea name="nota" /></div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Guardar pago</Button></div>
        </form>
      </Dialog>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarPlus, Loader2 } from "lucide-react";
import { addEvent } from "@/app/(app)/cobros/actions";
import { EVENT_TIPO_LIST } from "@/lib/eventos";
import { rdToday } from "@/lib/fecha";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

export function AddEventDialog() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<"inicio" | "entrega" | "cobro" | "acuerdo" | "personal">("personal");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    const titulo = (fd.get("titulo") as string).trim();
    const fecha = fd.get("fecha") as string;
    const montoRaw = (fd.get("monto") as string)?.trim();
    if (!titulo || !fecha) { setError("Título y fecha son obligatorios."); return; }
    startTransition(async () => {
      const res = await addEvent({
        titulo, tipo, fecha,
        monto: montoRaw ? Number(montoRaw) : null,
        moneda: montoRaw ? (fd.get("moneda") as "DOP" | "USD") : null,
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <Button variant="gradient" onClick={() => setOpen(true)}>
        <CalendarPlus className="size-4" /> Nuevo evento
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo evento" description="Se añade al calendario. Todo cambio queda en auditoría.">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input name="titulo" required placeholder="Ej. Reunión con cliente" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)}>
                {EVENT_TIPO_LIST.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Fecha</Label>
              <Input name="fecha" type="date" required defaultValue={rdToday()} />
            </div>
          </div>
          {tipo === "cobro" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Monto</Label>
                <Input name="monto" type="number" step="0.01" min="0" placeholder="0.00" />
              </div>
              <div className="space-y-1.5">
                <Label>Moneda</Label>
                <Select name="moneda" defaultValue="DOP">
                  <option value="DOP">DOP</option>
                  <option value="USD">USD</option>
                </Select>
              </div>
            </div>
          )}
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" variant="gradient" disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Guardar
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

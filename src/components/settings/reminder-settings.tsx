"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { updateReminderSettings } from "@/app/(app)/cobros/actions";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Settings = {
  resumen_hora: string;
  dias_aviso_entrega: number;
  dias_aviso_cobro: number;
};

export function ReminderSettings({ settings }: { settings: Settings }) {
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateReminderSettings({
        resumen_hora: fd.get("resumen_hora") as string,
        dias_aviso_entrega: Number(fd.get("dias_aviso_entrega")),
        dias_aviso_cobro: Number(fd.get("dias_aviso_cobro")),
      });
      if (res?.error) { setError(res.error); return; }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    });
  }

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <BellRing className="size-4 text-electric" /> Recordatorios
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Cuándo y con cuánta anticipación quieres que el sistema te avise.
      </p>
      <form onSubmit={submit} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Hora del resumen diario</Label>
          <Input name="resumen_hora" type="time" defaultValue={settings.resumen_hora} />
        </div>
        <div className="space-y-1.5">
          <Label>Avisar entregas (días antes)</Label>
          <Input name="dias_aviso_entrega" type="number" min="0" max="30" defaultValue={settings.dias_aviso_entrega} />
        </div>
        <div className="space-y-1.5">
          <Label>Avisar cobros (días antes)</Label>
          <Input name="dias_aviso_cobro" type="number" min="0" max="30" defaultValue={settings.dias_aviso_cobro} />
        </div>
        <div className="flex items-center gap-3 sm:col-span-3">
          <Button type="submit" variant="gradient" disabled={pending}>
            {pending && <Loader2 className="size-4 animate-spin" />} Guardar
          </Button>
          {saved && <span className="flex items-center gap-1.5 text-sm text-success"><Check className="size-4" /> Guardado</span>}
          {error && <span className="text-sm text-destructive">{error}</span>}
        </div>
      </form>
    </AnimatedCard>
  );
}

"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, Loader2, Smartphone, Mail, CalendarClock, Coins, PackageCheck, ListTodo, Megaphone, Sun } from "lucide-react";
import { updateNotificationSettings, sendTestNotification } from "@/app/(app)/configuracion/actions";
import { type NotifPrefs } from "@/lib/notificaciones";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type NotifKey = "eventos" | "cobros" | "entregas" | "tareas" | "influencers" | "resumen";

const TIPOS: { key: NotifKey; label: string; desc: string; icon: typeof BellRing }[] = [
  { key: "eventos", label: "Reuniones / eventos", desc: "Antes de que ocurran", icon: CalendarClock },
  { key: "cobros", label: "Pagos por cobrar", desc: "Cuando un cliente te debe o vence un cobro", icon: Coins },
  { key: "entregas", label: "Entregas pendientes", desc: "Lo que prometiste entregar", icon: PackageCheck },
  { key: "tareas", label: "Tareas con fecha límite", desc: "Tareas del equipo por vencer", icon: ListTodo },
  { key: "influencers", label: "Entregas a influencers", desc: "Sistemas/web acordados con influencers", icon: Megaphone },
  { key: "resumen", label: "Resumen diario", desc: "Cada mañana, lo que viene ese día", icon: Sun },
];

type Settings = NotifPrefs;

export function NotificationSettings({ settings }: { settings: Settings }) {
  const [s, setS] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState<"push" | "email" | null>(null);

  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((p) => ({ ...p, [k]: v }));

  function save() {
    setError(null); setSaved(false);
    startTransition(async () => {
      const res = await updateNotificationSettings(s);
      if (res?.error) { setError(res.error); return; }
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    });
  }

  async function probar(channel: "push" | "email") {
    setTesting(channel); setTestMsg(null); setError(null);
    const res = await sendTestNotification(channel);
    setTesting(null);
    if (res?.error) { setError(res.error); return; }
    setTestMsg(res.mensaje ?? "Enviado.");
  }

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <BellRing className="size-4 text-electric" /> Notificaciones
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tú controlas qué te avisa y cómo. El <strong>correo</strong> es la base confiable; el <strong>push</strong> al teléfono es el complemento (actívalo abajo en cada dispositivo).
      </p>

      {/* Hora del resumen + ventanas de aviso */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Hora del resumen diario</Label>
          <Input type="time" value={s.resumen_hora} onChange={(e) => set("resumen_hora", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Avisar entregas (días antes)</Label>
          <Input type="number" min="0" max="30" value={s.dias_aviso_entrega} onChange={(e) => set("dias_aviso_entrega", Number(e.target.value))} />
        </div>
        <div className="space-y-1.5">
          <Label>Avisar cobros (días antes)</Label>
          <Input type="number" min="0" max="30" value={s.dias_aviso_cobro} onChange={(e) => set("dias_aviso_cobro", Number(e.target.value))} />
        </div>
      </div>

      {/* Matriz de tipos × canal */}
      <div className="mt-5 overflow-hidden rounded-xl border border-border">
        <div className="flex items-center justify-between gap-2 bg-secondary/40 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          <span>Tipo de aviso</span>
          <span className="flex shrink-0 gap-6">
            <span className="flex w-12 items-center justify-center gap-1"><Smartphone className="size-3.5" /> Push</span>
            <span className="flex w-12 items-center justify-center gap-1"><Mail className="size-3.5" /> Correo</span>
          </span>
        </div>
        {TIPOS.map(({ key, label, desc, icon: Icon }) => (
          <div key={key} className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
            <div className="flex min-w-0 items-start gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-electric" />
              <div className="min-w-0">
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
            </div>
            <div className="flex shrink-0 gap-6">
              <span className="flex w-12 justify-center"><Switch checked={s[`notif_${key}_push`]} onCheckedChange={(v) => set(`notif_${key}_push`, v)} /></span>
              <span className="flex w-12 justify-center"><Switch checked={s[`notif_${key}_email`]} onCheckedChange={(v) => set(`notif_${key}_email`, v)} /></span>
            </div>
          </div>
        ))}
      </div>

      {error && <p className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
      {testMsg && <p className="mt-4 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">{testMsg}</p>}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="gradient" onClick={save} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Guardar
        </Button>
        {saved && <span className="flex items-center gap-1.5 text-sm text-success"><Check className="size-4" /> Guardado</span>}
        <span className="mx-1 h-5 w-px bg-border" />
        <Button variant="outline" size="sm" onClick={() => probar("email")} disabled={testing !== null}>
          {testing === "email" ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />} Probar correo
        </Button>
        <Button variant="outline" size="sm" onClick={() => probar("push")} disabled={testing !== null}>
          {testing === "push" ? <Loader2 className="size-4 animate-spin" /> : <Smartphone className="size-4" />} Probar push
        </Button>
      </div>
    </AnimatedCard>
  );
}

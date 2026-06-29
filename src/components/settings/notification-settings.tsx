"use client";

import { useState, useTransition } from "react";
import { BellRing, Check, Loader2, Smartphone, Mail, CalendarClock, Coins, PackageCheck, ListTodo, Megaphone, Sun, Send, X, AlertTriangle } from "lucide-react";
import { updateNotificationSettings, sendTestNotification, sendDailyDigestNow } from "@/app/(app)/configuracion/actions";
import { type NotifPrefs } from "@/lib/notificaciones";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type NotifKey = "eventos" | "cobros" | "entregas" | "tareas" | "influencers" | "resumen";

type NotifStatus = {
  resumenHora: string;
  ultimoEnvio: string | null;
  pushDevices: number;
  cronSecret: boolean;
  resendOk: boolean;
  vapidOk: boolean;
};

type DigestOk = {
  ok: true; agenda: number; cobros: number; vacio: boolean; asunto: string;
  email: { sent: boolean; to: string | null; skipped?: string; error?: string };
  push: { sent: number; total: number; skipped?: string; error?: string };
};

const TIPOS: { key: NotifKey; label: string; desc: string; icon: typeof BellRing }[] = [
  { key: "eventos", label: "Reuniones / eventos", desc: "Antes de que ocurran", icon: CalendarClock },
  { key: "cobros", label: "Pagos por cobrar", desc: "Cuando un cliente te debe o vence un cobro", icon: Coins },
  { key: "entregas", label: "Entregas pendientes", desc: "Lo que prometiste entregar", icon: PackageCheck },
  { key: "tareas", label: "Tareas con fecha límite", desc: "Tareas del equipo por vencer", icon: ListTodo },
  { key: "influencers", label: "Entregas a influencers", desc: "Sistemas/web acordados con influencers", icon: Megaphone },
  { key: "resumen", label: "Resumen diario", desc: "Cada mañana, lo que viene ese día", icon: Sun },
];

type Settings = NotifPrefs;

export function NotificationSettings({ settings, status }: { settings: Settings; status: NotifStatus }) {
  const [s, setS] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testMsg, setTestMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [testing, setTesting] = useState<"push" | "email" | null>(null);
  const [sendingNow, setSendingNow] = useState(false);
  const [digest, setDigest] = useState<DigestOk | null>(null);

  async function enviarResumenAhora() {
    setSendingNow(true); setDigest(null); setError(null); setTestMsg(null);
    const res = await sendDailyDigestNow();
    setSendingNow(false);
    if ("error" in res && res.error) { setError(res.error); return; }
    if ("ok" in res) setDigest(res as DigestOk);
  }

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

      {/* Resumen del día — acción inmediata + estado */}
      <div className="mt-5 rounded-xl border border-electric/30 bg-electric/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <Sun className="mt-0.5 size-5 text-electric" />
            <div>
              <p className="font-medium">Resumen matutino del día</p>
              <p className="text-sm text-muted-foreground">
                Cada mañana (plan actual: <strong>~7 a.m.</strong> hora RD): toda tu agenda del día + a quién cobrarle (vencidos o que vencen). Por correo y push.
              </p>
            </div>
          </div>
          <Button variant="gradient" size="sm" onClick={enviarResumenAhora} disabled={sendingNow}>
            {sendingNow ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Enviar mi resumen de hoy ahora
          </Button>
        </div>

        {/* Diagnóstico tras enviar */}
        {digest && (
          <div className="mt-3 space-y-1.5 rounded-lg border border-border bg-card/60 p-3 text-sm">
            <p className="font-medium">{digest.asunto}</p>
            <p className="text-muted-foreground">📅 {digest.agenda} en agenda · 💰 {digest.cobros} por cobrar{digest.vacio ? " · (día despejado)" : ""}</p>
            <div className="flex flex-col gap-1 pt-1">
              <ChannelLine label="Correo" ok={digest.email.sent}
                detail={digest.email.sent ? `enviado a ${digest.email.to}` : (digest.email.error ?? digest.email.skipped ?? "—")} />
              <ChannelLine label="Push" ok={digest.push.sent > 0}
                detail={digest.push.sent > 0 ? `${digest.push.sent}/${digest.push.total} dispositivo(s)` : (digest.push.error ?? digest.push.skipped ?? "—")} />
            </div>
          </div>
        )}

        {/* Estado / diagnóstico de configuración */}
        <div className="mt-3 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
          <StatusDot ok={status.pushDevices > 0} label={status.pushDevices > 0 ? `Push activo (${status.pushDevices} disp.)` : "Sin dispositivos con push — actívalo abajo"} />
          <StatusDot ok={status.resendOk} label={status.resendOk ? "Correo configurado (Resend)" : "Falta RESEND_API_KEY"} />
          <StatusDot ok={status.vapidOk} label={status.vapidOk ? "Push configurado (VAPID)" : "Faltan llaves VAPID"} />
          <StatusDot ok={status.cronSecret} label={status.cronSecret ? "Cron diario protegido (CRON_SECRET)" : "Falta CRON_SECRET en Vercel — el cron no corre"} />
        </div>
        {status.ultimoEnvio && (
          <p className="mt-2 text-[11px] text-muted-foreground">Último resumen automático enviado: {status.ultimoEnvio}.</p>
        )}
      </div>

      {/* Hora del resumen + ventanas de aviso */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label>Hora del resumen diario</Label>
          <Input type="time" value={s.resumen_hora} onChange={(e) => set("resumen_hora", e.target.value)} />
          <p className="text-[11px] text-muted-foreground">Sale cada mañana. Con el plan actual, ~7 a.m.; una hora exacta requiere Vercel Pro.</p>
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

function StatusDot({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {ok
        ? <Check className="size-3.5 shrink-0 text-success" />
        : <AlertTriangle className="size-3.5 shrink-0 text-warning" />}
      <span className={ok ? "text-muted-foreground" : "text-foreground"}>{label}</span>
    </span>
  );
}

function ChannelLine({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <span className="flex items-center gap-1.5">
      {ok ? <Check className="size-3.5 shrink-0 text-success" /> : <X className="size-3.5 shrink-0 text-destructive" />}
      <span className="font-medium">{label}:</span>
      <span className="text-muted-foreground">{detail}</span>
    </span>
  );
}

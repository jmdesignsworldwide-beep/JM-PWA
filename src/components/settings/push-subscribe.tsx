"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { savePushSubscription } from "@/app/(app)/cobros/actions";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function PushSubscribe() {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  const supported = useSyncExternalStore(
    () => () => {},
    () => "serviceWorker" in navigator && "PushManager" in window,
    () => false,
  );

  async function subscribe() {
    setStatus("loading");
    setMsg(null);
    try {
      if (!vapid || vapid.startsWith("tu-")) {
        throw new Error("Faltan las llaves VAPID. Configúralas en Vercel (ver pasos).");
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permiso de notificaciones denegado.");
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapid),
      });
      const res = await savePushSubscription(sub.toJSON());
      if (res?.error) throw new Error(res.error);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "Error al activar push");
    }
  }

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <BellRing className="size-4 text-electric" /> Notificaciones push (celular)
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Recibe avisos de cobros y entregas en tu teléfono. Requiere instalar la
        app (PWA) y funciona en producción (HTTPS), no siempre en localhost.
      </p>
      <div className="mt-4 flex items-center gap-3">
        <Button onClick={subscribe} disabled={!supported || status === "loading" || status === "done"} variant="outline">
          {status === "loading" && <Loader2 className="size-4 animate-spin" />}
          {status === "done" ? <><Check className="size-4" /> Activadas</> : "Activar notificaciones"}
        </Button>
        {!supported && <span className="text-sm text-muted-foreground">Este navegador no soporta push.</span>}
        {msg && <span className="text-sm text-destructive">{msg}</span>}
      </div>
    </AnimatedCard>
  );
}

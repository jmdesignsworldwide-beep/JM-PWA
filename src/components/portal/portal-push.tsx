"use client";

import { useState, useSyncExternalStore } from "react";
import { BellRing, Check, Loader2 } from "lucide-react";
import { savePushSubscription } from "@/app/(app)/cobros/actions";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Opt-in de notificaciones para el cliente, dentro del portal. */
export function PortalPush() {
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
      if (!vapid || vapid.startsWith("tu-")) throw new Error("Notificaciones no disponibles aún.");
      const perm = await Notification.requestPermission();
      if (perm !== "granted") throw new Error("Permiso denegado.");
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
      setMsg(e instanceof Error ? e.message : "Error");
    }
  }

  if (!supported) return null;

  return (
    <section className="rounded-xl border border-electric/30 bg-[color-mix(in_srgb,var(--electric)_5%,transparent)] p-5">
      <h2 className="flex items-center gap-2 font-semibold"><BellRing className="size-4 text-electric" /> Avísame de cada avance</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Recibe una notificación cuando tu proyecto avance. En iPhone: toca Compartir → “Agregar a pantalla de inicio” y abre desde el ícono.
      </p>
      <Button onClick={subscribe} disabled={status === "loading" || status === "done"} variant="outline" className="mt-3">
        {status === "loading" && <Loader2 className="size-4 animate-spin" />}
        {status === "done" ? <><Check className="size-4" /> Activadas</> : "Activar notificaciones"}
      </Button>
      {msg && <p className="mt-2 text-sm text-destructive">{msg}</p>}
    </section>
  );
}

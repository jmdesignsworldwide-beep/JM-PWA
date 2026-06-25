"use client";

import { useState } from "react";
import { BellRing, Check, Loader2, Smartphone, Share, Plus } from "lucide-react";
import { savePushSubscription } from "@/app/(app)/cobros/actions";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

/** Detección del entorno (solo en cliente). */
function detect() {
  if (typeof window === "undefined") return { standalone: false, ios: false, hasPush: false };
  const standalone =
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true;
  const ua = window.navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) ||
    (window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1);
  const hasPush = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return { standalone, ios, hasPush };
}

export function PushSubscribe() {
  const vapid = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const [info] = useState(detect);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState<string | null>(null);
  const [perm, setPerm] = useState<NotificationPermission | null>(
    () => (typeof window !== "undefined" && "Notification" in window ? Notification.permission : null),
  );

  async function subscribe() {
    setStatus("loading");
    setMsg(null);
    try {
      if (!vapid || vapid.startsWith("tu-")) {
        throw new Error("Faltan las llaves VAPID en el servidor. Configúralas en Vercel.");
      }
      // iOS exige el gesto del usuario; pedimos permiso de una.
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p !== "granted") {
        throw new Error("Permiso denegado. Actívalo en Ajustes del teléfono › Notificaciones › JM Control.");
      }
      const reg = await navigator.serviceWorker.ready;
      // Reusa la suscripción si ya existe (evita errores al reactivar).
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapid),
        });
      }
      const res = await savePushSubscription(sub.toJSON());
      if (res?.error) throw new Error(res.error);
      setStatus("done");
    } catch (e) {
      setStatus("error");
      setMsg(e instanceof Error ? e.message : "No se pudo activar push.");
    }
  }

  const yaActivadas = status === "done" || perm === "granted";

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <BellRing className="size-4 text-electric" /> Notificaciones push (celular)
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Recibe los avisos directo en tu teléfono. Funciona con la app instalada en la pantalla de inicio.
      </p>

      {/* iOS sin standalone: hay que abrir desde el ícono */}
      {info.ios && !info.standalone ? (
        <div className="mt-4 rounded-lg border border-electric/30 bg-[color-mix(in_srgb,var(--electric)_7%,transparent)] p-4 text-sm">
          <p className="font-medium">Abre la app desde el ícono de la pantalla de inicio 📲</p>
          <p className="mt-1 text-muted-foreground">
            En iPhone las notificaciones solo se activan con la app instalada y abierta desde su ícono (no desde Safari).
          </p>
          <ol className="mt-2 list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>En Safari, toca <Share className="inline size-3.5 align-text-bottom" /> <strong>Compartir</strong>.</li>
            <li>Elige <Plus className="inline size-3.5 align-text-bottom" /> <strong>Agregar a inicio</strong>.</li>
            <li>Abre la app desde el ícono nuevo y vuelve aquí.</li>
          </ol>
        </div>
      ) : !info.hasPush ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Este dispositivo/navegador no soporta notificaciones push{info.ios ? " (requiere iOS 16.4 o superior)" : ""}.
        </p>
      ) : (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={subscribe} disabled={status === "loading" || yaActivadas} variant={yaActivadas ? "outline" : "gradient"}>
            {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : yaActivadas ? <Check className="size-4" /> : <Smartphone className="size-4" />}
            {yaActivadas ? "Activadas en este dispositivo" : "Activar notificaciones"}
          </Button>
          {yaActivadas && <span className="text-sm text-muted-foreground">Usa <strong>Probar push</strong> arriba para confirmar.</span>}
          {msg && <span className="text-sm text-destructive">{msg}</span>}
        </div>
      )}
    </AnimatedCard>
  );
}

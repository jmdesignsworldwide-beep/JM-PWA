"use client";

import { useEffect, useState } from "react";
import { Download, Check, MoreVertical, Share, Plus, Loader2 } from "lucide-react";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}
type WinBip = Window & { __bipEvent?: BeforeInstallPromptEvent | null };

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}
function platform(): "android" | "ios" | "other" {
  if (typeof navigator === "undefined") return "other";
  const ua = navigator.userAgent;
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)) return "ios";
  return "other";
}

/**
 * Tarjeta de instalación de la PWA, clara y por plataforma. Si Chrome ya ofrece
 * el prompt nativo (beforeinstallprompt capturado en <head>), muestra el botón
 * "Instalar app". Si no, muestra los pasos exactos (Android ⋮ / iOS Compartir).
 */
export function InstallCard() {
  const [installed, setInstalled] = useState(isStandalone);
  const [available, setAvailable] = useState(
    () => typeof window !== "undefined" && !!(window as WinBip).__bipEvent,
  );
  const [os] = useState(platform);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    const onReady = () => setAvailable(true);
    const onInstalled = () => { setInstalled(true); setAvailable(false); };
    window.addEventListener("bip-ready", onReady);
    window.addEventListener("bip-installed", onInstalled);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("bip-ready", onReady);
      window.removeEventListener("bip-installed", onInstalled);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    const e = (window as WinBip).__bipEvent;
    if (!e) return;
    setPending(true);
    try {
      await e.prompt();
      await e.userChoice;
      (window as WinBip).__bipEvent = null;
      setAvailable(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Download className="size-4 text-electric" /> Instalar la app
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Instálala en tu teléfono para abrirla como app y recibir notificaciones push.
      </p>

      {installed ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-success"><Check className="size-4" /> La app ya está instalada en este dispositivo.</p>
      ) : available ? (
        <div className="mt-4">
          <Button onClick={install} disabled={pending} variant="gradient">
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />} Instalar app
          </Button>
        </div>
      ) : os === "ios" ? (
        <ol className="mt-4 list-decimal space-y-1.5 rounded-lg border border-border bg-background/40 p-4 pl-9 text-sm text-muted-foreground">
          <li>En <strong>Safari</strong>, toca <Share className="inline size-3.5 align-text-bottom" /> <strong>Compartir</strong>.</li>
          <li>Elige <Plus className="inline size-3.5 align-text-bottom" /> <strong>Agregar a inicio</strong>.</li>
          <li>Abre la app desde el ícono nuevo.</li>
        </ol>
      ) : (
        <ol className="mt-4 list-decimal space-y-1.5 rounded-lg border border-border bg-background/40 p-4 pl-9 text-sm text-muted-foreground">
          <li>En <strong>Chrome</strong>, abre el menú <MoreVertical className="inline size-3.5 align-text-bottom" /> (arriba a la derecha).</li>
          <li>Toca <strong>«Instalar app»</strong> o <strong>«Agregar a pantalla de inicio»</strong>.</li>
          <li>Confirma y abre la app desde el ícono nuevo.</li>
        </ol>
      )}
    </AnimatedCard>
  );
}

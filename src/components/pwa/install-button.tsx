"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Evento no estándar `beforeinstallprompt` (PWA). */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

type WinBip = Window & { __bipEvent?: BeforeInstallPromptEvent | null };

/** ¿La app ya corre instalada (standalone)? */
function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Botón "Instalar app": muestra el diálogo NATIVO de instalación de Android.
 * El evento `beforeinstallprompt` se captura tempranísimo en <head>
 * (install-prompt-script) y se guarda en window.__bipEvent, así que este botón
 * lo encuentra aunque monte después (antes se perdía y nunca aparecía).
 */
export function InstallButton({ className }: { className?: string }) {
  // Lazy init: lee lo que el script de <head> ya pudo capturar (sin setState en el effect).
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    () => (typeof window !== "undefined" ? ((window as WinBip).__bipEvent ?? null) : null),
  );
  const [installed, setInstalled] = useState<boolean>(() => isStandalone());

  useEffect(() => {
    const onReady = () => setDeferred((window as WinBip).__bipEvent ?? null);
    const onPrompt = (e: Event) => { e.preventDefault(); setDeferred(e as BeforeInstallPromptEvent); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); };

    window.addEventListener("bip-ready", onReady);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    window.addEventListener("bip-installed", onInstalled);
    return () => {
      window.removeEventListener("bip-ready", onReady);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      window.removeEventListener("bip-installed", onInstalled);
    };
  }, []);

  if (installed || !deferred) return null;

  const handleInstall = async () => {
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferred(null);
    (window as WinBip).__bipEvent = null;
  };

  return (
    <Button variant="outline" size="sm" onClick={handleInstall} className={cn("gap-2", className)}>
      <Download className="size-4" />
      Instalar app
    </Button>
  );
}

"use client";

import { useEffect } from "react";

/** Registra el service worker para el shell PWA (cache básico/offline). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .catch((err) => console.error("SW registro falló:", err));
    };

    // Si la página ya cargó (común tras hidratar), registra ya; si no, espera al load.
    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

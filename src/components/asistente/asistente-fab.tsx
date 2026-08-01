"use client";

import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import { AsistenteChat } from "./asistente-chat";

/** Botón flotante del asistente (solo owner). Abre el chat en una hoja. */
export function AsistenteFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Asistente"
        className="fixed right-4 z-40 flex size-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-white shadow-lg shadow-electric/30 transition-transform hover:scale-105 active:scale-95 bottom-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:bottom-6"
      >
        <Sparkles className="size-6" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[110] flex items-end justify-center sm:items-center sm:p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative z-10 flex h-[80dvh] w-full flex-col rounded-t-2xl border border-border bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] shadow-2xl sm:h-[70vh] sm:max-w-md sm:rounded-2xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-semibold"><Sparkles className="size-4 text-electric" /> Asistente</p>
              <button onClick={() => setOpen(false)} aria-label="Cerrar" className="rounded-md p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"><X className="size-4" /></button>
            </div>
            <div className="min-h-0 flex-1">
              <AsistenteChat onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

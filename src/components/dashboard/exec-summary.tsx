"use client";

import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";

/** Resumen ejecutivo del día (Gemini). Carga al montar; cae a fallback si no hay IA. */
export function ExecSummary() {
  const [text, setText] = useState<string | null>(null);
  const [ia, setIa] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetch("/api/ai/summary")
      .then((r) => r.json())
      .then((j) => { if (!alive) return; setText(j.resumen ?? null); setIa(!!j.ia); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return (
    <div className="rounded-xl border border-border bg-[color-mix(in_srgb,var(--electric)_5%,transparent)] p-5">
      <div className="mb-2 flex items-center gap-2">
        <Sparkles className="size-4 text-electric" />
        <h2 className="font-semibold">Resumen del día</h2>
        {ia && <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-muted-foreground">IA</span>}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Analizando tu negocio…</div>
      ) : (
        <p className="text-sm leading-relaxed">{text}</p>
      )}
    </div>
  );
}

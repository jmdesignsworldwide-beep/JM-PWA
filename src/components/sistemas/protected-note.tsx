"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, Lock, Loader2, ShieldCheck } from "lucide-react";
import { revealNote } from "@/app/(app)/sistemas/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Nota protegida por PIN. El contenido NO viaja al cliente hasta que el PIN se
 * valida EN EL SERVIDOR (RPC). Cada revelación queda en el audit_log.
 */
export function ProtectedNote({ kind, id, tiene }: { kind: "account" | "project"; id: string; tiene: boolean }) {
  const [pending, start] = useTransition();
  const [abierto, setAbierto] = useState(false);
  const [pin, setPin] = useState("");
  const [nota, setNota] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!tiene) return null;

  function ver() {
    setError(null);
    start(async () => {
      const res = await revealNote(kind, id, pin);
      if (res?.error) { setError(res.error); return; }
      setNota(res.nota ?? "");
      setPin("");
    });
  }

  function ocultar() { setNota(null); setAbierto(false); setPin(""); setError(null); }

  if (nota !== null) {
    return (
      <div className="rounded-lg border border-electric/30 bg-electric/5 p-3">
        <div className="mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-medium text-electric"><ShieldCheck className="size-3.5" /> Nota protegida</span>
          <button onClick={ocultar} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><EyeOff className="size-3.5" /> Ocultar</button>
        </div>
        <p className="whitespace-pre-wrap text-sm">{nota || "(vacía)"}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      {!abierto ? (
        <button onClick={() => setAbierto(true)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <Lock className="size-4" /> Nota protegida · <span className="inline-flex items-center gap-1 text-electric"><Eye className="size-3.5" /> revelar con PIN</span>
        </button>
      ) : (
        <div className="space-y-2">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground"><Lock className="size-3.5" /> Escribe tu PIN para revelar (queda registrado).</p>
          <div className="flex gap-2">
            <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="PIN" className="h-9"
              onKeyDown={(e) => { if (e.key === "Enter") ver(); }} />
            <Button size="sm" variant="gradient" onClick={ver} disabled={pending || pin.length < 4}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />} Ver</Button>
          </div>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}

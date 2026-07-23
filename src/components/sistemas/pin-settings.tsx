"use client";

import { useEffect, useState, useTransition } from "react";
import { KeyRound, Loader2, Check, ShieldCheck } from "lucide-react";
import { getPinStatus, setPin as setPinAction } from "@/app/(app)/sistemas/actions";
import { AnimatedCard } from "@/components/animations/motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Gestión del PIN del módulo Sistemas (hasheado y validado en el servidor). */
export function SystemPinSettings() {
  const [hasPin, setHasPin] = useState<boolean | null>(null);
  const [pin, setPin] = useState("");
  const [pin2, setPin2] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  useEffect(() => { getPinStatus().then((r) => setHasPin("error" in r ? false : r.hasPin)); }, []);

  function guardar() {
    setError(null); setOk(false);
    if (!/^\d{4,10}$/.test(pin)) { setError("El PIN debe ser de 4 a 10 dígitos."); return; }
    if (pin !== pin2) { setError("Los PIN no coinciden."); return; }
    start(async () => {
      const res = await setPinAction(pin);
      if (res?.error) { setError(res.error); return; }
      setOk(true); setHasPin(true); setPin(""); setPin2("");
    });
  }

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold"><KeyRound className="size-4 text-electric" /> PIN de Sistemas</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Protege las notas sensibles del módulo <strong>Control de Sistemas</strong>. Se guarda hasheado y se valida en el servidor. Nunca protege contraseñas (esas no se guardan).
      </p>
      <div className="mt-2">
        {hasPin === null ? <span className="text-xs text-muted-foreground">Cargando…</span>
          : hasPin ? <span className="inline-flex items-center gap-1.5 text-xs text-success"><ShieldCheck className="size-3.5" /> PIN configurado</span>
          : <span className="text-xs text-warning">Aún no has configurado un PIN.</span>}
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5"><Label>{hasPin ? "Nuevo PIN" : "PIN"} (4–10 dígitos)</Label>
          <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" /></div>
        <div className="space-y-1.5"><Label>Repite el PIN</Label>
          <Input type="password" inputMode="numeric" value={pin2} onChange={(e) => setPin2(e.target.value)} placeholder="••••" /></div>
      </div>
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      {ok && <p className="mt-2 flex items-center gap-1.5 text-sm text-success"><Check className="size-4" /> PIN guardado.</p>}
      <div className="mt-3">
        <Button variant="gradient" size="sm" onClick={guardar} disabled={pending || !pin || !pin2}>{pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} {hasPin ? "Cambiar PIN" : "Configurar PIN"}</Button>
      </div>
    </AnimatedCard>
  );
}

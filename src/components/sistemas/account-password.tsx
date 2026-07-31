"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Lock, Eye, EyeOff, Copy, Check, Loader2, Pencil, Plus } from "lucide-react";
import { saveAccountPassword, revealAccountPassword, saveProjectPassword, revealProjectPassword } from "@/app/(app)/sistemas/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Contraseña (de cuenta o de proyecto). Se guarda CIFRADA y solo se revela con
 * el PIN, verificado en el servidor. Cada revelación queda auditada.
 */
export function AccountPassword({ kind = "account", id, accountId, tiene }: { kind?: "account" | "project"; id?: string; accountId?: string; tiene: boolean }) {
  const targetId = id ?? accountId!;
  const doSave = kind === "project" ? saveProjectPassword : saveAccountPassword;
  const doReveal = kind === "project" ? revealProjectPassword : revealAccountPassword;
  const [editar, setEditar] = useState(false);
  const [verPin, setVerPin] = useState(false);
  const [pass, setPass] = useState<string | null>(null);

  return (
    <div className="rounded-lg border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <KeyRound className="size-4 text-electric" /> {kind === "project" ? "Contraseña" : "Contraseña de Supabase"}
        </span>
        <Button variant="ghost" size="sm" onClick={() => setEditar(true)}>
          {tiene ? <><Pencil className="size-3.5" /> Cambiar</> : <><Plus className="size-4" /> Agregar</>}
        </Button>
      </div>

      {tiene ? (
        pass != null ? (
          <div className="mt-2 flex items-center gap-2 rounded-md border border-electric/30 bg-electric/5 px-3 py-2">
            <code className="min-w-0 flex-1 truncate font-mono text-sm">{pass || "(vacía)"}</code>
            <CopyBtn text={pass} />
            <button onClick={() => setPass(null)} className="text-muted-foreground hover:text-foreground" title="Ocultar"><EyeOff className="size-4" /></button>
          </div>
        ) : (
          <button onClick={() => setVerPin(true)} className="mt-2 flex items-center gap-1.5 text-sm text-electric hover:underline">
            <Eye className="size-3.5" /> Revelar con PIN
          </button>
        )
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Sin contraseña guardada. Agrégala cifrada (se revela con tu PIN).</p>
      )}

      {editar && (
        <SetPasswordDialog targetId={targetId} doSave={doSave} tiene={tiene} onClose={() => setEditar(false)} onSaved={() => setPass(null)} />
      )}
      {verPin && (
        <PinDialog
          title="Ver contraseña" onClose={() => setVerPin(false)}
          onConfirm={async (pin) => {
            const res = await doReveal(targetId, pin);
            if (res?.error) return res.error;
            setPass(res.password ?? "");
            setVerPin(false);
            return null;
          }}
        />
      )}
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  if (!text) return null;
  return (
    <button onClick={async () => { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1500); }}
      className="text-muted-foreground hover:text-electric" title="Copiar">
      {ok ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
    </button>
  );
}

function SetPasswordDialog({ targetId, doSave, tiene, onClose, onSaved }: {
  targetId: string;
  doSave: (id: string, password: string, pin: string) => Promise<{ error?: string; ok?: boolean }>;
  tiene: boolean; onClose: () => void; onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [pin, setPin] = useState("");

  function guardar() {
    setError(null);
    if (!password.trim()) { setError("Escribe la contraseña."); return; }
    if (!/^\d{4,10}$/.test(pin.trim())) { setError("Escribe tu PIN (4 a 10 dígitos)."); return; }
    start(async () => {
      const res = await doSave(targetId, password, pin);
      if (res?.error) { setError(res.error); return; }
      onSaved(); onClose(); router.refresh();
    });
  }

  return (
    <Dialog open onClose={onClose} title={tiene ? "Cambiar contraseña" : "Guardar contraseña"} description="Se guarda cifrada. Requiere tu PIN." className="max-w-sm">
      <div className="space-y-4">
        <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><KeyRound className="size-3.5" /> Contraseña de Supabase</Label>
          <Input value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" placeholder="La contraseña del correo" /></div>
        <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Lock className="size-3.5" /> PIN</Label>
          <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoComplete="off" placeholder="Tu PIN de Sistemas" /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="gradient" onClick={guardar} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Guardar</Button>
        </div>
      </div>
    </Dialog>
  );
}

function PinDialog({ title, onClose, onConfirm }: { title: string; onClose: () => void; onConfirm: (pin: string) => Promise<string | null> }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  function confirmar() {
    setError(null);
    if (!/^\d{4,10}$/.test(pin.trim())) { setError("Escribe tu PIN (4 a 10 dígitos)."); return; }
    start(async () => { const err = await onConfirm(pin.trim()); if (err) setError(err); });
  }

  return (
    <Dialog open onClose={onClose} title={title} description="Verificación por PIN (queda registrada)." className="max-w-sm">
      <div className="space-y-4">
        <div className="space-y-1.5"><Label className="flex items-center gap-1.5"><Lock className="size-3.5" /> PIN</Label>
          <Input type="password" inputMode="numeric" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus autoComplete="off"
            onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }} placeholder="Tu PIN de Sistemas" /></div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button variant="gradient" onClick={confirmar} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />} Ver</Button>
        </div>
      </div>
    </Dialog>
  );
}

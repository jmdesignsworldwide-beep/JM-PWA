"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Landmark, Lock, Eye, Copy, Check, Pencil, Plus, Loader2, ShieldCheck } from "lucide-react";
import type { ContactBank } from "@/lib/data/clients";
import { saveContactBank, revealBank } from "@/app/(app)/clientes/bank-actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { useRouter } from "next/navigation";

const TIPO_LABEL: Record<string, string> = { ahorros: "Ahorros", corriente: "Corriente" };

export function BankCard({ clientId, bank, hasPin, titularSugerido }: {
  clientId: string; bank: ContactBank | null; hasPin: boolean; titularSugerido?: string;
}) {
  const [editar, setEditar] = useState(false);
  const [verPin, setVerPin] = useState(false);
  const [numero, setNumero] = useState<string | null>(null);

  const tieneNumero = !!bank?.numero_ultimos4;

  return (
    <section className="rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Landmark className="size-4 text-electric" /> Datos bancarios</h2>
        <Button variant="ghost" size="sm" onClick={() => setEditar(true)}>
          {bank ? <><Pencil className="size-3.5" /> Editar</> : <><Plus className="size-4" /> Agregar</>}
        </Button>
      </div>

      {!hasPin && (
        <p className="mb-3 flex items-center gap-1.5 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 text-xs text-warning-foreground">
          <ShieldCheck className="size-3.5 shrink-0" /> Configura primero el PIN en <Link href="/sistemas" className="underline">Sistemas</Link> para proteger la cuenta.
        </p>
      )}

      {!bank ? (
        <p className="text-sm text-muted-foreground">Sin datos bancarios. Toca <strong>Agregar</strong> para guardar a dónde pagarle (el número va cifrado).</p>
      ) : (
        <div className="space-y-2 text-sm">
          <Dato label="Banco" value={bank.banco} />
          <Dato label="Tipo" value={bank.tipo_cuenta ? TIPO_LABEL[bank.tipo_cuenta] : null} />
          <Dato label="Titular" value={bank.titular} />
          <Dato label="Cédula / RNC" value={bank.cedula_rnc} />
          <div className="flex flex-wrap items-center gap-2">
            <span className="w-28 shrink-0 text-muted-foreground">Cuenta</span>
            {tieneNumero ? (
              numero != null ? (
                <span className="flex items-center gap-2 font-mono font-medium">
                  {numero || "—"}
                  <CopyBtn text={numero} />
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span className="font-mono tracking-wider text-muted-foreground">•••• •••• {bank.numero_ultimos4}</span>
                  <Button variant="outline" size="sm" onClick={() => setVerPin(true)}><Eye className="size-3.5" /> Ver número</Button>
                </span>
              )
            ) : (
              <span className="text-muted-foreground">— sin número —</span>
            )}
          </div>
        </div>
      )}

      {editar && (
        <BankFormDialog
          clientId={clientId} bank={bank} titularSugerido={titularSugerido}
          onClose={() => setEditar(false)} onSaved={() => { setNumero(null); }}
        />
      )}
      {verPin && (
        <PinDialog
          title="Ver número de cuenta" cta="Ver número"
          onClose={() => setVerPin(false)}
          onConfirm={async (pin) => {
            const res = await revealBank(clientId, pin);
            if (res?.error) return res.error;
            setNumero(res.numero ?? "");
            setVerPin(false);
            return null;
          }}
        />
      )}
    </section>
  );
}

function Dato({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2">
      <span className="w-28 shrink-0 text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}

function CopyBtn({ text }: { text: string }) {
  const [copiado, setCopiado] = useState(false);
  if (!text) return null;
  return (
    <button
      onClick={async () => { await navigator.clipboard.writeText(text); setCopiado(true); setTimeout(() => setCopiado(false), 1500); }}
      className="text-muted-foreground hover:text-electric" title="Copiar">
      {copiado ? <Check className="size-3.5 text-success" /> : <Copy className="size-3.5" />}
    </button>
  );
}

function BankFormDialog({ clientId, bank, titularSugerido, onClose, onSaved }: {
  clientId: string; bank: ContactBank | null; titularSugerido?: string; onClose: () => void; onSaved: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [banco, setBanco] = useState(bank?.banco ?? "");
  const [tipo, setTipo] = useState<"ahorros" | "corriente" | "">(bank?.tipo_cuenta ?? "");
  const [titular, setTitular] = useState(bank?.titular ?? titularSugerido ?? "");
  const [cedula, setCedula] = useState(bank?.cedula_rnc ?? "");
  const [numero, setNumero] = useState("");
  const [pin, setPin] = useState("");

  function guardar() {
    setError(null);
    if (!/^\d{4,10}$/.test(pin.trim())) { setError("Escribe el PIN (4 a 10 dígitos)."); return; }
    start(async () => {
      const res = await saveContactBank({
        client_id: clientId, banco, tipo_cuenta: tipo, titular, cedula_rnc: cedula,
        numero: numero.trim() || null, pin,
      });
      if (res?.error) { setError(res.error); return; }
      onSaved(); onClose(); router.refresh();
    });
  }

  return (
    <Dialog open onClose={onClose} title="Datos bancarios" description="El número de cuenta se guarda cifrado. Requiere tu PIN." className="max-w-md">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Banco</Label><Input value={banco} onChange={(e) => setBanco(e.target.value)} placeholder="Ej. Popular" /></div>
          <div className="space-y-1.5"><Label>Tipo de cuenta</Label>
            <Select value={tipo} onChange={(e) => setTipo(e.target.value as "ahorros" | "corriente" | "")}>
              <option value="">— Sin especificar —</option>
              <option value="ahorros">Ahorros</option>
              <option value="corriente">Corriente</option>
            </Select></div>
        </div>
        <div className="space-y-1.5"><Label>Titular</Label><Input value={titular} onChange={(e) => setTitular(e.target.value)} placeholder="Nombre en la cuenta" /></div>
        <div className="space-y-1.5"><Label>Cédula / RNC</Label><Input value={cedula} onChange={(e) => setCedula(e.target.value)} placeholder="000-0000000-0" /></div>
        <div className="space-y-1.5">
          <Label>Número de cuenta</Label>
          <Input value={numero} onChange={(e) => setNumero(e.target.value)} inputMode="numeric"
            placeholder={bank?.numero_ultimos4 ? `Guardado ••••${bank.numero_ultimos4} — deja vacío para conservarlo` : "Solo dígitos"} />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Lock className="size-3.5" /> PIN</Label>
          <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" autoComplete="off" placeholder="Tu PIN de Sistemas" />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="gradient" onClick={guardar} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />} Guardar
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function PinDialog({ title, cta, onClose, onConfirm }: {
  title: string; cta: string; onClose: () => void; onConfirm: (pin: string) => Promise<string | null>;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [pin, setPin] = useState("");

  function confirmar() {
    setError(null);
    if (!/^\d{4,10}$/.test(pin.trim())) { setError("Escribe el PIN (4 a 10 dígitos)."); return; }
    start(async () => {
      const err = await onConfirm(pin.trim());
      if (err) setError(err);
    });
  }

  return (
    <Dialog open onClose={onClose} title={title} description="Verificación por PIN (se registra el acceso)." className="max-w-sm">
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5"><Lock className="size-3.5" /> PIN</Label>
          <Input type="password" value={pin} onChange={(e) => setPin(e.target.value)} inputMode="numeric" autoComplete="off"
            autoFocus onKeyDown={(e) => { if (e.key === "Enter") confirmar(); }} placeholder="Tu PIN de Sistemas" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="gradient" onClick={confirmar} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Eye className="size-4" />} {cta}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

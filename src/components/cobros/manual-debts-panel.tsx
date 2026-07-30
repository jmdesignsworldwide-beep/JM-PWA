"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Check, UserPlus, Search, HandCoins, Receipt, ImageUp, X } from "lucide-react";
import { addDebt, addDebtPayment, deleteDebt, deleteDebtPayment, toggleDebtSaldado } from "@/app/(app)/cobros/debt-actions";
import type { ManualDebt } from "@/lib/data/debts";
import { uploadFile } from "@/lib/upload";
import { money, fechaCorta } from "@/lib/format";
import { rdToday } from "@/lib/fecha";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Contacto = { id: string; nombre: string; apellido: string | null; es_personal: boolean; es_lead: boolean };

export function ManualDebtsPanel({ debts, contacts }: { debts: ManualDebt[]; contacts: Contacto[] }) {
  const activos = debts.filter((d) => !d.saldado && d.saldo > 0);
  const saldados = debts.filter((d) => d.saldado || d.saldo <= 0);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Registrar deuda</Button>
      </div>

      {activos.length === 0 && saldados.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-6 text-center text-sm text-muted-foreground">
          Sin deudas manuales. Toca <strong>Registrar deuda</strong> para anotar a quién le debes.
        </div>
      ) : (
        <>
          {activos.map((d) => <DebtRow key={d.id} d={d} />)}
          {saldados.length > 0 && (
            <details className="rounded-xl border border-border bg-card/60">
              <summary className="cursor-pointer list-none px-4 py-2.5 text-sm text-muted-foreground">
                {saldados.length} saldada{saldados.length === 1 ? "" : "s"}
              </summary>
              <div className="space-y-2 px-2 pb-2">{saldados.map((d) => <DebtRow key={d.id} d={d} />)}</div>
            </details>
          )}
        </>
      )}

      {open && <RegistrarDeudaDialog contacts={contacts} onClose={() => setOpen(false)} />}
    </div>
  );
}

function DebtRow({ d }: { d: ManualDebt }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [pagar, setPagar] = useState(false);
  const saldada = d.saldado || d.saldo <= 0;

  function marcar() { start(async () => { await toggleDebtSaldado(d.id, !d.saldado); router.refresh(); }); }
  function borrar() { start(async () => { await deleteDebt(d.id); router.refresh(); }); }
  function borrarPago(id: string) { start(async () => { await deleteDebtPayment(id); router.refresh(); }); }

  return (
    <div className={cn("rounded-xl border px-4 py-3 text-sm",
      saldada ? "border-border bg-card/60" : "border-destructive/40 bg-destructive/5")}>
      <div className="flex flex-wrap items-center gap-3">
        <Link href={`/clientes/${d.client_id}`} className="font-medium hover:text-electric">{d.personaNombre}</Link>
        {d.personaEsPersonal && <span className="rounded bg-accent px-1.5 py-0.5 text-[11px] text-muted-foreground">Personal</span>}
        <span className="text-xs text-muted-foreground">
          {d.concepto ? `${d.concepto} · ` : ""}desde {fechaCorta(d.fecha)}
        </span>
        <span className={cn("ml-auto font-semibold", saldada ? "text-success" : "text-destructive")}>
          {saldada ? "Saldada" : `Debes ${money(d.saldo, d.moneda)}`}
        </span>
        {!saldada && (
          <button onClick={() => setPagar(true)} disabled={pending} title="Registrar abono"
            className="rounded-md p-1 text-muted-foreground hover:text-electric"><HandCoins className="size-4" /></button>
        )}
        <button onClick={marcar} disabled={pending} title={d.saldado ? "Marcar pendiente" : "Marcar saldada"}
          className="rounded-md p-1 text-muted-foreground hover:text-success"><Check className="size-4" /></button>
        <button onClick={borrar} disabled={pending} title="Borrar" className="rounded-md p-1 text-muted-foreground hover:text-destructive">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
        </button>
      </div>

      {d.pagado > 0 && (
        <div className="mt-2 text-xs text-muted-foreground">
          Pagado {money(d.pagado, d.moneda)} de {money(Number(d.monto), d.moneda)}
          {d.pagos.length > 0 && (
            <ul className="mt-1 space-y-0.5">
              {d.pagos.map((p) => (
                <li key={p.id} className="flex items-center gap-2">
                  <span>· {fechaCorta(p.fecha)} — {money(Number(p.monto), p.moneda)}{p.metodo ? ` · ${p.metodo}` : ""}</span>
                  <button onClick={() => borrarPago(p.id)} disabled={pending} title="Borrar abono"
                    className="text-muted-foreground hover:text-destructive"><Trash2 className="size-3" /></button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {pagar && <PagarDeudaDialog d={d} onClose={() => setPagar(false)} />}
    </div>
  );
}

function PagarDeudaDialog({ d, onClose }: { d: ManualDebt; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [monto, setMonto] = useState(String(d.saldo || ""));
  const [moneda, setMoneda] = useState<"DOP" | "USD">(d.moneda);
  const [fecha, setFecha] = useState(rdToday());
  const [metodo, setMetodo] = useState("");
  const [nota, setNota] = useState("");
  const [file, setFile] = useState<File | null>(null);

  function guardar() {
    setError(null);
    const m = Number(monto);
    if (!m || m <= 0) { setError("Escribe un monto mayor que cero."); return; }
    start(async () => {
      let comprobante_url: string | null = null;
      if (file && file.size > 0) {
        setUploading(true);
        comprobante_url = await uploadFile("comprobantes", file);
        setUploading(false);
      }
      const res = await addDebtPayment({
        debt_id: d.id, monto: m, moneda, fecha,
        metodo: metodo || null, nota: nota || null, comprobante_url,
      });
      if (res?.error) { setError(res.error); return; }
      onClose(); router.refresh();
    });
  }

  const busy = pending || uploading;

  return (
    <Dialog open onClose={onClose} title={`Pagar a ${d.personaNombre}`} description="El abono entra solo a Finanzas como gasto." className="max-w-md">
      <div className="space-y-4">
        <div className="rounded-lg border border-border bg-card/60 px-3 py-2 text-sm text-muted-foreground">
          Saldo pendiente: <strong className="text-foreground">{money(d.saldo, d.moneda)}</strong>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>Monto del abono</Label>
            <Input type="number" inputMode="decimal" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-1.5"><Label>Moneda</Label>
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as "DOP" | "USD")}><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Método</Label>
            <Select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="">— Sin especificar —</option>
              <option value="efectivo">Efectivo</option>
              <option value="tarjeta">Tarjeta</option>
              <option value="transferencia">Transferencia</option>
              <option value="otro">Otro</option>
            </Select></div>
        </div>
        <div className="space-y-1.5"><Label>Nota (opcional)</Label><Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalle…" /></div>

        <div className="space-y-1.5">
          <Label>Comprobante (opcional)</Label>
          {file ? (
            <div className="flex items-center gap-2 rounded-lg border border-border bg-card/60 px-3 py-2 text-sm">
              <Receipt className="size-4 text-electric" />
              <span className="min-w-0 flex-1 truncate">{file.name}</span>
              <button onClick={() => setFile(null)} className="text-muted-foreground hover:text-destructive"><X className="size-4" /></button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 text-sm text-muted-foreground hover:bg-accent/40">
              <ImageUp className="size-4" /> Subir imagen
              <input type="file" accept="image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="gradient" onClick={guardar} disabled={busy}>
            {busy ? <Loader2 className="size-4 animate-spin" /> : <HandCoins className="size-4" />} {uploading ? "Subiendo…" : "Registrar abono"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

function RegistrarDeudaDialog({ contacts, onClose }: { contacts: Contacto[]; onClose: () => void }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Contacto | null>(null);
  const [monto, setMonto] = useState("");
  const [moneda, setMoneda] = useState<"DOP" | "USD">("DOP");
  const [fecha, setFecha] = useState(rdToday());
  const [concepto, setConcepto] = useState("");
  const [nota, setNota] = useState("");

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t || sel) return [];
    return contacts.filter((c) => `${c.nombre} ${c.apellido ?? ""}`.toLowerCase().includes(t)).slice(0, 6);
  }, [q, sel, contacts]);

  function guardar() {
    setError(null);
    const m = Number(monto);
    if (!m || m <= 0) { setError("Escribe un monto mayor que cero."); return; }
    if (!sel && !q.trim()) { setError("Elige a quién le debes o escribe un nombre nuevo."); return; }
    start(async () => {
      const res = await addDebt({
        client_id: sel?.id ?? null,
        nuevoPersonalNombre: sel ? null : q.trim(),
        monto: m, moneda, fecha, concepto, nota,
      });
      if (res?.error) { setError(res.error); return; }
      onClose(); router.refresh();
    });
  }

  const tipoLabel = (c: Contacto) => c.es_personal ? "Personal" : c.es_lead ? "Prospecto" : "Cliente";

  return (
    <Dialog open onClose={onClose} title="Registrar deuda" className="max-w-md">
      <div className="space-y-4">
        {/* ¿A quién le debo? */}
        <div className="space-y-1.5">
          <Label>¿A quién le debes?</Label>
          {sel ? (
            <div className="flex items-center justify-between rounded-lg border border-electric/40 bg-electric/10 px-3 py-2 text-sm">
              <span className="font-medium">{sel.nombre} {sel.apellido ?? ""}</span>
              <button onClick={() => { setSel(null); setQ(""); }} className="text-xs text-muted-foreground hover:text-foreground">cambiar</button>
            </div>
          ) : (
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca la persona o escribe un nombre nuevo" className="pl-9" />
              {matches.length > 0 && (
                <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
                  {matches.map((c) => (
                    <button key={c.id} type="button" onClick={() => setSel(c)}
                      className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent">
                      <span>{c.nombre} {c.apellido ?? ""}</span>
                      <span className="text-[11px] text-muted-foreground">{tipoLabel(c)}</span>
                    </button>
                  ))}
                </div>
              )}
              {q.trim() && matches.length === 0 && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><UserPlus className="size-3.5" /> Se creará el contacto Personal <strong>“{q.trim()}”</strong>.</p>
              )}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2 space-y-1.5"><Label>Monto</Label>
            <Input type="number" inputMode="decimal" min="0" step="0.01" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder="0.00" /></div>
          <div className="space-y-1.5"><Label>Moneda</Label>
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as "DOP" | "USD")}><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label>Desde qué fecha</Label><Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Concepto</Label><Input value={concepto} onChange={(e) => setConcepto(e.target.value)} placeholder="¿Por qué le debes?" /></div>
        </div>
        <div className="space-y-1.5"><Label>Nota (opcional)</Label><Input value={nota} onChange={(e) => setNota(e.target.value)} placeholder="Detalle…" /></div>

        {error && <p className="text-sm text-destructive">{error}</p>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
          <Button type="button" variant="gradient" onClick={guardar} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Registrar deuda
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

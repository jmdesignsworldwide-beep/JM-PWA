"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, RefreshCw, Repeat } from "lucide-react";
import { addRecurringPlan, toggleRecurring, generateRecurringDue } from "@/app/(app)/finanzas/actions";
import { money, fechaCorta } from "@/lib/format";
import { rdToday } from "@/lib/fecha";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

type Plan = {
  id: string; client_id: string; tipo: string | null; monto: number; moneda: string;
  frecuencia: string | null; proxima_factura: string | null; activo: boolean;
};
type Opt = { id: string; nombre: string };

export function RecurringManager({ plans, mrr, clients, clientMap }: {
  plans: Plan[]; mrr: number; clients: Opt[]; clientMap: Record<string, string>;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [genMsg, setGenMsg] = useState<string | null>(null);

  function create(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await addRecurringPlan({
        client_id: fd.get("client_id") as string,
        tipo: fd.get("tipo") as "mantenimiento" | "hosting" | "retainer",
        monto: Number(fd.get("monto")),
        moneda: (fd.get("moneda") as "DOP" | "USD") ?? "DOP",
        frecuencia: fd.get("frecuencia") as "mensual" | "trimestral" | "anual",
        proxima_factura: fd.get("proxima_factura") as string,
      });
      if (res?.error) { setError(res.error); return; }
      setOpen(false); router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">MRR (ingreso recurrente mensual)</p>
          <p className="text-2xl font-semibold text-gradient">{money(mrr, "DOP")}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" disabled={pending}
            onClick={() => startTransition(async () => { const r = await generateRecurringDue(); setGenMsg(`Generadas: ${r.generadas ?? 0}`); router.refresh(); })}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Generar vencidas
          </Button>
          <Button variant="gradient" onClick={() => setOpen(true)}><Plus className="size-4" /> Nuevo plan</Button>
        </div>
      </div>
      {genMsg && <p className="text-sm text-success">{genMsg}</p>}

      {plans.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          Sin planes recurrentes. Crea mantenimiento, hosting o retainers.
        </div>
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
              <Repeat className="size-4 text-electric" />
              <div className="min-w-0 flex-1">
                <p className="font-medium capitalize">{p.tipo} · {clientMap[p.client_id] ?? "Cliente"}</p>
                <p className="text-xs text-muted-foreground">{p.frecuencia} · próxima: {fechaCorta(p.proxima_factura)}</p>
              </div>
              <Badge>{money(p.monto, p.moneda)}</Badge>
              <Switch checked={p.activo} onCheckedChange={(v) => startTransition(async () => { await toggleRecurring(p.id, v); router.refresh(); })} />
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Nuevo plan recurrente">
        <form onSubmit={create} className="space-y-4">
          <div className="space-y-1.5"><Label>Cliente</Label>
            <Select name="client_id" required defaultValue=""><option value="">— Elegir —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Tipo</Label><Select name="tipo" defaultValue="mantenimiento"><option value="mantenimiento">Mantenimiento</option><option value="hosting">Hosting</option><option value="retainer">Retainer</option></Select></div>
            <div className="space-y-1.5"><Label>Frecuencia</Label><Select name="frecuencia" defaultValue="mensual"><option value="mensual">Mensual</option><option value="trimestral">Trimestral</option><option value="anual">Anual</option></Select></div>
            <div className="space-y-1.5"><Label>Monto</Label><Input name="monto" type="number" step="0.01" min="0" required /></div>
            <div className="space-y-1.5"><Label>Moneda</Label><Select name="moneda" defaultValue="DOP"><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            <div className="space-y-1.5 col-span-2"><Label>Próxima factura</Label><DatePicker name="proxima_factura" defaultValue={rdToday()} required /></div>
          </div>
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2"><Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button><Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Guardar</Button></div>
        </form>
      </Dialog>
    </div>
  );
}

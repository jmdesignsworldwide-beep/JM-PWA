"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { MessageCircle } from "lucide-react";
import type { Task, TeamPayment, TeamMember } from "@/lib/data/equipo";
import { updateTaskStage } from "@/app/(app)/equipo/actions";
import { NewTaskDialog } from "./new-task-dialog";
import { PaymentDialog } from "./payment-dialog";
import { money, fechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Opt = { id: string; nombre: string };
type Totals = { acordado: number; pagado: number; saldo: number; acordadoTotal: number };
const ESTADOS = [{ id: "pendiente", label: "Pendiente" }, { id: "en_progreso", label: "En progreso" }, { id: "hecha", label: "Hecha" }];

export function MemberDetail({ member, tasks, payments, totals, projects }: {
  member: TeamMember; tasks: Task[]; payments: TeamPayment[]; totals: Totals; projects: Opt[];
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const wa = (member.whatsapp ?? member.telefono ?? "").replace(/\D/g, "");
  const pct = totals.acordado > 0 ? Math.min(100, (totals.pagado / totals.acordado) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Saldo (Marien le debe) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-semibold">Cuenta con {member.nombre}</h2>
          <PaymentDialog memberId={member.id} saldo={totals.saldo} />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <Stat label="Acordado (hecho)" value={money(totals.acordado, "DOP")} />
          <Stat label="Pagado" value={money(totals.pagado, "DOP")} />
          <Stat label="Le debes" value={money(totals.saldo, "DOP")} highlight={totals.saldo > 0} />
        </div>
        <div className="mt-3 h-2 rounded-full bg-secondary">
          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Pagado {pct.toFixed(0)}% de lo acordado por trabajo hecho. (Acordado total incl. pendientes: {money(totals.acordadoTotal, "DOP")}.)</p>
      </div>

      {/* Tareas */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="font-semibold">Tareas</h2>
          <NewTaskDialog members={[{ id: member.id, nombre: member.nombre }]} projects={projects} defaultMemberId={member.id} />
        </div>
        <div className="space-y-2 p-3">
          {tasks.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Sin tareas asignadas.</p> : tasks.map((t) => (
            <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
              <div className="min-w-0 flex-1">
                <p className="font-medium">{t.descripcion}</p>
                <p className="text-xs text-muted-foreground">{t.fecha_limite ? `Límite ${fechaCorta(t.fecha_limite)}` : "Sin fecha"}</p>
              </div>
              <Badge>{money(t.monto, t.moneda)}</Badge>
              <Select defaultValue={t.estado} className="h-8 w-32"
                onChange={(e) => start(async () => { await updateTaskStage(t.id, e.target.value as "pendiente" | "en_progreso" | "hecha", member.id); router.refresh(); })}>
                {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
              {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola ${member.nombre} 👋, tarea: ${t.descripcion}`)}`} target="_blank" rel="noopener noreferrer" className="text-success"><MessageCircle className="size-4" /></a>}
            </div>
          ))}
        </div>
      </div>

      {/* Pagos */}
      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3 font-semibold">Historial de pagos</div>
        <div className="space-y-2 p-3">
          {payments.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">Aún no hay pagos.</p> : payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm">
              <div><p className="font-medium">{money(p.monto, p.moneda)}</p><p className="text-xs text-muted-foreground">{fechaCorta(p.fecha)}{p.metodo ? ` · ${p.metodo}` : ""}{p.nota ? ` · ${p.nota}` : ""}</p></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-border p-2.5", highlight && "border-destructive/40 bg-destructive/10")}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold", highlight && "text-destructive")}>{value}</p>
    </div>
  );
}

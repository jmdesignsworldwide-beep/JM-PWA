"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListTodo, User, Plus } from "lucide-react";
import { updateTaskStage } from "@/app/(app)/equipo/actions";
import { NewTaskDialog } from "@/components/equipo/new-task-dialog";
import { money, fechaCorta } from "@/lib/format";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Task = {
  id: string; descripcion: string; estado: string; monto: number; moneda: string;
  fecha_limite: string | null; team_member_id: string | null; miembroNombre: string | null;
};
type Member = { id: string; nombre: string };

const ESTADOS = [
  { id: "pendiente", label: "Pendiente" },
  { id: "en_progreso", label: "En progreso" },
  { id: "hecha", label: "Hecha" },
];

/**
 * Tareas DENTRO del pedido (el trabajo del pedido, con su pago a quien la hace).
 * Distinto de "Mis pendientes" (lista personal). Si una tarea tiene monto y está
 * asignada, ese monto es lo que le debes → aparece en "¿A quién le debo?" (Cobros).
 */
export function OrderTasks({ orderId, tasks, members }: { orderId: string; tasks: Task[]; members: Member[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function setEstado(id: string, estado: string, memberId: string | null) {
    start(async () => {
      await updateTaskStage(id, estado as "pendiente" | "en_progreso" | "hecha", memberId);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h3 className="flex items-center gap-2 font-semibold"><ListTodo className="size-4 text-electric" /> Tareas del trabajo</h3>
        <NewTaskDialog
          orderId={orderId} members={members} projects={[]}
          trigger={<Button variant="outline" size="sm"><Plus className="size-4" /> Nueva tarea</Button>}
        />
      </div>
      <div className="p-4">
        {tasks.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Sin tareas todavía. Añade el trabajo a repartir — con su pago y a quién se asigna.
          </p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.descripcion}</p>
                  <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><User className="size-3" /> {t.miembroNombre ?? "Sin asignar"}</span>
                    {t.fecha_limite && <span>· {fechaCorta(t.fecha_limite)}</span>}
                  </p>
                </div>
                {Number(t.monto) > 0 && <Badge>{money(t.monto, t.moneda)}</Badge>}
                <Select
                  value={t.estado}
                  onChange={(e) => setEstado(t.id, e.target.value, t.team_member_id)}
                  disabled={pending}
                  className="h-8 w-36"
                >
                  {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Select>
              </li>
            ))}
          </ul>
        )}
        {tasks.some((t) => Number(t.monto) > 0 && t.team_member_id) && (
          <p className="mt-3 text-xs text-muted-foreground">
            Las tareas asignadas con monto aparecen en <strong>Cobros → ¿A quién le debo?</strong> al marcarlas hechas.
          </p>
        )}
      </div>
    </section>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Users, ListTodo, HandCoins, MessageCircle } from "lucide-react";
import type { MemberSaldo } from "@/lib/data/equipo";
import { updateTaskStage } from "@/app/(app)/equipo/actions";
import { NewMemberDialog } from "./new-member-dialog";
import { NewTaskDialog } from "./new-task-dialog";
import { money, fechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Opt = { id: string; nombre: string };
type Brand = { id: string; nombre: string };
type BoardTask = {
  id: string; descripcion: string; estado: string; monto: number; moneda: string;
  fecha_limite: string | null; team_member_id: string | null; project_id: string | null;
  proyectoNombre: string | null; miembro: { id: string; nombre: string; whatsapp: string | null } | null;
};

const ESTADOS = [
  { id: "pendiente", label: "Pendiente", color: "var(--muted-foreground)" },
  { id: "en_progreso", label: "En progreso", color: "var(--electric)" },
  { id: "hecha", label: "Hecha", color: "var(--success)" },
];

export function EquipoView({ members, tasks, debts, projects, brands }: {
  members: MemberSaldo[]; tasks: BoardTask[]; debts: MemberSaldo[]; projects: Opt[]; brands: Brand[];
}) {
  const [tab, setTab] = useState<"equipo" | "tareas" | "deudas">("equipo");
  const teamOptions = members.map((m) => ({ id: m.id, nombre: m.nombre }));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5">
          {([["equipo", "Equipo", Users], ["tareas", "Tareas", ListTodo], ["deudas", "¿A quién le debo?", HandCoins]] as const).map(([id, label, Icon]) => (
            <button key={id} onClick={() => setTab(id)} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", tab === id ? "bg-accent" : "text-muted-foreground")}>
              <Icon className="size-4" /> {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {tab === "tareas" ? <NewTaskDialog members={teamOptions} projects={projects} /> : <NewMemberDialog brands={brands} />}
        </div>
      </div>

      {tab === "equipo" && (
        members.length === 0 ? <Empty text="Aún no hay personas en el equipo." /> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => (
              <Link key={m.id} href={`/equipo/${m.id}`} className="rounded-xl border border-border bg-card p-4 transition-all hover:border-electric/40 hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-xs font-semibold text-white">
                    {(m.nombre.trim()[0] ?? "?").toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate font-medium">{m.nombre}</p>
                      {!m.activo && <Badge>Inactivo</Badge>}
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{m.rol_especialidad ?? "—"}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Saldo</span>
                  <span className={cn("font-semibold", m.saldo > 0 ? "text-destructive" : "text-success")}>{money(m.saldo, "DOP")}</span>
                </div>
              </Link>
            ))}
          </div>
        )
      )}

      {tab === "tareas" && <TaskList tasks={tasks} />}

      {tab === "deudas" && (
        debts.length === 0 ? <Empty text="No le debes a nadie ahora. 🎉" /> : (
          <div className="space-y-2">
            {debts.map((m) => {
              const wa = (m.whatsapp ?? m.telefono ?? "").replace(/\D/g, "");
              return (
                <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                  <Link href={`/equipo/${m.id}`} className="font-medium hover:text-electric">{m.nombre}</Link>
                  <span className="text-xs text-muted-foreground">pagado {money(m.pagado, "DOP")} de {money(m.acordado, "DOP")}</span>
                  <span className="ml-auto font-semibold text-destructive">Debes {money(m.saldo, "DOP")}</span>
                  {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola ${m.nombre}, coordinemos tu pago de ${money(m.saldo, "DOP")}.`)}`} target="_blank" rel="noopener noreferrer" className="text-success"><MessageCircle className="size-4" /></a>}
                </div>
              );
            })}
          </div>
        )
      )}
    </div>
  );
}

function TaskList({ tasks }: { tasks: BoardTask[] }) {
  const router = useRouter();
  const [fEstado, setFEstado] = useState("");
  const [, start] = useTransition();
  const filtered = tasks.filter((t) => !fEstado || t.estado === fEstado);

  return (
    <div className="space-y-3">
      <Select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="h-9 w-auto">
        <option value="">Todos los estados</option>
        {ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
      </Select>
      {filtered.length === 0 ? <Empty text="Sin tareas." /> : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const wa = (t.miembro?.whatsapp ?? "").replace(/\D/g, "");
            return (
              <div key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{t.descripcion}</p>
                  <p className="text-xs text-muted-foreground">
                    {t.miembro?.nombre ?? "Sin asignar"}{t.proyectoNombre ? ` · ${t.proyectoNombre}` : ""}{t.fecha_limite ? ` · límite ${fechaCorta(t.fecha_limite)}` : ""}
                  </p>
                </div>
                <Badge>{money(t.monto, t.moneda)}</Badge>
                <Select defaultValue={t.estado} className="h-8 w-32"
                  onChange={(e) => start(async () => { await updateTaskStage(t.id, e.target.value as "pendiente" | "en_progreso" | "hecha", t.team_member_id); router.refresh(); })}>
                  {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </Select>
                {wa && <a href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola ${t.miembro?.nombre ?? ""} 👋, nueva tarea: ${t.descripcion}`)}`} target="_blank" rel="noopener noreferrer" title="Enviar tarea por WhatsApp" className="text-success"><MessageCircle className="size-4" /></a>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">{text}</div>;
}

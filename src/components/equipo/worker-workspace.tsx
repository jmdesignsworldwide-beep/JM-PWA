"use client";

import { EMPRESA } from "@/lib/empresa";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ListTodo, HandCoins } from "lucide-react";
import type { Task, TeamPayment } from "@/lib/data/equipo";
import { workerUpdateTaskEstado } from "@/app/(app)/equipo/actions";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { money, fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";

type Totals = { acordado: number; pagado: number; saldo: number };
const ESTADOS = [{ id: "pendiente", label: "Pendiente" }, { id: "en_progreso", label: "En progreso" }, { id: "hecha", label: "Hecha" }];

export function WorkerWorkspace({ nombre, tasks, payments, totals }: {
  nombre: string; tasks: Task[]; payments: TeamPayment[]; totals: Totals;
}) {
  const router = useRouter();
  const [, start] = useTransition();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
        <Logo size={30} />
        <div className="leading-tight">
          <p className="text-sm font-semibold">Mi trabajo</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{EMPRESA.nombre}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <ThemeToggle />
          <Button variant="ghost" size="icon" onClick={signOut} aria-label="Cerrar sesión"><LogOut className="size-4" /></Button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 pb-bottomnav sm:px-6 sm:pb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Hola, {nombre} 👋</h1>

        {/* Mis pagos (solo lo mío) */}
        <section id="pagos" className="scroll-mt-20 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><HandCoins className="size-4 text-success" /> Mis pagos</h2>
          <div className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Ganado (hecho)" value={money(totals.acordado, "DOP")} />
            <Stat label="Pagado" value={money(totals.pagado, "DOP")} />
            <Stat label="Me deben" value={money(totals.saldo, "DOP")} highlight={totals.saldo > 0} />
          </div>
          {payments.length > 0 && (
            <ul className="mt-4 space-y-2">
              {payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
                  <span>{fechaCorta(p.fecha)}{p.metodo ? ` · ${p.metodo}` : ""}</span>
                  <span className="font-medium text-success">{money(p.monto, p.moneda)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Mis tareas */}
        <section id="tareas" className="scroll-mt-20 rounded-xl border border-border bg-card p-5">
          <h2 className="mb-3 flex items-center gap-2 font-semibold"><ListTodo className="size-4 text-electric" /> Mis tareas</h2>
          {tasks.length === 0 ? <p className="py-4 text-center text-sm text-muted-foreground">No tienes tareas asignadas.</p> : (
            <ul className="space-y-2">
              {tasks.map((t) => (
                <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{t.descripcion}</p>
                    <p className="text-xs text-muted-foreground">{t.fecha_limite ? `Límite ${fechaCorta(t.fecha_limite)}` : "Sin fecha"}</p>
                  </div>
                  <Badge>{money(t.monto, t.moneda)}</Badge>
                  <Select defaultValue={t.estado} className="h-10 w-36"
                    onChange={(e) => start(async () => { await workerUpdateTaskEstado(t.id, e.target.value as "pendiente" | "en_progreso" | "hecha"); router.refresh(); })}>
                    {ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                  </Select>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      {/* Navegación inferior (móvil) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-safe backdrop-blur-xl sm:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          <a href="#tareas" className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground active:text-electric">
            <ListTodo className="size-[22px]" /> <span>Tareas</span>
          </a>
          <a href="#pagos" className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground active:text-success">
            <HandCoins className="size-[22px]" /> <span>Pagos</span>
          </a>
          <button onClick={signOut} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground active:text-destructive">
            <LogOut className="size-[22px]" /> <span>Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("rounded-lg border border-border p-2.5", highlight && "border-success/40 bg-success/10")}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={cn("text-sm font-semibold", highlight && "text-success")}>{value}</p>
    </div>
  );
}

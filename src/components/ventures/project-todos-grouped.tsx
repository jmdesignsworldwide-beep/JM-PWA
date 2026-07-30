"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, ListTodo } from "lucide-react";
import { toggleTodo } from "@/app/(app)/pendientes/actions";
import type { Todo } from "@/lib/data/todos";
import { cn } from "@/lib/utils";

type Grupo = { id: string; nombre: string; todos: Todo[] };

/** Pendientes de todos los proyectos, agrupados por proyecto (vista "todos juntos"). */
export function ProjectTodosGrouped({ grupos }: { grupos: Grupo[] }) {
  const conPendientes = grupos.filter((g) => g.todos.length > 0);
  if (conPendientes.length === 0) return null;

  const total = conPendientes.reduce((s, g) => s + g.todos.length, 0);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <ListTodo className="size-4 text-electric" /> Pendientes por proyecto
        <span className="text-xs font-normal text-muted-foreground">· {total}</span>
      </h3>
      <div className="space-y-3">
        {conPendientes.map((g) => (
          <div key={g.id}>
            <Link href={`/proyectos/${g.id}`} className="flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
              {g.nombre} <ChevronRight className="size-3" />
            </Link>
            <ul className="mt-1 space-y-0.5">
              {g.todos.map((t) => <Row key={t.id} t={t} />)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ t }: { t: Todo }) {
  const router = useRouter();
  const [hecho, setHecho] = useState(t.hecho);
  const [, start] = useTransition();
  function toggle() {
    const next = !hecho;
    setHecho(next);
    start(async () => { await toggleTodo(t.id, next); router.refresh(); });
  }
  return (
    <li className="flex items-center gap-2.5 rounded-md px-1 py-1 text-sm">
      <button type="button" onClick={toggle} aria-label={hecho ? "Marcar pendiente" : "Marcar hecho"}
        className={cn("flex size-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          hecho ? "border-transparent bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-white" : "border-muted-foreground/40 hover:border-electric")}>
        {hecho && <Check className="size-2.5" strokeWidth={3} />}
      </button>
      <span className={cn("min-w-0 flex-1 break-words", hecho && "text-muted-foreground line-through")}>{t.texto}</span>
    </li>
  );
}

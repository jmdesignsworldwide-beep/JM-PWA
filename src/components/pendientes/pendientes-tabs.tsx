"use client";

import { useState } from "react";
import { ListTodo, Rocket } from "lucide-react";
import type { Todo } from "@/lib/data/todos";
import type { Venture } from "@/lib/data/ventures";
import { TodosList } from "./todos-list";
import { VenturesList } from "@/components/ventures/ventures-list";
import { cn } from "@/lib/utils";

type VentureCard = Venture & { logoUrl: string | null; pendientes: number };

/** Dos partes de "Mis pendientes": lista personal + Mis Proyectos (incubadora). */
export function PendientesTabs({ todos, ventures }: { todos: Todo[]; ventures: VentureCard[] }) {
  const [tab, setTab] = useState<"personal" | "proyectos">("personal");

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="grid grid-cols-2 gap-2 rounded-xl border border-border bg-background/40 p-1">
        {([["personal", "Pendientes personales", ListTodo], ["proyectos", "Mis proyectos", Rocket]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => setTab(id)}
            className={cn("flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              tab === id ? "bg-electric/15 text-electric" : "text-muted-foreground hover:bg-accent/40")}>
            <Icon className="size-4" /> {label}
            {id === "proyectos" && ventures.length > 0 && <span className="text-xs text-muted-foreground">· {ventures.length}</span>}
          </button>
        ))}
      </div>

      {tab === "personal" ? (
        <div className="rounded-xl border border-border bg-card p-5">
          <TodosList initial={todos} />
        </div>
      ) : (
        <VenturesList ventures={ventures} />
      )}
    </div>
  );
}

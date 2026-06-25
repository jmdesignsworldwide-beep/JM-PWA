import Link from "next/link";
import { ListTodo, ArrowUpRight } from "lucide-react";
import { TodosList } from "./todos-list";
import type { Todo } from "@/lib/data/todos";

/** Widget de "Mis pendientes" para el Dashboard (misma lista que la página). */
export function PendientesWidget({ todos }: { todos: Todo[] }) {
  return (
    <div className="rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 className="flex items-center gap-2 font-semibold"><ListTodo className="size-4 text-electric" /> Mis pendientes</h2>
        <Link href="/pendientes" className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-electric">
          Ver todos <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <div className="p-4">
        <TodosList initial={todos} />
      </div>
    </div>
  );
}

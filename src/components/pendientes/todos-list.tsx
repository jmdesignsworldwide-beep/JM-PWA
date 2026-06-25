"use client";

import { useMemo, useState, useTransition } from "react";
import { Plus, Check, Trash2, Loader2 } from "lucide-react";
import { addTodo, toggleTodo, deleteTodo } from "@/app/(app)/pendientes/actions";
import type { Todo } from "@/lib/data/todos";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Lista personal de pendientes (Mis pendientes). Misma data en el widget del
 * Dashboard y en la página propia. Actualización optimista para sentirse rápido.
 */
export function TodosList({ initial, emptyText = "Sin pendientes. ¡Todo limpio! ☕" }: { initial: Todo[]; emptyText?: string }) {
  const [todos, setTodos] = useState<Todo[]>(initial);
  const [text, setText] = useState("");
  const [, startTransition] = useTransition();

  const { pendientes, hechos } = useMemo(() => ({
    pendientes: todos.filter((t) => !t.hecho),
    hechos: todos.filter((t) => t.hecho),
  }), [todos]);

  function add(e: React.FormEvent) {
    e.preventDefault();
    const t = text.trim();
    if (!t) return;
    setText("");
    startTransition(async () => {
      const res = await addTodo(t);
      if (res?.todo) setTodos((prev) => [res.todo as Todo, ...prev]);
    });
  }

  function toggle(id: string, hecho: boolean) {
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, hecho } : t)));
    startTransition(async () => { await toggleTodo(id, hecho); });
  }

  function remove(id: string) {
    setTodos((prev) => prev.filter((t) => t.id !== id));
    startTransition(async () => { await deleteTodo(id); });
  }

  return (
    <div className="space-y-3">
      <form onSubmit={add} className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Escribe un pendiente y dale +"
          className="h-10 flex-1 rounded-lg border border-border bg-background/50 px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        <Button type="submit" variant="gradient" size="icon" className="size-10 shrink-0" aria-label="Agregar"><Plus className="size-4" /></Button>
      </form>

      {todos.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="space-y-1">
          {pendientes.map((t) => <Item key={t.id} t={t} onToggle={toggle} onRemove={remove} />)}
          {hechos.length > 0 && pendientes.length > 0 && <li className="my-1.5 border-t border-border/60" />}
          {hechos.map((t) => <Item key={t.id} t={t} onToggle={toggle} onRemove={remove} />)}
        </ul>
      )}
    </div>
  );
}

function Item({ t, onToggle, onRemove }: { t: Todo; onToggle: (id: string, hecho: boolean) => void; onRemove: (id: string) => void }) {
  const [removing, setRemoving] = useState(false);
  return (
    <li className="group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-accent/40">
      <button
        type="button"
        onClick={() => onToggle(t.id, !t.hecho)}
        aria-label={t.hecho ? "Marcar pendiente" : "Marcar hecho"}
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
          t.hecho ? "border-transparent bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-white" : "border-muted-foreground/40 hover:border-electric",
        )}
      >
        {t.hecho && <Check className="size-3" strokeWidth={3} />}
      </button>
      <span className={cn("min-w-0 flex-1 break-words text-sm", t.hecho && "text-muted-foreground line-through")}>{t.texto}</span>
      <button
        type="button"
        onClick={() => { setRemoving(true); onRemove(t.id); }}
        aria-label="Borrar"
        className="shrink-0 text-muted-foreground/0 transition-colors hover:text-destructive group-hover:text-muted-foreground"
      >
        {removing ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </button>
    </li>
  );
}

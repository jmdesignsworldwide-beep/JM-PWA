"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Check, Search, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string };

/**
 * Dropdown con búsqueda (type-to-search). Envía el valor por un input oculto
 * (name) para forms. Si recibe `onCreate`, permite crear una opción nueva
 * escribiendo su nombre ("+ Agregar …") sin salir del formulario.
 */
export function Combobox({
  name,
  options,
  defaultValue = "",
  value: controlledValue,
  placeholder = "Seleccionar…",
  onChange,
  onCreate,
  createLabel = "Agregar",
}: {
  name?: string;
  options: ComboOption[];
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
  /** Crea una opción nueva a partir del texto; devuelve la opción o null. */
  onCreate?: (label: string) => Promise<ComboOption | null>;
  createLabel?: string;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internal;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [extra, setExtra] = useState<ComboOption[]>([]);
  const [creating, setCreating] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const all = useMemo(() => [...options, ...extra], [options, extra]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.stopPropagation(); setOpen(false); }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  function choose(v: string) {
    setInternal(v);
    setOpen(false);
    setQ("");
    onChange?.(v);
  }

  async function crear() {
    if (!onCreate) return;
    const label = q.trim();
    if (!label) return;
    setCreating(true);
    try {
      const opt = await onCreate(label);
      if (opt) { setExtra((prev) => [...prev, opt]); choose(opt.value); }
    } finally {
      setCreating(false);
    }
  }

  const selected = all.find((o) => o.value === value) ?? null;
  const term = q.trim().toLowerCase();
  const filtered = useMemo(
    () => (term ? all.filter((o) => o.label.toLowerCase().includes(term)) : all),
    [term, all],
  );
  const exactMatch = all.some((o) => o.label.toLowerCase() === term);
  const showCreate = !!onCreate && term.length > 0 && !exactMatch;

  return (
    <div ref={boxRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 w-full items-center justify-between rounded-lg border border-input bg-background/60 px-3.5 text-left text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className={cn("truncate", !selected && "text-muted-foreground")}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-xl">
          <div className="relative border-b border-border">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={onCreate ? "Buscar o escribir nuevo…" : "Buscar…"}
              className="h-9 w-full bg-transparent pl-9 pr-3 text-base focus-visible:outline-none sm:text-sm"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {showCreate && (
              <button type="button" onClick={crear} disabled={creating}
                className="flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left text-sm font-medium text-electric transition-colors hover:bg-accent">
                {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
                {createLabel} “{q.trim()}”
              </button>
            )}
            {selected && (
              <button type="button" onClick={() => choose("")}
                className="w-full rounded-md px-3 py-2 text-left text-xs text-muted-foreground hover:bg-accent">
                — Limpiar selección —
              </button>
            )}
            {filtered.length === 0 && !showCreate && <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados</p>}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => choose(o.value)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left text-sm transition-colors hover:bg-accent"
              >
                {o.label}
                {value === o.value && <Check className="size-4 text-electric" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useRef, useState } from "react";
import { ChevronsUpDown, Check, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type ComboOption = { value: string; label: string };

/**
 * Dropdown con búsqueda (type-to-search). Muestra todas las opciones, deja
 * filtrar escribiendo, y envía el valor por un input oculto (name) para forms.
 */
export function Combobox({
  name,
  options,
  defaultValue = "",
  value: controlledValue,
  placeholder = "Seleccionar…",
  onChange,
}: {
  name?: string;
  options: ComboOption[];
  defaultValue?: string;
  value?: string;
  placeholder?: string;
  onChange?: (value: string) => void;
}) {
  const [internal, setInternal] = useState(defaultValue);
  const value = controlledValue !== undefined ? controlledValue : internal;
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const boxRef = useRef<HTMLDivElement>(null);

  function choose(v: string) {
    setInternal(v);
    setOpen(false);
    setQ("");
    onChange?.(v);
  }

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    return t ? options.filter((o) => o.label.toLowerCase().includes(t)) : options;
  }, [q, options]);

  return (
    <div ref={boxRef} className="relative">
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
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
              placeholder="Buscar…"
              className="h-9 w-full bg-transparent pl-9 pr-3 text-sm focus-visible:outline-none"
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {selected && (
              <button type="button" onMouseDown={() => choose("")}
                className="w-full rounded-md px-3 py-1.5 text-left text-xs text-muted-foreground hover:bg-accent">
                — Limpiar selección —
              </button>
            )}
            {filtered.length === 0 && <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin resultados</p>}
            {filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                onMouseDown={() => choose(o.value)}
                className="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-accent"
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

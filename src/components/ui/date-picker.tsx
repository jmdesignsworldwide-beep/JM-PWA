"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const MESES_CORTO = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const DIAS = ["L", "M", "M", "J", "V", "S", "D"];

const pad = (n: number) => String(n).padStart(2, "0");
const toIso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
/** Parsea 'YYYY-MM-DD' a Date local (mediodía, sin saltos de zona horaria). */
function fromIso(s: string | undefined): Date | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

/**
 * Selector de fecha con mini-calendario visual (premium, móvil y escritorio).
 * Funciona controlado (value/onChange) o en formularios con FormData (name +
 * defaultValue): en ese caso emite un input oculto con el valor elegido.
 */
export function DatePicker({
  value, defaultValue, onChange, name, placeholder = "Elegir fecha", className, required, min, max, id,
}: {
  value?: string;
  defaultValue?: string;
  onChange?: (iso: string) => void;
  name?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  min?: string;
  max?: string;
  id?: string;
}) {
  const controlled = value !== undefined;
  const [internal, setInternal] = useState(defaultValue ?? "");
  const current = controlled ? (value ?? "") : internal;

  const [open, setOpen] = useState(false);
  const selected = fromIso(current);
  const [view, setView] = useState(() => selected ?? new Date());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function pick(d: Date) {
    const iso = toIso(d);
    if (!controlled) setInternal(iso);
    onChange?.(iso);
    setOpen(false);
  }

  function openCal() {
    setView(selected ?? new Date());
    setOpen((o) => !o);
  }

  const y = view.getFullYear();
  const m = view.getMonth();
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // lunes = 0
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const today = toIso(new Date());
  const minD = fromIso(min);
  const maxD = fromIso(max);

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const label = selected ? `${selected.getDate()} ${MESES_CORTO[selected.getMonth()]} ${selected.getFullYear()}` : "";

  return (
    <div ref={ref} className={cn("relative", className)}>
      {name && <input type="hidden" name={name} value={current} required={required} />}
      <button
        type="button" id={id} onClick={openCal}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-lg border border-border bg-background/50 px-3 text-left text-sm transition-colors hover:border-electric/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !label && "text-muted-foreground",
        )}
      >
        <CalIcon className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 truncate">{label || placeholder}</span>
      </button>

      {open && (
        <div className="absolute left-0 z-50 mt-2 w-[17.5rem] max-w-[calc(100vw-2rem)] rounded-xl border border-border bg-card p-3 shadow-xl">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => setView(new Date(y, m - 1, 1))} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50" aria-label="Mes anterior"><ChevronLeft className="size-4" /></button>
            <span className="text-sm font-medium capitalize">{MESES[m]} {y}</span>
            <button type="button" onClick={() => setView(new Date(y, m + 1, 1))} className="flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent/50" aria-label="Mes siguiente"><ChevronRight className="size-4" /></button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {DIAS.map((d, i) => <span key={i}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const d = new Date(y, m, day, 12);
              const iso = toIso(d);
              const isSel = iso === current;
              const isToday = iso === today;
              const disabled = (minD && d < minD) || (maxD && d > maxD);
              return (
                <button
                  key={i} type="button" disabled={!!disabled} onClick={() => pick(d)}
                  className={cn(
                    "flex size-8 items-center justify-center rounded-md text-sm transition-colors",
                    isSel ? "bg-electric font-semibold text-white" : "hover:bg-accent/60",
                    !isSel && isToday && "border border-electric/50 text-electric",
                    disabled && "cursor-not-allowed opacity-30 hover:bg-transparent",
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-2 border-t border-border pt-2">
            <button type="button" onClick={() => pick(new Date())} className="text-xs text-electric hover:underline">Hoy</button>
          </div>
        </div>
      )}
    </div>
  );
}

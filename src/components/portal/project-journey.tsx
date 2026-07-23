"use client";

import { EMPRESA } from "@/lib/empresa";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Sparkles, Loader2, PartyPopper } from "lucide-react";
import type { Row } from "@/lib/database.types";
import { CICLO_VIDA } from "@/lib/ventas";
import { CountUp } from "@/components/animations/count-up";
import { Confetti } from "./confetti";
import { fechaCorta } from "@/lib/format";
import { cn } from "@/lib/utils";

type Milestone = Row<"project_milestones">;

export function ProjectJourney({
  milestones, progreso, step, celebrateId,
}: { milestones: Milestone[]; progreso: number; step: number; celebrateId: string | null }) {
  const reduce = useReducedMotion();
  const hasMilestones = milestones.length > 0;
  const allDone = hasMilestones && milestones.every((m) => m.completado);
  // El paso "actual" es el primer hito no completado.
  const currentIdx = hasMilestones ? milestones.findIndex((m) => !m.completado) : -1;

  return (
    <section className="relative overflow-hidden rounded-2xl border border-border bg-card p-6 sm:p-8">
      {/* glow de fondo */}
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--brand-purple)_22%,transparent),transparent_70%)] blur-2xl" />
      {celebrateId && <Confetti />}

      <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
        <ProgressRing value={progreso} />
        <div className="flex-1 text-center sm:text-left">
          <h2 className="flex items-center justify-center gap-2 text-lg font-semibold sm:justify-start">
            <Sparkles className="size-5 text-electric" /> Tu proyecto en marcha
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {allDone
              ? `¡Todo listo! Tu proyecto está completo. Gracias por confiar en ${EMPRESA.nombre}. 💜`
              : "Así avanza tu proyecto, paso a paso. Te mantenemos al tanto en todo momento."}
          </p>
          {celebrateId && !allDone && (
            <motion.p
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <PartyPopper className="size-3.5" /> ¡Acabamos de completar un avance!
            </motion.p>
          )}
        </div>
      </div>

      {/* Línea de tiempo */}
      <div className="relative mt-8">
        {hasMilestones ? (
          <ol className="space-y-1">
            {milestones.map((m, i) => {
              const active = i === currentIdx;
              return (
                <li key={m.id} className="relative flex gap-4 pb-6 last:pb-0">
                  {/* conector */}
                  {i < milestones.length - 1 && (
                    <span aria-hidden className={cn("absolute left-[15px] top-8 h-full w-0.5", m.completado ? "bg-success/50" : "bg-border")} />
                  )}
                  <Node completado={m.completado} active={active} celebrate={m.id === celebrateId} index={i} reduce={!!reduce} />
                  <div className={cn("pt-1", !m.completado && !active && "opacity-55")}>
                    <p className={cn("font-medium leading-tight", active && "text-electric")}>{m.nombre}</p>
                    {m.descripcion && <p className="mt-0.5 text-sm text-muted-foreground">{m.descripcion}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {m.completado ? `Completado${m.completado_en ? ` · ${fechaCorta(m.completado_en)}` : ""}` : active ? "En proceso ahora" : m.fecha ? fechaCorta(m.fecha) : "Próximamente"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          // Sin hitos aún: muestra las etapas del ciclo de vida.
          <ol className="space-y-1">
            {CICLO_VIDA.map((paso, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li key={paso} className="relative flex gap-4 pb-6 last:pb-0">
                  {i < CICLO_VIDA.length - 1 && (
                    <span aria-hidden className={cn("absolute left-[15px] top-8 h-full w-0.5", done ? "bg-success/50" : "bg-border")} />
                  )}
                  <Node completado={done} active={active} celebrate={false} index={i} reduce={!!reduce} />
                  <div className={cn("pt-1.5", !done && !active && "opacity-55")}>
                    <p className={cn("font-medium leading-tight", active && "text-electric")}>{paso}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{done ? "Listo" : active ? "En proceso ahora" : "Próximamente"}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}

function Node({ completado, active, celebrate, index, reduce }: {
  completado: boolean; active: boolean; celebrate: boolean; index: number; reduce: boolean;
}) {
  return (
    <motion.div
      initial={reduce ? false : { scale: 0.5, opacity: 0 }}
      animate={{ scale: celebrate ? [1, 1.25, 1] : 1, opacity: 1 }}
      transition={{ delay: reduce ? 0 : index * 0.06, type: "spring", stiffness: 300, damping: 18 }}
      className={cn(
        "relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
        completado ? "bg-success text-white" : active ? "bg-primary text-primary-foreground" : "border border-border bg-secondary text-muted-foreground",
        active && "ring-4 ring-[color-mix(in_srgb,var(--primary)_25%,transparent)]",
      )}
    >
      {completado ? <Check className="size-4" /> : active ? <Loader2 className="size-4 animate-spin" /> : index + 1}
      {active && !reduce && (
        <motion.span
          aria-hidden
          className="absolute inset-0 rounded-full bg-primary/40"
          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      )}
    </motion.div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const reduce = useReducedMotion();
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div className="relative size-32 shrink-0">
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="var(--secondary)" strokeWidth="10" />
        <defs>
          <linearGradient id="journeyGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--electric)" />
            <stop offset="100%" stopColor="var(--brand-purple)" />
          </linearGradient>
        </defs>
        <motion.circle
          cx="60" cy="60" r={r} fill="none" stroke="url(#journeyGrad)" strokeWidth="10" strokeLinecap="round"
          strokeDasharray={c}
          initial={reduce ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * pct) / 100 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-gradient"><CountUp value={pct} suffix="%" /></span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">completado</span>
      </div>
    </div>
  );
}

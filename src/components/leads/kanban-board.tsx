"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { GripVertical, MessageCircle } from "lucide-react";
import { ETAPAS, type EtapaVenta } from "@/lib/ventas";
import type { Client } from "@/lib/data/clients";
import { updateLeadStage } from "@/app/(app)/leads/actions";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = { leads: Client[]; brandMap: Record<string, string> };

function diasEnEtapa(updatedAt: string) {
  const ms = Date.now() - new Date(updatedAt).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

export function KanbanBoard({ leads, brandMap }: Props) {
  const [items, setItems] = useState<Client[]>(leads);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overEtapa, setOverEtapa] = useState<EtapaVenta | null>(null);
  const [, startTransition] = useTransition();

  const grouped = useMemo(() => {
    const g: Record<string, Client[]> = {};
    for (const e of ETAPAS) g[e.id] = [];
    for (const l of items) (g[l.etapa_venta] ??= []).push(l);
    return g;
  }, [items]);

  function onDrop(etapa: EtapaVenta) {
    setOverEtapa(null);
    const id = dragId;
    setDragId(null);
    if (!id) return;
    const lead = items.find((l) => l.id === id);
    if (!lead || lead.etapa_venta === etapa) return;

    // Optimista: mueve y sella updated_at para recalcular "días en etapa".
    setItems((prev) =>
      prev.map((l) =>
        l.id === id ? { ...l, etapa_venta: etapa, updated_at: new Date().toISOString() } : l,
      ),
    );
    startTransition(async () => {
      await updateLeadStage(id, etapa);
    });
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {ETAPAS.map((etapa) => {
        const list = grouped[etapa.id] ?? [];
        return (
          <div
            key={etapa.id}
            onDragOver={(e) => {
              e.preventDefault();
              setOverEtapa(etapa.id);
            }}
            onDragLeave={() => setOverEtapa((cur) => (cur === etapa.id ? null : cur))}
            onDrop={() => onDrop(etapa.id)}
            className={cn(
              "flex w-72 shrink-0 flex-col rounded-xl border border-border bg-card/40 transition-colors",
              overEtapa === etapa.id && "border-electric/60 bg-accent/40",
            )}
          >
            <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: etapa.color }} />
                <span className="text-sm font-medium">{etapa.label}</span>
              </div>
              <Badge>{list.length}</Badge>
            </div>

            <div className="flex flex-1 flex-col gap-2 p-2">
              <AnimatePresence initial={false}>
                {list.map((lead) => (
                  <motion.div
                    key={lead.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    draggable
                    onDragStart={() => setDragId(lead.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      "group cursor-grab rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing",
                      dragId === lead.id && "opacity-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        href={`/clientes/${lead.id}`}
                        className="font-medium leading-tight hover:text-electric"
                      >
                        {lead.nombre} {lead.apellido ?? ""}
                      </Link>
                      <GripVertical className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                    </div>

                    {lead.lo_que_quiere && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        {lead.lo_que_quiere}
                      </p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {lead.valor_estimado != null && (
                        <Badge className="border-electric/40 text-electric">
                          {money(lead.valor_estimado, lead.valor_estimado_moneda)}
                        </Badge>
                      )}
                      {lead.brand_id && brandMap[lead.brand_id] && (
                        <Badge dot={etapa.color}>{brandMap[lead.brand_id]}</Badge>
                      )}
                      {lead.industria && <Badge>{lead.industria}</Badge>}
                    </div>

                    <div className="mt-2.5 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>{diasEnEtapa(lead.updated_at)} d en etapa</span>
                      {(lead.whatsapp || lead.telefono) && (
                        <a
                          href={`https://wa.me/${(lead.whatsapp || lead.telefono || "").replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1 text-success hover:underline"
                        >
                          <MessageCircle className="size-3.5" /> WhatsApp
                        </a>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {list.length === 0 && (
                <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">
                  Arrastra aquí
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

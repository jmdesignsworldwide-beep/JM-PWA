"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { History, Plus, FileText } from "lucide-react";
import type { Client } from "@/lib/data/clients";
import { Button } from "@/components/ui/button";
import { ClientEditForm } from "./client-edit-form";
import { Badge } from "@/components/ui/badge";
import { money, fechaCorta, fechaHora } from "@/lib/format";
import { cn } from "@/lib/utils";

type Brand = { id: string; nombre: string };

type Stats = {
  orders: { id: string; estado: string; total: number; moneda: string; fecha: string }[];
  contracts: { id: string; estado: string; fecha_aprobacion: string | null }[];
  invoices: { id: string; estado_pago: string; total: number; moneda: string; fecha: string }[];
  projects: { id: string; nombre: string | null; estado: string; fecha_entrega: string | null }[];
  payments: { id: string; monto: number; moneda: string; fecha: string }[];
};

type Activity = { id: string; accion: string; tabla: string; fecha: string }[];

const TABS = [
  "Resumen",
  "Pedidos",
  "Contratos",
  "Facturas",
  "Proyectos",
  "Pagos",
  "Documentos",
  "Actividad",
] as const;
type Tab = (typeof TABS)[number];

export function ClientDetail({
  client,
  brands,
  stats,
  activity,
}: {
  client: Client;
  brands: Brand[];
  stats: Stats;
  activity: Activity;
}) {
  const [tab, setTab] = useState<Tab>("Resumen");

  const counts: Partial<Record<Tab, number>> = {
    Pedidos: stats.orders.length,
    Contratos: stats.contracts.length,
    Facturas: stats.invoices.length,
    Proyectos: stats.projects.length,
    Pagos: stats.payments.length,
  };

  return (
    <div className="rounded-xl border border-border bg-card">
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-border px-2">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "relative whitespace-nowrap px-3 py-3 text-sm font-medium transition-colors",
              tab === t ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <span className="flex items-center gap-1.5">
              {t}
              {counts[t] !== undefined && counts[t]! > 0 && (
                <span className="rounded-full bg-secondary px-1.5 text-[10px]">{counts[t]}</span>
              )}
            </span>
            {tab === t && (
              <motion.span
                layoutId="client-tab"
                className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))]"
              />
            )}
          </button>
        ))}
      </div>

      <div className="p-5">
        {tab === "Resumen" && <ClientEditForm client={client} brands={brands} />}

        {tab === "Pedidos" && (
          <div className="space-y-3">
            <div className="flex justify-end">
              <Link href={`/pedidos/nuevo?cliente=${client.id}`}>
                <Button variant="gradient" size="sm"><Plus className="size-4" /> Nuevo pedido</Button>
              </Link>
            </div>
            {stats.orders.length === 0 ? (
              <EmptyPhase phase="" text="Aún no hay pedidos. Crea el primero — el contrato y la factura saldrán de él." />
            ) : (
              <ul className="space-y-2">
                {stats.orders.map((o) => (
                  <li key={o.id}>
                    <Link
                      href={`/pedidos/${o.id}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors hover:bg-accent/40"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="size-4 text-electric" />
                        <div>
                          <p className="font-medium capitalize">Pedido · {o.estado}</p>
                          <p className="text-xs text-muted-foreground">{fechaCorta(o.fecha)}</p>
                        </div>
                      </div>
                      <Badge>{money(o.total, o.moneda)}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === "Contratos" && (
          <Section
            empty={stats.contracts.length === 0}
            phase="Fase 4"
            rows={stats.contracts.map((c) => ({
              id: c.id,
              left: `Contrato · ${c.estado}`,
              right: c.fecha_aprobacion ? "Firmado" : "—",
              sub: fechaCorta(c.fecha_aprobacion),
            }))}
          />
        )}

        {tab === "Facturas" && (
          <Section
            empty={stats.invoices.length === 0}
            phase="Fase 4"
            rows={stats.invoices.map((i) => ({
              id: i.id,
              left: `Factura · ${i.estado_pago}`,
              right: money(i.total, i.moneda),
              sub: fechaCorta(i.fecha),
            }))}
          />
        )}

        {tab === "Proyectos" && (
          <Section
            empty={stats.projects.length === 0}
            phase="Fase 4"
            rows={stats.projects.map((p) => ({
              id: p.id,
              left: p.nombre ?? "Proyecto",
              right: p.estado,
              sub: `Entrega: ${fechaCorta(p.fecha_entrega)}`,
            }))}
          />
        )}

        {tab === "Pagos" && (
          <Section
            empty={stats.payments.length === 0}
            phase="Fase 5"
            rows={stats.payments.map((p) => ({
              id: p.id,
              left: "Pago",
              right: money(p.monto, p.moneda),
              sub: fechaCorta(p.fecha),
            }))}
          />
        )}

        {tab === "Documentos" && (
          <EmptyPhase phase="Fase 7" text="La bóveda de documentos del cliente se construye más adelante." />
        )}

        {tab === "Actividad" && (
          <div>
            {activity.length === 0 ? (
              <EmptyPhase phase="" text="Aún no hay actividad registrada para este cliente." />
            ) : (
              <ul className="space-y-2">
                {activity.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                    <History className="size-4 text-muted-foreground" />
                    <span className="font-medium">{accionLabel(a.accion)}</span>
                    <span className="text-muted-foreground">en {a.tabla}</span>
                    <span className="ml-auto text-xs text-muted-foreground">{fechaHora(a.fecha)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Section({
  empty,
  phase,
  rows,
}: {
  empty: boolean;
  phase: string;
  rows: { id: string; left: string; right: string; sub: string }[];
}) {
  if (empty) return <EmptyPhase phase={phase} text="Se llena automáticamente con el flujo de la fuente única." />;
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
          <div>
            <p className="font-medium capitalize">{r.left}</p>
            <p className="text-xs text-muted-foreground">{r.sub}</p>
          </div>
          <Badge>{r.right}</Badge>
        </li>
      ))}
    </ul>
  );
}

function EmptyPhase({ phase, text }: { phase: string; text: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
      <p className="text-sm text-muted-foreground">{text}</p>
      {phase && <p className="mt-1 text-xs text-muted-foreground">Disponible en {phase}.</p>}
    </div>
  );
}

function accionLabel(a: string) {
  if (a === "INSERT") return "Creado";
  if (a === "UPDATE") return "Actualizado";
  if (a === "DELETE") return "Eliminado";
  return a;
}

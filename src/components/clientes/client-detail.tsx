"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { History, Plus, FileText } from "lucide-react";
import type { Client } from "@/lib/data/clients";
import { Button } from "@/components/ui/button";
import { ClientEditForm } from "./client-edit-form";
import { DocumentosManager } from "./documentos-manager";
import { ProjectManager } from "./project-manager";
import { PagosManager } from "@/components/pedidos/pagos-manager";
import type { Row } from "@/lib/database.types";
import { Badge } from "@/components/ui/badge";
import { money, fechaCorta, fechaHora } from "@/lib/format";
import { cn } from "@/lib/utils";

type Brand = { id: string; nombre: string };

type Stats = {
  orders: { id: string; estado: string; total: number; moneda: string; fecha: string }[];
  contracts: { id: string; estado: string; fecha_aprobacion: string | null }[];
  invoices: { id: string; estado_pago: string; total: number; moneda: string; fecha: string }[];
  projects: { id: string; nombre: string | null; estado: string; fecha_entrega: string | null }[];
  payments: { id: string; order_id: string; monto: number; moneda: string; fecha: string; tipo: string; metodo: string | null; nota: string | null }[];
};

type Activity = { id: string; accion: string; tabla: string; fecha: string }[];

const TABS = [
  "Resumen",
  "Pedidos",
  "Contratos",
  "Facturas",
  "Proyectos",
  "Pagos",
  "Actividad",
] as const;
type Tab = (typeof TABS)[number];

type Doc = { id: string; file_url: string | null; tipo: string | null; version: number; visible_cliente: boolean; created_at: string };

type ProjectsFull = {
  projects: { id: string; nombre: string | null; estado: string; fecha_inicio: string | null; fecha_entrega: string | null; precio_total: number; moneda: string }[];
  milestones: Row<"project_milestones">[];
  updates: Row<"project_updates">[];
};

export function ClientDetail({
  client,
  brands,
  stats,
  activity,
  files,
  projectsFull,
}: {
  client: Client;
  brands: Brand[];
  stats: Stats;
  activity: Activity;
  files: Doc[];
  projectsFull: ProjectsFull;
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
          <div className="space-y-6">
            <div className="space-y-3">
              {stats.contracts.length === 0 ? (
                <EmptyPhase phase="" text="Aún no hay contratos. Se genera desde el pedido, o sube uno firmado por fuera en Documentos." />
              ) : (
                <ul className="space-y-2">
                  {stats.contracts.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
                      <div>
                        <p className="font-medium capitalize">Contrato · {c.estado}</p>
                        <p className="text-xs text-muted-foreground">{fechaCorta(c.fecha_aprobacion)}</p>
                      </div>
                      <Badge>{c.fecha_aprobacion ? "Firmado" : "—"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            {/* Documentos viven junto al contrato (contratos firmados, briefs, etc.). */}
            <div className="space-y-3 border-t border-border pt-5">
              <h4 className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="size-4 text-electric" /> Documentos
              </h4>
              <p className="text-xs text-muted-foreground">
                Contratos firmados, briefs, brand assets y entregables. Lo que marques como visible aparece en el portal del cliente.
              </p>
              <DocumentosManager clientId={client.id} docs={files} />
            </div>
          </div>
        )}

        {tab === "Facturas" && (
          <Section
            empty={stats.invoices.length === 0}
            phase=""
            rows={stats.invoices.map((i) => ({
              id: i.id,
              left: `Factura · ${i.estado_pago}`,
              right: money(i.total, i.moneda),
              sub: fechaCorta(i.fecha),
            }))}
          />
        )}

        {tab === "Proyectos" && (
          <ProjectManager
            clientId={client.id}
            projects={projectsFull.projects}
            milestones={projectsFull.milestones}
            updates={projectsFull.updates}
          />
        )}

        {tab === "Pagos" && (
          <PagosManager
            clientId={client.id}
            orders={stats.orders}
            payments={stats.payments}
          />
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
  if (empty) return <EmptyPhase phase={phase} text="Aún no hay nada aquí. Se llena solo con el flujo (pedido → contrato → factura)." />;
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

"use client";

import { Target, MessageSquare } from "lucide-react";
import type { Client } from "@/lib/data/clients";
import { ClientEditForm } from "./client-edit-form";

type Brand = { id: string; nombre: string };

/**
 * Ficha LIGERA de prospecto: solo lo relevante a quien aún no compra —
 * contacto, industria/fuente, lo que quiere y notas/conversación. Sin pedidos,
 * contratos, facturas, pagos ni barra de progreso (eso se desbloquea al
 * convertirlo en cliente).
 */
export function ProspectoDetail({ client, brands }: { client: Client; brands: Brand[] }) {
  return (
    <div className="space-y-5">
      {/* Aviso: qué es esta ficha */}
      <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
          <Target className="size-4" />
        </span>
        <div className="text-sm">
          <p className="font-medium">Ficha de prospecto</p>
          <p className="mt-0.5 text-muted-foreground">
            Aún no ha comprado, así que aquí solo va su contacto, de dónde viene y lo que se habla.
            Cuando cierres la venta, <strong className="text-foreground">conviértelo a cliente</strong> y se
            desbloquea todo el flujo (pedido → contrato → factura → pago).
          </p>
        </div>
      </div>

      {/* Resumen rápido: fuente */}
      <div className="grid grid-cols-1 gap-3">
        <ResumenCard icon={<MessageSquare className="size-4" />} label="Fuente" value={client.fuente ?? "—"} />
      </div>

      {/* Datos editables del prospecto (contacto, industria/fuente, notas) */}
      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold">Información y conversación</h3>
        <ClientEditForm client={client} brands={brands} />
      </div>
    </div>
  );
}

function ResumenCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
        <span className="text-electric">{icon}</span> {label}
      </p>
      <p className="mt-1 truncate font-semibold capitalize">{value}</p>
    </div>
  );
}

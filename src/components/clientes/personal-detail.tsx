"use client";

import { User, Briefcase } from "lucide-react";
import type { Client } from "@/lib/data/clients";
import { ClientEditForm } from "./client-edit-form";

type Brand = { id: string; nombre: string };

/**
 * Ficha LIGERA de un contacto Personal (familia, proveedor, alguien a quien le
 * debo/pago). No es cliente ni prospecto de negocio: no tiene pedidos, cobros
 * ni flujo de venta. Perfil: nombre, a qué se dedica, contacto y notas.
 * (Los datos bancarios protegidos por PIN llegan en C4.)
 */
export function PersonalDetail({ client, brands }: { client: Client; brands: Brand[] }) {
  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-electric/25 bg-electric/5 p-4">
        <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-electric/15 text-electric">
          <User className="size-4" />
        </span>
        <div className="text-sm">
          <p className="font-medium">Contacto personal</p>
          <p className="mt-0.5 text-muted-foreground">
            No es cliente ni prospecto de venta. Aquí guardas su perfil y sus notas; sirve para deudas/pagos personales.
          </p>
        </div>
      </div>

      {client.ocupacion && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
            <Briefcase className="size-3.5 text-electric" /> A qué se dedica
          </p>
          <p className="mt-1 font-medium">{client.ocupacion}</p>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 font-semibold">Información y notas</h3>
        <ClientEditForm client={client} brands={brands} />
      </div>

      {/* Datos bancarios protegidos por PIN → C4 */}
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-3 text-xs text-muted-foreground">
        Próximamente: datos bancarios protegidos por PIN para saber dónde pagarle.
      </div>
    </div>
  );
}

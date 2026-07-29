"use client";

import Link from "next/link";
import { Rocket, CheckCircle2, ChevronRight } from "lucide-react";
import type { Venture } from "@/lib/data/ventures";
import { NewVentureDialog } from "./new-venture-dialog";

type VentureCard = Venture & { logoUrl: string | null; pendientes: number };

export function VenturesList({ ventures }: { ventures: VentureCard[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">Tus negocios/proyectos en incubación. Guárdalo todo aquí para cuando llegue el momento de crearlos.</p>
        <NewVentureDialog />
      </div>

      {ventures.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
          <Rocket className="mx-auto mb-3 size-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Aún no tienes proyectos. Crea el primero con <strong>Nuevo negocio/proyecto</strong>.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {ventures.map((v) => (
            <li key={v.id}>
              <Link href={`/proyectos/${v.id}`} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-all hover:border-electric/40 hover:shadow-md active:bg-accent/40">
                <span className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border bg-background/40">
                  {v.logoUrl
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={v.logoUrl} alt={v.nombre} className="size-full object-cover" />
                    : <Rocket className="size-5 text-muted-foreground" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-medium">{v.nombre}</span>
                    {v.registrado && <CheckCircle2 className="size-3.5 shrink-0 text-success" aria-label="Registrado" />}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.descripcion || "Sin descripción"}{v.pendientes > 0 ? ` · ${v.pendientes} pendiente${v.pendientes === 1 ? "" : "s"}` : ""}
                  </p>
                </div>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

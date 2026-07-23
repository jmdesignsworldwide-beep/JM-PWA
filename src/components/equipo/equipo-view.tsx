"use client";

import Link from "next/link";
import { Users } from "lucide-react";
import type { MemberSaldo } from "@/lib/data/equipo";
import { NewMemberDialog } from "./new-member-dialog";
import { money } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Brand = { id: string; nombre: string };

/**
 * Equipo = SOLO tus empleados: quién trabaja contigo, su info y su acceso.
 * Las Tareas viven dentro de cada Pedido; "¿A quién le debo?" vive en Cobros.
 */
export function EquipoView({ members, brands }: { members: MemberSaldo[]; brands: Brand[] }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="size-4 text-electric" /> Quién trabaja contigo, su info y su acceso.
        </p>
        <NewMemberDialog brands={brands} />
      </div>

      {members.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">
          Aún no hay personas en el equipo.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((m) => (
            <Link key={m.id} href={`/equipo/${m.id}`} className="rounded-xl border border-border bg-card p-4 transition-all hover:border-electric/40 hover:shadow-md">
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-xs font-semibold text-white">
                  {(m.nombre.trim()[0] ?? "?").toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate font-medium">{m.nombre}</p>
                    {!m.activo && <Badge>Inactivo</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{m.rol_especialidad ?? "—"}</p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Saldo</span>
                <span className={cn("font-semibold", m.saldo > 0 ? "text-destructive" : "text-success")}>{money(m.saldo, "DOP")}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

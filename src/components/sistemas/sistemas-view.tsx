"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, FolderOpen, CircleDot, ChevronRight, ShieldAlert, PackageOpen } from "lucide-react";
import type { AccountView, ProjectView } from "@/lib/data/sistemas";
import { NewAccountDialog } from "./new-account-dialog";
import { ProjectDialog } from "./project-dialog";
import { TIPO_LABEL, ESTADO_LABEL } from "./labels";
import { cn } from "@/lib/utils";

type Filtro = "todos" | "espacio" | "llenos";

/** Color por ocupación: lleno rojo · con uso amarillo · vacío verde. */
function ocupacion(a: AccountView) {
  if (a.libres <= 0) return { color: "var(--destructive)", label: "Lleno" };
  if (a.usados > 0) return { color: "var(--warning)", label: `Queda ${a.libres}` };
  return { color: "var(--success)", label: "Libre" };
}

export function SistemasView({ accounts, sinAsignar, resumen }: { accounts: AccountView[]; sinAsignar: ProjectView[]; resumen: { correos: number; usados: number; libres: number } }) {
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const cuentas = accounts.filter((a) => filtro === "todos" || (filtro === "espacio" ? a.libres > 0 : a.libres <= 0));
  const cuentasConEspacio = accounts.filter((a) => a.libres > 0).map((a) => ({ id: a.id, nombre: a.etiqueta ?? a.correo, libres: a.libres }));

  return (
    <div className="space-y-5">
      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        <Stat icon={<Mail className="size-4" />} label="Correos" value={resumen.correos} />
        <Stat icon={<FolderOpen className="size-4" />} label="Proyectos usados" value={resumen.usados} />
        <Stat icon={<CircleDot className="size-4" />} label="Slots libres" value={resumen.libres} highlight />
      </div>

      {/* Acciones */}
      <div className="flex flex-wrap items-center gap-2">
        <NewAccountDialog />
        <ProjectDialog cuentasConEspacio={cuentasConEspacio} trigger="Nuevo proyecto" />
        <div className="ml-auto flex rounded-lg border border-border p-0.5 text-sm">
          {([["todos", "Todos"], ["espacio", "Con espacio"], ["llenos", "Llenos"]] as const).map(([id, label]) => (
            <button key={id} onClick={() => setFiltro(id)}
              className={cn("rounded-md px-3 py-1.5 transition-colors", filtro === id ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40")}>
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de correos */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {cuentas.length === 0 ? (
          <p className="col-span-full py-10 text-center text-sm text-muted-foreground">Sin cuentas en este filtro.</p>
        ) : cuentas.map((a) => {
          const oc = ocupacion(a);
          return (
            <Link key={a.id} href={`/sistemas/${a.id}`}
              className="group rounded-xl border border-border bg-card p-4 transition-all hover:border-electric/40 hover:shadow-md">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.etiqueta ?? a.correo}</p>
                  <p className="truncate text-xs text-muted-foreground">{a.correo}</p>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
                  style={{ borderColor: `color-mix(in srgb, ${oc.color} 45%, transparent)`, color: oc.color, background: `color-mix(in srgb, ${oc.color} 12%, transparent)` }}>
                  {a.usados}/{a.capacidad} · {oc.label}
                </span>
              </div>
              {a.proyectos.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {a.proyectos.map((p) => (
                    <li key={p.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="size-1.5 rounded-full" style={{ background: p.estado === "archivado" ? "var(--muted-foreground)" : "var(--electric)", opacity: p.estado === "archivado" ? 0.4 : 1 }} />
                      <span className={cn("truncate", p.estado === "archivado" && "line-through opacity-60")}>{p.nombre}</span>
                      <span className="ml-auto shrink-0 text-[10px] uppercase tracking-wide">{TIPO_LABEL[p.tipo]}</span>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-3 flex items-center gap-1 text-[11px] text-muted-foreground group-hover:text-electric">Ver y gestionar <ChevronRight className="size-3" /></p>
            </Link>
          );
        })}
      </div>

      {/* Proyectos sin asignar */}
      {sinAsignar.length > 0 && (
        <div className="rounded-xl border border-warning/30 bg-[color-mix(in_srgb,var(--warning)_6%,var(--card))] p-4">
          <h3 className="mb-2 flex items-center gap-2 font-semibold"><PackageOpen className="size-4 text-warning" /> Sin asignar <span className="text-sm font-normal text-muted-foreground">({sinAsignar.length})</span></h3>
          <p className="mb-3 text-xs text-muted-foreground">Estos proyectos existen pero no están ligados a un correo. Ábrelos para asignarlos a una cuenta con espacio.</p>
          <ul className="space-y-2">
            {sinAsignar.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm">
                <span className="min-w-0">
                  <span className="truncate font-medium">{p.nombre}</span>
                  <span className="ml-2 text-[10px] uppercase tracking-wide text-muted-foreground">{TIPO_LABEL[p.tipo]} · {ESTADO_LABEL[p.estado]}</span>
                </span>
                <ProjectDialog cuentasConEspacio={cuentasConEspacio} project={p} trigger="Asignar" small />
              </li>
            ))}
          </ul>
        </div>
      )}

      {resumen.libres === 0 && (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <ShieldAlert className="size-4" /> Todas tus cuentas están llenas. Crea un correo nuevo para más proyectos.
        </p>
      )}
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: number; highlight?: boolean }) {
  return (
    <div className={cn("rounded-xl border p-4", highlight ? "border-electric/40 bg-[color-mix(in_srgb,var(--electric)_7%,var(--card))]" : "border-border bg-card")}>
      <p className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">{icon} {label}</p>
      <p className={cn("mt-1 text-2xl font-bold tracking-tight", highlight && "text-electric")}>{value}</p>
    </div>
  );
}

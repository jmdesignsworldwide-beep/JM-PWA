"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Rocket, Pencil, Trash2, Loader2, Mail, ListTodo } from "lucide-react";
import type { Venture, VentureRed } from "@/lib/data/ventures";
import type { VenturePerfil } from "@/lib/ventures";
import type { Todo } from "@/lib/data/todos";
import { deleteVenture } from "@/app/(app)/pendientes/venture-actions";
import { NewVentureDialog } from "./new-venture-dialog";
import { VentureRedes } from "./venture-redes";
import { VentureEncuesta } from "./venture-encuesta";
import { TodosList } from "@/components/pendientes/todos-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";

export function VentureDetail({ venture, logoUrl, todos, redes }: { venture: Venture; logoUrl: string | null; todos: Todo[]; redes: VentureRed[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [delOpen, setDelOpen] = useState(false);

  function borrar() {
    start(async () => {
      await deleteVenture(venture.id);
      router.push("/pendientes"); router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link href="/pendientes" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Mis proyectos
      </Link>

      {/* Perfil */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-4">
          <span className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border bg-background/40">
            {logoUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={logoUrl} alt={venture.nombre} className="size-full object-cover" />
              : <Rocket className="size-7 text-muted-foreground" />}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight">{venture.nombre}</h1>
              {venture.registrado
                ? <Badge dot="var(--success)">Registrado</Badge>
                : <Badge dot="var(--warning)">Sin registrar</Badge>}
              {venture.tipo && <Badge dot="var(--electric)">{venture.tipo === "online" ? "Online" : "Físico"}</Badge>}
            </div>
            {venture.descripcion && <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{venture.descripcion}</p>}
            {venture.correo && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><Mail className="size-3.5" /> {venture.correo}</p>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <NewVentureDialog venture={venture} logoUrl={logoUrl} trigger={<Button variant="gradient" size="sm"><Pencil className="size-4" /> Editar perfil</Button>} />
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDelOpen(true)}><Trash2 className="size-4" /> Borrar</Button>
        </div>
      </div>

      {/* Encuesta online/físico */}
      <VentureEncuesta ventureId={venture.id} tipo={venture.tipo} perfil={(venture.perfil_json ?? {}) as VenturePerfil} />

      {/* Redes sociales (las que faltan generan pendientes) */}
      <VentureRedes ventureId={venture.id} redes={redes} />

      {/* Más secciones (próximos PRs): socios, ideas, referencias, exportar */}
      <div className="rounded-xl border border-dashed border-border bg-card/40 px-4 py-3 text-xs text-muted-foreground">
        Próximamente en este proyecto: socios y contratos, ideas y referencias visuales, y exportar el brief.
      </div>

      {/* Pendientes del proyecto */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="mb-3 flex items-center gap-2 font-semibold"><ListTodo className="size-4 text-electric" /> Pendientes de este proyecto</h2>
        <TodosList initial={todos} ventureId={venture.id} emptyText="Sin pendientes de este proyecto." />
      </div>

      <Dialog open={delOpen} onClose={() => setDelOpen(false)} title="Borrar proyecto" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm">Vas a borrar <strong>{venture.nombre}</strong> y todos sus pendientes. Esta acción <strong>no se puede deshacer</strong>.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDelOpen(false)}>Cancelar</Button>
            <Button type="button" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={borrar} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Sí, borrar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

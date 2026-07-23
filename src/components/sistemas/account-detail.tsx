"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Trash2, Pencil, Link2Off, Archive, RotateCcw, ShieldAlert, Save, X } from "lucide-react";
import type { AccountView } from "@/lib/data/sistemas";
import { updateAccount, deleteAccount, updateProject, unassignProject, deleteProject } from "@/app/(app)/sistemas/actions";
import { ProjectDialog } from "./project-dialog";
import { ProtectedNote } from "./protected-note";
import { TIPO_LABEL, ESTADO_LABEL } from "./labels";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Cuenta = { id: string; nombre: string; libres: number };

export function AccountDetail({ account, cuentasConEspacio }: { account: AccountView; cuentasConEspacio: Cuenta[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editNotas, setEditNotas] = useState(false);
  const [etiqueta, setEtiqueta] = useState(account.etiqueta ?? "");
  const [notas, setNotas] = useState(account.notas ?? "");
  const [protegida, setProtegida] = useState("");
  const [delOpen, setDelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const oc = account.libres <= 0 ? { c: "var(--destructive)", t: "Llena" } : account.usados > 0 ? { c: "var(--warning)", t: `Queda ${account.libres}` } : { c: "var(--success)", t: "Libre" };

  function guardarNotas() {
    setError(null);
    start(async () => {
      const patch: { etiqueta: string; notas: string; notas_protegidas?: string } = { etiqueta, notas };
      if (protegida.trim()) patch.notas_protegidas = protegida.trim();
      const res = await updateAccount(account.id, patch);
      if (res?.error) { setError(res.error); return; }
      setEditNotas(false); setProtegida(""); router.refresh();
    });
  }
  function borrarCuenta() {
    start(async () => { const res = await deleteAccount(account.id); if (res?.error) { setError(res.error); return; } router.push("/sistemas"); router.refresh(); });
  }
  function setEstadoProyecto(id: string, estado: string) {
    start(async () => { await updateProject(id, { estado }); router.refresh(); });
  }
  function quitar(id: string) { start(async () => { await unassignProject(id); router.refresh(); }); }
  function borrarProyecto(id: string) { start(async () => { await deleteProject(id); router.refresh(); }); }

  return (
    <div className="space-y-5">
      <Link href="/sistemas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"><ArrowLeft className="size-4" /> Sistemas</Link>

      {/* Header cuenta */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl font-semibold tracking-tight">{account.etiqueta ?? account.correo}</h1>
            <p className="text-sm text-muted-foreground">{account.correo}</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium"
            style={{ borderColor: `color-mix(in srgb, ${oc.c} 45%, transparent)`, color: oc.c, background: `color-mix(in srgb, ${oc.c} 12%, transparent)` }}>
            {account.usados}/{account.capacidad} · {oc.t}
          </span>
        </div>
        {!editNotas ? (
          <div className="mt-3 space-y-3">
            {account.notas && <p className="whitespace-pre-wrap text-sm text-muted-foreground">{account.notas}</p>}
            <ProtectedNote kind="account" id={account.id} tiene={account.tieneProtegida} />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditNotas(true)}><Pencil className="size-4" /> Editar notas</Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDelOpen(true)}><Trash2 className="size-4" /> Borrar cuenta</Button>
            </div>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <div className="space-y-1.5"><Label>Etiqueta</Label><Input value={etiqueta} onChange={(e) => setEtiqueta(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Nota protegida (opcional · solo apuntes, NUNCA claves)</Label>
              <Textarea rows={2} value={protegida} onChange={(e) => setProtegida(e.target.value)} placeholder={account.tieneProtegida ? "Escribe para reemplazar la nota protegida…" : "Ej. este correo tiene 2FA activo"} />
              <p className="text-[11px] text-muted-foreground">Se guarda protegida por tu PIN. No pongas contraseñas aquí.</p>
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditNotas(false); setError(null); }}><X className="size-4" /> Cancelar</Button>
              <Button variant="gradient" size="sm" onClick={guardarNotas} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar</Button>
            </div>
          </div>
        )}
      </div>

      {/* Proyectos */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Proyectos <span className="text-sm font-normal text-muted-foreground">({account.usados}/{account.capacidad})</span></h2>
          {account.libres > 0
            ? <ProjectDialog cuentasConEspacio={cuentasConEspacio} accountId={account.id} trigger="Agregar proyecto" />
            : <span className="flex items-center gap-1.5 text-xs text-destructive"><ShieldAlert className="size-4" /> Cuenta llena</span>}
        </div>
        {account.proyectos.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin proyectos. Agrega el primero.</p>
        ) : (
          <ul className="space-y-2">
            {account.proyectos.map((p) => (
              <li key={p.id} className="rounded-lg border border-border bg-background/40 p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className={cn("truncate font-medium", p.estado === "archivado" && "line-through opacity-60")}>{p.nombre}</p>
                    <p className="text-xs text-muted-foreground">{TIPO_LABEL[p.tipo]} · {ESTADO_LABEL[p.estado]}{p.referencia ? ` · ${p.referencia}` : ""}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <ProjectDialog cuentasConEspacio={cuentasConEspacio} project={p} trigger="" small />
                    {p.estado !== "archivado"
                      ? <Button variant="ghost" size="icon" title="Archivar (libera slot)" onClick={() => setEstadoProyecto(p.id, "archivado")} disabled={pending}><Archive className="size-4" /></Button>
                      : <Button variant="ghost" size="icon" title="Reactivar" onClick={() => setEstadoProyecto(p.id, "activo")} disabled={pending}><RotateCcw className="size-4" /></Button>}
                    <Button variant="ghost" size="icon" title="Quitar de la cuenta" onClick={() => quitar(p.id)} disabled={pending}><Link2Off className="size-4" /></Button>
                    <Button variant="ghost" size="icon" title="Borrar" className="text-destructive" onClick={() => borrarProyecto(p.id)} disabled={pending}><Trash2 className="size-4" /></Button>
                  </div>
                </div>
                {(p.notas || p.tieneProtegida) && (
                  <div className="mt-2 space-y-2">
                    {p.notas && <p className="text-xs text-muted-foreground">{p.notas}</p>}
                    <ProtectedNote kind="project" id={p.id} tiene={p.tieneProtegida} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={delOpen} onClose={() => setDelOpen(false)} title="Borrar cuenta" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm">Vas a borrar <strong>{account.etiqueta ?? account.correo}</strong>. Sus proyectos quedarán <strong>sin asignar</strong> (no se borran). Esta acción no se puede deshacer.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setDelOpen(false)}>Cancelar</Button>
            <Button variant="outline" className="text-destructive" onClick={borrarCuenta} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Sí, borrar</Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

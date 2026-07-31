"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, FolderPlus, Link2 } from "lucide-react";
import { createProject, updateProject, assignProject } from "@/app/(app)/sistemas/actions";
import { TIPO_LIST, ESTADO_LIST } from "./labels";
import type { ProjectView } from "@/lib/data/sistemas";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { KeyRound } from "lucide-react";

type Cuenta = { id: string; nombre: string; libres: number };

export function ProjectDialog({
  cuentasConEspacio, project, accountId, trigger, small,
}: {
  cuentasConEspacio: Cuenta[];
  project?: ProjectView;
  accountId?: string;      // preselecciona la cuenta (desde el detalle)
  trigger: string;
  small?: boolean;
}) {
  const router = useRouter();
  const mode: "create" | "edit" | "assign" = project ? (project.account_id ? "edit" : "assign") : "create";
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState(project?.nombre ?? "");
  const [tipo, setTipo] = useState(project?.tipo ?? "demo");
  const [estado, setEstado] = useState(project?.estado ?? "activo");
  const [referencia, setReferencia] = useState(project?.referencia ?? "");
  const [notas, setNotas] = useState(project?.notas ?? "");
  const [cuenta, setCuenta] = useState(accountId ?? "");
  const [tieneAcceso, setTieneAcceso] = useState(project?.tieneAcceso ?? false);
  const [usuario, setUsuario] = useState(project?.usuario ?? "");

  function open_() {
    setNombre(project?.nombre ?? ""); setTipo(project?.tipo ?? "demo"); setEstado(project?.estado ?? "activo");
    setReferencia(project?.referencia ?? ""); setNotas(project?.notas ?? ""); setCuenta(accountId ?? "");
    setTieneAcceso(project?.tieneAcceso ?? false); setUsuario(project?.usuario ?? "");
    setError(null); setOpen(true);
  }

  function submit() {
    setError(null);
    start(async () => {
      let res;
      if (mode === "assign") res = await assignProject(project!.id, cuenta);
      else if (mode === "edit") res = await updateProject(project!.id, { nombre, tipo, estado, referencia, notas, tiene_acceso: tieneAcceso, usuario });
      else res = await createProject({ account_id: cuenta || null, nombre, tipo, estado, referencia, notas, tiene_acceso: tieneAcceso, usuario });
      if (res?.error) { setError(res.error); return; }
      setOpen(false); router.refresh();
    });
  }

  const title = mode === "assign" ? "Asignar proyecto" : mode === "edit" ? "Editar proyecto" : "Nuevo proyecto";

  return (
    <>
      <Button variant={small ? "outline" : "gradient"} size={small ? "sm" : "default"} onClick={open_}>
        {mode === "assign" ? <Link2 className="size-4" /> : <FolderPlus className="size-4" />} {trigger}
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={title} className="max-w-md">
        <div className="space-y-3">
          {mode === "assign" ? (
            <>
              <p className="text-sm text-muted-foreground">Asignar <strong className="text-foreground">{project?.nombre}</strong> a una cuenta con espacio:</p>
              <div className="space-y-1.5"><Label>Cuenta</Label>
                <Select value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
                  <option value="">— Elegir —</option>
                  {cuentasConEspacio.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.libres} libre{c.libres === 1 ? "" : "s"})</option>)}
                </Select>
              </div>
              {cuentasConEspacio.length === 0 && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">No hay cuentas con espacio. Libera un slot o crea un correo nuevo.</p>}
            </>
          ) : (
            <>
              <div className="space-y-1.5"><Label>Nombre *</Label><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Demo Construcción" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Tipo</Label><Select value={tipo} onChange={(e) => setTipo(e.target.value as ProjectView["tipo"])}>{TIPO_LIST.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}</Select></div>
                <div className="space-y-1.5"><Label>Estado</Label><Select value={estado} onChange={(e) => setEstado(e.target.value as ProjectView["estado"])}>{ESTADO_LIST.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></div>
              </div>
              {mode === "create" && !accountId && (
                <div className="space-y-1.5"><Label>Cuenta (opcional)</Label>
                  <Select value={cuenta} onChange={(e) => setCuenta(e.target.value)}>
                    <option value="">— Sin asignar —</option>
                    {cuentasConEspacio.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.libres} libre{c.libres === 1 ? "" : "s"})</option>)}
                  </Select>
                </div>
              )}
              <div className="space-y-1.5"><Label>Referencia (project ref / URL, opcional)</Label><Input value={referencia} onChange={(e) => setReferencia(e.target.value)} placeholder="ljhvpsyq… o https://…" /></div>

              {/* Acceso: usuario + contraseña (solo si aplica: demos, clientes…). */}
              <div className="rounded-lg border border-border bg-secondary/20 p-3">
                <label className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-1.5 text-sm font-medium"><KeyRound className="size-4 text-electric" /> Tiene usuario y contraseña</span>
                  <Switch checked={tieneAcceso} onCheckedChange={setTieneAcceso} />
                </label>
                {tieneAcceso && (
                  <div className="mt-3 space-y-1.5">
                    <Label>Usuario</Label>
                    <Input value={usuario} onChange={(e) => setUsuario(e.target.value)} placeholder="Usuario / correo de acceso" autoComplete="off" />
                    <p className="text-[11px] text-muted-foreground">La <strong>contraseña</strong> se guarda aparte, cifrada y con tu PIN, desde la tarjeta del proyecto.</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5"><Label>Notas (opcional)</Label><Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
            </>
          )}
          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button variant="gradient" onClick={submit} disabled={pending || (mode === "assign" && !cuenta)}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} {mode === "assign" ? "Asignar" : "Guardar"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

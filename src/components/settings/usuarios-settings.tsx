"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, ShieldCheck, Copy, Check, Pencil, Trash2, AtSign } from "lucide-react";
import { createOwner, updateOwner, deleteOwner } from "@/app/(app)/configuracion/actions";
import { slugUsername } from "@/lib/username";
import { AnimatedCard } from "@/components/animations/motion";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Owner = { id: string; nombre: string | null; correo: string | null; username: string | null };

export function UsuariosSettings({ owners, currentUserId }: { owners: Owner[]; currentUserId: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Owner | null>(null);
  const [pending, startTransition] = useTransition();
  const [creds, setCreds] = useState<{ email: string; username: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [username, setUsername] = useState("");

  const soloUno = owners.length <= 1;

  function reset() { setError(null); setCreds(null); setUsername(""); }

  function submitCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createOwner({
        email: fd.get("email") as string,
        password: (fd.get("password") as string) || undefined,
        nombre: (fd.get("nombre") as string) || undefined,
        username: username || undefined,
      });
      if (res?.error) { setError(res.error); return; }
      setCreds({ email: res.email!, username: res.username!, password: res.password! });
      router.refresh();
    });
  }

  function submitEdit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setError(null);
    const fd = new FormData(e.currentTarget);
    const pwd = (fd.get("password") as string)?.trim();
    startTransition(async () => {
      const res = await updateOwner(editing.id, {
        nombre: fd.get("nombre") as string,
        correo: fd.get("correo") as string,
        username,
        password: pwd || undefined,
      });
      if (res?.error) { setError(res.error); return; }
      if (pwd) setCreds({ email: fd.get("correo") as string, username: username || editing.username || "", password: pwd });
      else { setEditing(null); reset(); }
      router.refresh();
    });
  }

  function remove(o: Owner) {
    if (!confirm(`¿Eliminar a ${o.nombre || o.correo}? Perderá el acceso por completo.`)) return;
    setError(null);
    startTransition(async () => {
      const res = await deleteOwner(o.id);
      if (res?.error) { alert(res.error); return; }
      router.refresh();
    });
  }

  const msg = creds
    ? `Acceso a JM Control Center:\nEntra en /login\nUsuario: ${creds.username || creds.email}\nCorreo: ${creds.email}\nContraseña: ${creds.password}`
    : "";

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-4 text-electric" /> Usuarios y roles
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Owners (acceso total). Solo un owner puede crear, editar o eliminar a otro. No se puede eliminar el último owner.
      </p>

      <ul className="mt-4 space-y-2">
        {owners.map((o) => (
          <li key={o.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{o.nombre || o.correo}{o.id === currentUserId && <span className="ml-2 text-xs text-muted-foreground">(tú)</span>}</p>
              <p className="truncate text-xs text-muted-foreground">{o.username ? `@${o.username}` : "sin usuario"} · {o.correo}</p>
            </div>
            <Badge dot="var(--success)">Owner</Badge>
            <button title="Editar" onClick={() => { setEditing(o); setUsername(o.username ?? ""); setError(null); setCreds(null); }} className="text-muted-foreground hover:text-foreground"><Pencil className="size-4" /></button>
            <button title={soloUno ? "No puedes eliminar el último owner" : o.id === currentUserId ? "No puedes eliminarte a ti mismo" : "Eliminar"}
              disabled={soloUno || o.id === currentUserId || pending}
              onClick={() => remove(o)}
              className="text-muted-foreground hover:text-destructive disabled:opacity-30"><Trash2 className="size-4" /></button>
          </li>
        ))}
      </ul>

      <Button variant="gradient" className="mt-4" onClick={() => { setAdding(true); reset(); }}>
        <UserPlus className="size-4" /> Agregar owner/admin
      </Button>

      {/* Crear */}
      <Dialog open={adding} onClose={() => { setAdding(false); reset(); }} title="Agregar owner / admin"
        description="Acceso TOTAL e igual al tuyo. Entrará con su usuario o su correo.">
        {!creds ? (
          <form onSubmit={submitCreate} className="space-y-4">
            <div className="space-y-1.5"><Label>Nombre</Label><Input name="nombre" placeholder="Nombre" /></div>
            <div className="space-y-1.5"><Label>Correo *</Label><Input name="email" type="email" required placeholder="correo@ejemplo.com" /></div>
            <div className="space-y-1.5">
              <Label>Usuario (opcional)</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={username} onChange={(e) => setUsername(slugUsername(e.target.value))} autoCapitalize="none" placeholder="se genera del nombre si lo dejas vacío" className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Contraseña (opcional)</Label>
              <Input name="password" type="text" placeholder="Vacío = se genera una temporal" />
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setAdding(false); reset(); }}>Cancelar</Button>
              <Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Crear owner</Button>
            </div>
          </form>
        ) : (
          <CredsView creds={creds} copied={copied} onCopy={() => { navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2000); }} onClose={() => { setAdding(false); reset(); }} />
        )}
      </Dialog>

      {/* Editar */}
      <Dialog open={!!editing} onClose={() => { setEditing(null); reset(); }} title="Editar owner"
        description="Cambia nombre, correo, usuario o restablece su contraseña.">
        {editing && !creds ? (
          <form onSubmit={submitEdit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nombre</Label><Input name="nombre" defaultValue={editing.nombre ?? ""} /></div>
            <div className="space-y-1.5"><Label>Correo</Label><Input name="correo" type="email" defaultValue={editing.correo ?? ""} /></div>
            <div className="space-y-1.5">
              <Label>Usuario</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={username} onChange={(e) => setUsername(slugUsername(e.target.value))} autoCapitalize="none" className="pl-10" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Nueva contraseña (opcional)</Label>
              <Input name="password" type="text" placeholder="Déjalo vacío para no cambiarla" />
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => { setEditing(null); reset(); }}>Cancelar</Button>
              <Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Guardar</Button>
            </div>
          </form>
        ) : editing && creds ? (
          <CredsView creds={creds} copied={copied} onCopy={() => { navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2000); }} onClose={() => { setEditing(null); reset(); }} />
        ) : null}
      </Dialog>
    </AnimatedCard>
  );
}

function CredsView({ creds, copied, onCopy, onClose }: {
  creds: { email: string; username: string; password: string }; copied: boolean; onCopy: () => void; onClose: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-success">✅ Listo. Comparte estas credenciales:</p>
      <div className="space-y-1 rounded-lg border border-border bg-background/50 p-3 text-sm">
        <p><span className="text-muted-foreground">Entrar en:</span> /login</p>
        <p><span className="text-muted-foreground">Usuario:</span> <strong>{creds.username || creds.email}</strong></p>
        <p><span className="text-muted-foreground">Correo:</span> {creds.email}</p>
        <p><span className="text-muted-foreground">Contraseña:</span> <strong>{creds.password}</strong></p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={onCopy}>{copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar credenciales</Button>
        <Button variant="ghost" size="sm" onClick={onClose}>Cerrar</Button>
      </div>
      <p className="text-xs text-muted-foreground">Pídele que cambie la contraseña al entrar.</p>
    </div>
  );
}

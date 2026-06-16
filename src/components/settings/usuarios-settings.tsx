"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, Loader2, ShieldCheck, Copy, Check } from "lucide-react";
import { createOwner } from "@/app/(app)/configuracion/actions";
import { AnimatedCard } from "@/components/animations/motion";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

type Owner = { id: string; nombre: string | null; correo: string | null };

export function UsuariosSettings({ owners }: { owners: Owner[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await createOwner({
        email: fd.get("email") as string,
        password: (fd.get("password") as string) || undefined,
        nombre: (fd.get("nombre") as string) || undefined,
      });
      if (res?.error) { setError(res.error); return; }
      setCreds({ email: res.email!, password: res.password! });
      router.refresh();
    });
  }

  const msg = creds ? `Acceso owner a JM Control Center:\nEntra en /login\nUsuario: ${creds.email}\nContraseña: ${creds.password}` : "";

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <ShieldCheck className="size-4 text-electric" /> Usuarios y roles
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Owners (acceso total). Solo un owner puede crear otro owner.
      </p>

      <ul className="mt-4 space-y-2">
        {owners.map((o) => (
          <li key={o.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
            <span>{o.nombre || o.correo}</span>
            <Badge dot="var(--success)">Owner</Badge>
          </li>
        ))}
      </ul>

      <Button variant="gradient" className="mt-4" onClick={() => { setOpen(true); setCreds(null); setError(null); }}>
        <UserPlus className="size-4" /> Agregar owner/admin
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} title="Agregar owner / admin"
        description="Acceso TOTAL e igual al tuyo. Solo un owner puede hacerlo.">
        {!creds ? (
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5"><Label>Nombre</Label><Input name="nombre" placeholder="Nombre" /></div>
            <div className="space-y-1.5"><Label>Correo *</Label><Input name="email" type="email" required placeholder="correo@ejemplo.com" /></div>
            <div className="space-y-1.5">
              <Label>Contraseña (opcional)</Label>
              <Input name="password" type="text" placeholder="Déjalo vacío para generar una temporal" />
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" variant="gradient" disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Crear owner</Button>
            </div>
          </form>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-success">✅ Owner creado con acceso total.</p>
            <div className="space-y-1 rounded-lg border border-border bg-background/50 p-3 text-sm">
              <p><span className="text-muted-foreground">Entrar en:</span> /login</p>
              <p><span className="text-muted-foreground">Usuario:</span> {creds.email}</p>
              <p><span className="text-muted-foreground">Contraseña:</span> <strong>{creds.password}</strong></p>
            </div>
            <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(msg); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar credenciales
            </Button>
            <p className="text-xs text-muted-foreground">Pídele que cambie la contraseña al entrar.</p>
          </div>
        )}
      </Dialog>
    </AnimatedCard>
  );
}

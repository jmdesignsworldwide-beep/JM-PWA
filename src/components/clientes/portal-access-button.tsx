"use client";

import { EMPRESA } from "@/lib/empresa";
import { useState, useTransition } from "react";
import { KeyRound, Loader2, Copy, Check, MessageCircle, AtSign } from "lucide-react";
import { grantPortalAccess, suggestPortalUsername } from "@/app/(app)/clientes/actions";
import { slugUsername } from "@/lib/username";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Creds = { username: string; password: string; loginPath: string; actualizado?: boolean };

export function PortalAccessButton({
  clientId,
  clientName,
  whatsapp,
}: {
  clientId: string;
  clientName: string;
  whatsapp: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [username, setUsername] = useState("");
  const [yaExiste, setYaExiste] = useState(false);
  const [creds, setCreds] = useState<Creds | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function abrir() {
    setOpen(true);
    setCreds(null);
    setError(null);
    setUsername("");
    startTransition(async () => {
      const res = await suggestPortalUsername(clientId);
      if (res?.error) { setError(res.error); return; }
      setUsername(res.username ?? "");
      setYaExiste(!!res.yaExiste);
    });
  }

  function crear() {
    setError(null);
    startTransition(async () => {
      const res = await grantPortalAccess(clientId, username);
      if (res?.error) { setError(res.error); return; }
      setCreds({ username: res.username!, password: res.password!, loginPath: res.loginPath!, actualizado: res.actualizado });
    });
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const portalUrl = creds ? `${origin}${creds.loginPath}` : "";
  const mensaje = creds
    ? `¡Hola ${clientName}! 🎉 Tu portal privado de ${EMPRESA.nombre} ya está listo. Aquí podrás ver el avance de tu proyecto en tiempo real.\n\nEntra aquí 👉 ${portalUrl}\nUsuario: ${creds.username}\nClave temporal: ${creds.password}\n\n¡Bienvenido! 💜`
    : "";

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={abrir}>
        <KeyRound className="size-4" /> Acceso al portal
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Acceso al Portal de Cliente"
        description="Crea el usuario y la clave para que el cliente entre a ver su proyecto.">
        {!creds ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se creará una cuenta ligada solo a este cliente. Verá únicamente su proyecto, facturas y documentos — nada interno.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="username">Nombre de usuario</Label>
              <div className="relative">
                <AtSign className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(slugUsername(e.target.value))}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder={pending ? "Generando…" : "maria.perez"}
                  className="pl-10"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Lo puedes ajustar. Minúsculas, sin espacios ni acentos. {yaExiste && "Este cliente ya tiene acceso: se actualizará su usuario y se generará una clave nueva."}
              </p>
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button variant="gradient" onClick={crear} disabled={pending || username.trim().length < 2}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} {yaExiste ? "Actualizar acceso" : "Crear acceso"}
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-success">✅ {creds.actualizado ? "Acceso actualizado" : "Acceso creado"}. Comparte estas credenciales con tu cliente:</p>
            <div className="space-y-1 rounded-lg border border-border bg-background/50 p-3 text-sm">
              <p><span className="text-muted-foreground">Portal:</span> {portalUrl}</p>
              <p><span className="text-muted-foreground">Usuario:</span> <strong>{creds.username}</strong></p>
              <p><span className="text-muted-foreground">Clave temporal:</span> <strong>{creds.password}</strong></p>
            </div>
            <div className="rounded-lg border border-border bg-background/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">{mensaje}</div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(mensaje); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar mensaje
              </Button>
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="gradient" size="sm"><MessageCircle className="size-4" /> Enviar por WhatsApp</Button>
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Por seguridad, pídele que cambie la clave al entrar (recuperar contraseña).</p>
          </div>
        )}
      </Dialog>
    </>
  );
}

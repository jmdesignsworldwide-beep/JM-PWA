"use client";

import { useState, useTransition } from "react";
import { KeyRound, Loader2, Copy, Check, MessageCircle } from "lucide-react";
import { grantPortalAccess } from "@/app/(app)/clientes/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function PortalAccessButton({
  clientId,
  whatsapp,
}: {
  clientId: string;
  whatsapp: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generar() {
    setError(null);
    startTransition(async () => {
      const res = await grantPortalAccess(clientId);
      if (res?.error) { setError(res.error); return; }
      setCreds({ email: res.email!, password: res.password! });
    });
  }

  const mensaje = creds
    ? `Hola 👋 Te creamos tu portal de cliente en JM Designs.\nEntra aquí: ${typeof window !== "undefined" ? window.location.origin : ""}/portal/login\nUsuario: ${creds.email}\nContraseña temporal: ${creds.password}`
    : "";

  return (
    <>
      <Button variant="outline" className="gap-2" onClick={() => { setOpen(true); setCreds(null); setError(null); }}>
        <KeyRound className="size-4" /> Acceso al portal
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} title="Acceso al Portal de Cliente"
        description="Crea las credenciales para que el cliente entre a ver su proyecto.">
        {!creds ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Se creará una cuenta ligada solo a este cliente. Verá únicamente su proyecto, facturas y documentos — nada interno.
            </p>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button variant="gradient" onClick={generar} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Generar acceso
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-success">✅ Acceso creado. Comparte estas credenciales con tu cliente:</p>
            <div className="space-y-1 rounded-lg border border-border bg-background/50 p-3 text-sm">
              <p><span className="text-muted-foreground">Portal:</span> /portal/login</p>
              <p><span className="text-muted-foreground">Usuario:</span> {creds.email}</p>
              <p><span className="text-muted-foreground">Contraseña:</span> <strong>{creds.password}</strong></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(mensaje); setCopied(true); setTimeout(() => setCopied(false), 2000); }}>
                {copied ? <Check className="size-4" /> : <Copy className="size-4" />} Copiar mensaje
              </Button>
              {whatsapp && (
                <a href={`https://wa.me/${whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="text-success"><MessageCircle className="size-4" /> Enviar por WhatsApp</Button>
                </a>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Por seguridad, pídele que cambie la contraseña al entrar (recuperar contraseña).</p>
          </div>
        )}
      </Dialog>
    </>
  );
}

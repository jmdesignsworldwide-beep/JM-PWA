"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Copy, Check, MessageCircle } from "lucide-react";
import { grantTeamAccess } from "@/app/(app)/equipo/actions";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Botón "Generar acceso" para un colaborador: crea su login (rol equipo),
 * muestra la contraseña temporal y un enlace de WhatsApp para enviársela.
 * El colaborador entra por /login y ve su panel en /trabajo.
 */
export function GrantAccessButton({
  memberId, nombre, correo, whatsapp,
}: { memberId: string; nombre: string; correo: string | null; whatsapp: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [creds, setCreds] = useState<{ email: string; password: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  function generar() {
    setError(null);
    start(async () => {
      const r = await grantTeamAccess(memberId);
      if (r.error) setError(r.error);
      else if (r.ok) { setCreds({ email: r.email!, password: r.password! }); router.refresh(); }
    });
  }

  const wa = (whatsapp ?? "").replace(/\D/g, "");
  const mensaje = creds
    ? `Hola ${nombre} 👋, este es tu acceso a JM Control Center:\n\n🔗 Entra en /login\n📧 Correo: ${creds.email}\n🔑 Clave temporal: ${creds.password}\n\nCambia la clave al entrar. Verás tus tareas en /trabajo.`
    : "";

  return (
    <>
      <Button variant="outline" size="sm" onClick={generar} disabled={pending || !correo}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />} Generar acceso
      </Button>
      {!correo && <p className="mt-1 text-xs text-amber-500">Agrega el correo del colaborador en su ficha para poder darle acceso.</p>}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}

      <Dialog open={!!creds} onClose={() => setCreds(null)} title="Acceso creado" description="Comparte estos datos con el colaborador. La clave es temporal: debe cambiarla al entrar.">
        {creds && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border border-border bg-secondary/40 p-3 text-sm">
              <p><span className="text-muted-foreground">Correo:</span> <span className="font-medium">{creds.email}</span></p>
              <p><span className="text-muted-foreground">Clave temporal:</span> <span className="font-mono font-medium">{creds.password}</span></p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => { navigator.clipboard?.writeText(mensaje); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
                {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />} Copiar mensaje
              </Button>
              {wa && (
                <a href={`https://wa.me/${wa}?text=${encodeURIComponent(mensaje)}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="gradient" size="sm"><MessageCircle className="size-4" /> Enviar por WhatsApp</Button>
                </a>
              )}
            </div>
          </div>
        )}
      </Dialog>
    </>
  );
}

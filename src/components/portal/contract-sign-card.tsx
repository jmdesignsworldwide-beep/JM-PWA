"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, CheckCircle2, Loader2 } from "lucide-react";
import { signContractPortal } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Contract = { id: string; contenido: string | null };

export function ContractSignCard({ contract, clientName = "" }: { contract: Contract; clientName?: string }) {
  const router = useRouter();
  const [firma, setFirma] = useState(clientName);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function sign() {
    setError(null);
    startTransition(async () => {
      const res = await signContractPortal(contract.id, firma);
      if (res?.error) { setError(res.error); return; }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <section className="rounded-xl border border-electric/40 bg-[color-mix(in_srgb,var(--electric)_6%,transparent)]">
      <div className="flex items-center gap-2 border-b border-border px-5 py-3">
        <FileSignature className="size-4 text-electric" />
        <h2 className="font-semibold">Tienes un contrato por aprobar</h2>
      </div>
      <div className="space-y-4 p-5">
        {done ? (
          <div className="flex items-center gap-2 text-success">
            <CheckCircle2 className="size-5" /> ¡Contrato firmado! Gracias. Ya empezamos.
          </div>
        ) : (
          <>
            <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-background/60 p-4 text-sm">
              {contract.contenido || "—"}
            </pre>
            <div className="space-y-2">
              <Label htmlFor="firma">Escribe tu nombre completo como firma</Label>
              <Input id="firma" value={firma} onChange={(e) => setFirma(e.target.value)} placeholder="Tu nombre y apellido" />
              <p className="text-xs text-muted-foreground">Al firmar, aceptas los términos de este contrato.</p>
            </div>
            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <Button variant="gradient" size="lg" onClick={sign} disabled={pending || firma.trim().length < 3}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />} Aprobar y firmar
            </Button>
          </>
        )}
      </div>
    </section>
  );
}

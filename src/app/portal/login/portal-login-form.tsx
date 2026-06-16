"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, User } from "lucide-react";
import { portalLogin } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function PortalLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirectTo = params.get("redirectTo") || "/portal";
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await portalLogin(identifier, password);
    if (res?.error) {
      setError(res.error);
      setLoading(false);
      return;
    }
    router.replace(redirectTo);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="identifier">Usuario o correo</Label>
        <div className="relative">
          <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="identifier"
            required
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="pl-10"
            placeholder="maria.perez o tu@correo.com"
          />
        </div>
        <p className="text-xs text-muted-foreground">Usa el usuario que te enviamos (ej. maria.perez) o tu correo.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Clave</Label>
        <div className="relative">
          <Lock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input id="password" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10" placeholder="••••••••" />
        </div>
      </div>
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}
      <Button type="submit" variant="gradient" size="lg" disabled={loading} className="w-full">
        {loading && <Loader2 className="size-4 animate-spin" />} Entrar a mi portal
      </Button>
    </form>
  );
}

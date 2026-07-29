"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Music2, MessageCircle, Globe, Plus, Trash2, Loader2, ExternalLink, Share2 } from "lucide-react";
import { addVentureRed, updateVentureRed, deleteVentureRed } from "@/app/(app)/pendientes/venture-redes-actions";
import type { VentureRed } from "@/lib/data/ventures";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type IconCmp = React.ComponentType<{ className?: string }>;

// lucide ya no trae íconos de marca: IG/FB van como SVG inline (igual que SocialLinks).
function IgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}
function FbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}

type RedTipo = "instagram" | "facebook" | "tiktok" | "whatsapp" | "web";
const REDES: { id: RedTipo; label: string; icon: IconCmp }[] = [
  { id: "instagram", label: "Instagram", icon: IgIcon },
  { id: "facebook", label: "Facebook", icon: FbIcon },
  { id: "tiktok", label: "TikTok", icon: Music2 },
  { id: "whatsapp", label: "WhatsApp", icon: MessageCircle },
  { id: "web", label: "Página web", icon: Globe },
];
const META = (t: string) => REDES.find((r) => r.id === t);

export function VentureRedes({ ventureId, redes }: { ventureId: string; redes: VentureRed[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState<RedTipo>("instagram");
  const [hecha, setHecha] = useState(true);
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  function agregar() {
    setError(null);
    start(async () => {
      const res = await addVentureRed(ventureId, tipo, hecha, hecha ? url : null);
      if (res?.error) { setError(res.error); return; }
      setUrl(""); setHecha(true); setTipo("instagram"); setOpen(false);
      router.refresh();
    });
  }
  function toggleHecha(r: VentureRed) {
    start(async () => { await updateVentureRed(r.id, ventureId, r.tipo, !r.hecha, r.url); router.refresh(); });
  }
  function borrar(r: VentureRed) {
    start(async () => { await deleteVentureRed(r.id, ventureId, r.tipo); router.refresh(); });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-semibold"><Share2 className="size-4 text-electric" /> Redes sociales</h2>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}><Plus className="size-4" /> Añadir red</Button>
      </div>

      {redes.length === 0 ? (
        <p className="py-3 text-sm text-muted-foreground">Sin redes aún. Añade las que tenga (o las que falten, para que se vuelvan pendientes).</p>
      ) : (
        <ul className="space-y-2">
          {redes.map((r) => {
            const m = META(r.tipo);
            const Icon = m?.icon ?? Globe;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                <Icon className={cn("size-4 shrink-0", r.hecha ? "text-electric" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{m?.label ?? r.tipo}</span>
                  {r.hecha
                    ? (r.url
                      ? <a href={/^https?:\/\//.test(r.url) ? r.url : `https://${r.url}`} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 text-xs text-electric hover:underline">{r.url} <ExternalLink className="size-3" /></a>
                      : <span className="ml-2 text-xs text-muted-foreground">sin link</span>)
                    : <span className="ml-2 rounded bg-warning/10 px-1.5 py-0.5 text-[11px] font-medium text-warning">pendiente por crear</span>}
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <Switch checked={r.hecha} onCheckedChange={() => toggleHecha(r)} /> hecha
                </label>
                <button type="button" onClick={() => borrar(r)} disabled={pending} className="text-muted-foreground hover:text-destructive" aria-label="Quitar red"><Trash2 className="size-4" /></button>
              </li>
            );
          })}
        </ul>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title="Añadir red" className="max-w-md">
        <div className="space-y-4">
          <div>
            <Label className="mb-1.5 block">¿Cuál red?</Label>
            <div className="flex flex-wrap gap-2">
              {REDES.map((r) => {
                const Icon = r.icon;
                return (
                  <button key={r.id} type="button" onClick={() => setTipo(r.id)}
                    className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                      tipo === r.id ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>
                    <Icon className="size-4" /> {r.label}
                  </button>
                );
              })}
            </div>
          </div>
          <label className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5 text-sm">
            <span>¿Ya está hecha?</span>
            <Switch checked={hecha} onCheckedChange={setHecha} />
          </label>
          {hecha ? (
            <div className="space-y-1.5"><Label>Link o usuario</Label>
              <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="@usuario o https://…" /></div>
          ) : (
            <p className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-xs text-warning">
              Se creará el pendiente <strong>&quot;Crear {META(tipo)?.label} de este proyecto&quot;</strong>.
            </p>
          )}
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="button" variant="gradient" onClick={agregar} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Añadir
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

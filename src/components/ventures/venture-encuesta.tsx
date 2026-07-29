"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Store, Loader2, Save } from "lucide-react";
import { saveVenturePerfil } from "@/app/(app)/pendientes/venture-redes-actions";
import { MERCADOS, TAMANOS_LOCAL, type VenturePerfil } from "@/lib/ventures";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/** Encuesta que se adapta: Online (mercado/metas) o Físico (ciudad/local…). */
export function VentureEncuesta({
  ventureId, tipo: tipoInicial, perfil: perfilInicial,
}: {
  ventureId: string;
  tipo: "online" | "fisico" | null;
  perfil: VenturePerfil;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tipo, setTipo] = useState<"online" | "fisico" | null>(tipoInicial);
  const [p, setP] = useState<VenturePerfil>(perfilInicial ?? {});
  const [saved, setSaved] = useState(false);
  const set = <K extends keyof VenturePerfil>(k: K, v: VenturePerfil[K]) => { setP((x) => ({ ...x, [k]: v })); setSaved(false); };

  function guardar() {
    start(async () => {
      await saveVenturePerfil(ventureId, tipo, p);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h2 className="mb-3 font-semibold">¿Online o físico?</h2>
      <div className="grid grid-cols-2 gap-2">
        {([["online", "Online", Globe], ["fisico", "Físico", Store]] as const).map(([id, label, Icon]) => (
          <button key={id} type="button" onClick={() => { setTipo(id); setSaved(false); }}
            className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition-colors",
              tipo === id ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>
            <Icon className="size-4" /> {label}
          </button>
        ))}
      </div>

      {tipo === "online" && (
        <div className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label>Alcance / mercado</Label>
            <div className="flex flex-wrap gap-2">
              {MERCADOS.map((m) => (
                <button key={m} type="button" onClick={() => set("mercado", m)}
                  className={cn("rounded-lg border px-3 py-1.5 text-sm transition-colors",
                    p.mercado === m ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>{m}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Metas</Label>
            <Textarea value={p.metas ?? ""} onChange={(e) => set("metas", e.target.value)} placeholder="¿Qué quieres lograr con este negocio?" /></div>
        </div>
      )}

      {tipo === "fisico" && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5"><Label>¿En qué ciudad / dónde?</Label>
              <Input value={p.ciudad ?? ""} onChange={(e) => set("ciudad", e.target.value)} placeholder="Ej. Santiago" /></div>
            <div className="space-y-1.5"><Label>¿Una sucursal o varias?</Label>
              <div className="flex gap-2">
                {(["una", "varias"] as const).map((s) => (
                  <button key={s} type="button" onClick={() => set("sucursales", s)}
                    className={cn("flex-1 rounded-lg border px-3 py-2 text-sm capitalize transition-colors",
                      p.sucursales === s ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>{s}</button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Tamaño del local</Label>
            <div className="flex gap-2">
              {TAMANOS_LOCAL.map((t) => (
                <button key={t} type="button" onClick={() => set("tamano", t)}
                  className={cn("flex-1 rounded-lg border px-3 py-2 text-sm transition-colors",
                    p.tamano === t ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>{t}</button>
              ))}
            </div>
          </div>
          <div className="space-y-1.5"><Label>Colores / temática</Label>
            <Input value={p.colores ?? ""} onChange={(e) => set("colores", e.target.value)} placeholder="Ej. Azul y madera, estilo minimalista" /></div>
          <div className="space-y-1.5"><Label>Metas</Label>
            <Textarea value={p.metas ?? ""} onChange={(e) => set("metas", e.target.value)} placeholder="Plan del negocio, objetivos…" /></div>
        </div>
      )}

      {tipo && (
        <div className="mt-4 flex items-center justify-end gap-2">
          {saved && <span className="text-xs text-success">Guardado ✓</span>}
          <Button type="button" variant="gradient" size="sm" onClick={guardar} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar
          </Button>
        </div>
      )}
    </div>
  );
}

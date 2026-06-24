"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutGrid, Table2, AtSign, MessageCircle, FileSpreadsheet, BarChart3, GripVertical } from "lucide-react";
import type { Influencer } from "@/lib/data/influencers";
import { INFLUENCER_ESTADOS, INFLUENCER_ESTADO_LABEL, igHandle, type InfluencerEstado } from "@/lib/influencers";
import { updateInfluencerStage } from "@/app/(app)/influencers/actions";
import { NewInfluencerDialog } from "./new-influencer-dialog";
import { EmailCampaignDialog } from "./email-campaign-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Brand = { id: string; nombre: string };
type Rate = { agencia: string; escritos: number; respondieron: number; tasa: number }[];
type Tpl = { id: string; nombre: string; contenido: string | null }[];

export function InfluencersView({ influencers, brands, responseRate, dmTemplates }: {
  influencers: Influencer[]; brands: Brand[]; responseRate: Rate; dmTemplates: Tpl;
}) {
  const [mode, setMode] = useState<"kanban" | "tabla">("kanban");
  const [showRate, setShowRate] = useState(false);

  function exportCsv() {
    const rows = [
      ["nombre", "ig", "estado", "whatsapp", "correo", "manager", "empresa"],
      ...influencers.map((i) => [
        i.nombre, igHandle(i.ig_url) ?? "", INFLUENCER_ESTADO_LABEL[i.estado as InfluencerEstado] ?? i.estado,
        i.tiene_whatsapp ? (i.whatsapp ?? "") : "No",
        i.tiene_correo ? (i.correo ?? "") : "No",
        i.tiene_manager ? "Sí" : "Independiente",
        i.empresa ?? "",
      ].map((c) => `"${String(c).replace(/"/g, "''")}"`)),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a"); a.href = url; a.download = "influencers.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5">
          <button onClick={() => setMode("kanban")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", mode === "kanban" ? "bg-accent" : "text-muted-foreground")}><LayoutGrid className="size-4" /> Kanban</button>
          <button onClick={() => setMode("tabla")} className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm", mode === "tabla" ? "bg-accent" : "text-muted-foreground")}><Table2 className="size-4" /> Tabla</button>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowRate((v) => !v)}><BarChart3 className="size-4" /> Tasa de respuesta</Button>
          <Button variant="outline" size="sm" onClick={exportCsv}><FileSpreadsheet className="size-4" /> CSV</Button>
          <a href="/api/pdf/influencers" target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm">PDF</Button></a>
          <EmailCampaignDialog influencers={influencers.map((i) => ({ id: i.id, nombre: i.nombre, correo: i.tiene_correo ? i.correo : null }))} />
          <NewInfluencerDialog brands={brands} />
        </div>
      </div>

      <AnimatePresence>
        {showRate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="mb-3 font-semibold">Tasa de respuesta por agencia</h3>
              {responseRate.length === 0 ? <p className="text-sm text-muted-foreground">Aún no hay datos.</p> : (
                <div className="space-y-2">
                  {responseRate.map((r) => (
                    <div key={r.agencia} className="flex items-center gap-3 text-sm">
                      <span className="w-40 truncate">{r.agencia}</span>
                      <div className="h-2 flex-1 rounded-full bg-secondary"><div className="h-full rounded-full bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))]" style={{ width: `${r.tasa}%` }} /></div>
                      <span className="w-28 text-right text-xs text-muted-foreground">{r.respondieron}/{r.escritos} · {r.tasa}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {dmTemplates.length > 0 && (
        <details className="rounded-xl border border-border bg-card p-4">
          <summary className="cursor-pointer text-sm font-medium">Plantillas de DM ({dmTemplates.length})</summary>
          <div className="mt-3 space-y-2">
            {dmTemplates.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-sm font-medium">{t.nombre}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{t.contenido}</p>
              </div>
            ))}
          </div>
        </details>
      )}

      {mode === "kanban" ? <InfluencerKanban influencers={influencers} /> : <InfluencerTable influencers={influencers} />}
    </div>
  );
}

function waLink(i: Influencer): string | null {
  const num = (i.tiene_whatsapp ? i.whatsapp : i.empresa_whatsapp)?.replace(/\D/g, "");
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(`Hola ${i.nombre}!`)}`;
}

function InfluencerKanban({ influencers }: { influencers: Influencer[] }) {
  const router = useRouter();
  const [items, setItems] = useState(influencers);
  const [dragId, setDragId] = useState<string | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [, start] = useTransition();

  const grouped = useMemo(() => {
    const g: Record<string, Influencer[]> = {};
    for (const e of INFLUENCER_ESTADOS) g[e.id] = [];
    for (const i of items) (g[i.estado] ??= []).push(i);
    return g;
  }, [items]);

  function drop(estado: InfluencerEstado) {
    setOver(null); const id = dragId; setDragId(null);
    if (!id) return;
    const it = items.find((x) => x.id === id);
    if (!it || it.estado === estado) return;
    setItems((p) => p.map((x) => x.id === id ? { ...x, estado } : x));
    start(async () => { await updateInfluencerStage(id, estado); router.refresh(); });
  }

  return (
    <div className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 [-webkit-overflow-scrolling:touch]">
      {INFLUENCER_ESTADOS.map((est) => {
        const list = grouped[est.id] ?? [];
        return (
          <div key={est.id} onDragOver={(e) => { e.preventDefault(); setOver(est.id); }} onDragLeave={() => setOver((c) => c === est.id ? null : c)} onDrop={() => drop(est.id)}
            className={cn("flex w-[82vw] shrink-0 snap-center flex-col rounded-xl border border-border bg-card/40 sm:w-64 sm:snap-start", over === est.id && "border-electric/60 bg-accent/40")}>
            <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
              <span className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full" style={{ background: est.color }} />{est.label}</span>
              <Badge>{list.length}</Badge>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              <AnimatePresence initial={false}>
                {list.map((i) => {
                  const handle = igHandle(i.ig_url); const wa = waLink(i);
                  return (
                    <motion.div key={i.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                      draggable onDragStart={() => setDragId(i.id)} onDragEnd={() => setDragId(null)}
                      className={cn("group cursor-grab rounded-lg border border-border bg-card p-3 active:cursor-grabbing", dragId === i.id && "opacity-50")}>
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium leading-tight">{i.nombre}</p>
                        <GripVertical className="size-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100" />
                      </div>
                      {handle && <p className="text-xs text-muted-foreground">{handle}</p>}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <Badge>{i.tiene_manager ? (i.empresa ?? "Agencia") : "Independiente"}</Badge>
                        {i.tiene_correo && <Badge dot="var(--electric)">correo</Badge>}
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        {i.ig_url && <a href={i.ig_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-muted-foreground hover:text-electric"><AtSign className="size-4" /></a>}
                        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-success"><MessageCircle className="size-4" /></a>}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {list.length === 0 && <div className="rounded-lg border border-dashed border-border/60 px-3 py-6 text-center text-xs text-muted-foreground">Arrastra aquí</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function InfluencerTable({ influencers }: { influencers: Influencer[] }) {
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("");
  const filtered = influencers.filter((i) =>
    (!fEstado || i.estado === fEstado) &&
    (!q.trim() || `${i.nombre} ${i.empresa ?? ""}`.toLowerCase().includes(q.toLowerCase())));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar…" className="h-9 flex-1 min-w-[200px] rounded-lg border border-border bg-background/50 px-3 text-sm" />
        <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="h-9 rounded-lg border border-border bg-background/50 px-3 text-sm">
          <option value="">Todos los estados</option>
          {INFLUENCER_ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr><th className="px-4 py-3">Nombre</th><th className="px-4 py-3">IG</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3">Manager</th><th className="px-4 py-3">Contacto</th></tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} className="border-t border-border hover:bg-accent/40">
                <td className="px-4 py-3 font-medium">{i.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{igHandle(i.ig_url) ?? "—"}</td>
                <td className="px-4 py-3"><Badge>{INFLUENCER_ESTADO_LABEL[i.estado as InfluencerEstado] ?? i.estado}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{i.tiene_manager ? (i.empresa ?? "Sí") : "Independiente"}</td>
                <td className="px-4 py-3 text-muted-foreground">{(i.tiene_whatsapp && i.whatsapp) || (i.tiene_correo && i.correo) || "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">Sin influencers.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

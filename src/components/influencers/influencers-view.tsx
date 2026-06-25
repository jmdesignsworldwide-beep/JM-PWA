"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MoreHorizontal, BarChart3, FileSpreadsheet, FileText, Mail, MessageSquareText, ChevronRight } from "lucide-react";
import type { Influencer } from "@/lib/data/influencers";
import { INFLUENCER_ESTADOS, INFLUENCER_ESTADO_LABEL, igHandle, type InfluencerEstado } from "@/lib/influencers";
import { NewInfluencerDialog } from "./new-influencer-dialog";
import { EmailCampaignDialog } from "./email-campaign-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SocialLinks } from "@/components/ui/social-links";

/** WhatsApp del influencer: el suyo si lo tiene, si no el de la empresa. */
function waNumber(i: Influencer): string | null {
  return (i.tiene_whatsapp ? i.whatsapp : i.empresa_whatsapp) ?? null;
}

type Brand = { id: string; nombre: string };
type Rate = { agencia: string; escritos: number; respondieron: number; tasa: number }[];
type Tpl = { id: string; nombre: string; contenido: string | null }[];

export function InfluencersView({ influencers, brands, responseRate, dmTemplates }: {
  influencers: Influencer[]; brands: Brand[]; responseRate: Rate; dmTemplates: Tpl;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState("");
  const [showRate, setShowRate] = useState(false);
  const [showTpl, setShowTpl] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!moreOpen) return;
    function onDoc(e: MouseEvent) { if (moreRef.current && !moreRef.current.contains(e.target as Node)) setMoreOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [moreOpen]);

  const filtered = influencers.filter((i) =>
    (!fEstado || i.estado === fEstado) &&
    (!q.trim() || `${i.nombre} ${i.empresa ?? ""} ${igHandle(i.ig_url) ?? ""}`.toLowerCase().includes(q.toLowerCase())));

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

  const menuItem = "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent";

  return (
    <div className="space-y-4">
      {/* Barra: esencial visible + Más */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar influencer…"
            className="h-9 w-full rounded-lg border border-border bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="h-9 rounded-lg border border-border bg-background/50 px-3 text-sm">
          <option value="">Todos los estados</option>
          {INFLUENCER_ESTADOS.map((e) => <option key={e.id} value={e.id}>{e.label}</option>)}
        </select>

        <div className="ml-auto flex items-center gap-2">
          <NewInfluencerDialog brands={brands} />
          <div className="relative" ref={moreRef}>
            <Button variant="outline" size="sm" onClick={() => setMoreOpen((v) => !v)}><MoreHorizontal className="size-4" /> Más</Button>
            {moreOpen && (
              <div className="absolute right-0 z-50 mt-2 w-60 rounded-xl border border-border bg-card p-1.5 shadow-xl">
                <button className={menuItem} onClick={() => { setShowRate((v) => !v); setMoreOpen(false); }}><BarChart3 className="size-4 text-muted-foreground" /> Tasa de respuesta</button>
                <button className={menuItem} onClick={() => { setShowTpl((v) => !v); setMoreOpen(false); }}><MessageSquareText className="size-4 text-muted-foreground" /> Plantillas de DM {dmTemplates.length > 0 && `(${dmTemplates.length})`}</button>
                <EmailCampaignDialog
                  influencers={influencers.map((i) => ({ id: i.id, nombre: i.nombre, correo: i.tiene_correo ? i.correo : null }))}
                  trigger={<button className={menuItem} onClick={() => setMoreOpen(false)}><Mail className="size-4 text-muted-foreground" /> Campaña por correo</button>}
                />
                <button className={menuItem} onClick={() => { exportCsv(); setMoreOpen(false); }}><FileSpreadsheet className="size-4 text-muted-foreground" /> Exportar CSV</button>
                <a href="/api/pdf/influencers" target="_blank" rel="noopener noreferrer" className={menuItem} onClick={() => setMoreOpen(false)}><FileText className="size-4 text-muted-foreground" /> PDF</a>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Paneles secundarios (desde "Más") */}
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

      {showTpl && dmTemplates.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 font-semibold">Plantillas de DM</h3>
          <div className="space-y-2">
            {dmTemplates.map((t) => (
              <div key={t.id} className="rounded-lg border border-border bg-background/40 p-3">
                <p className="text-sm font-medium">{t.nombre}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{t.contenido}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabla (única vista) — filas clicables → ficha */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nombre</th><th className="px-4 py-3">IG</th><th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Manager</th><th className="px-4 py-3">Contacto</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => (
              <tr key={i.id} onClick={() => router.push(`/influencers/${i.id}`)}
                className="cursor-pointer border-t border-border transition-colors hover:bg-accent/40">
                <td className="px-4 py-3 font-medium">{i.nombre}</td>
                <td className="px-4 py-3 text-muted-foreground">{igHandle(i.ig_url) ?? "—"}</td>
                <td className="px-4 py-3"><Badge>{INFLUENCER_ESTADO_LABEL[i.estado as InfluencerEstado] ?? i.estado}</Badge></td>
                <td className="px-4 py-3 text-muted-foreground">{i.tiene_manager ? (i.empresa ?? "Sí") : "Independiente"}</td>
                <td className="px-4 py-3"><SocialLinks instagram={i.ig_url} facebook={i.facebook_url} whatsapp={waNumber(i)} waText={`Hola ${i.nombre}!`} size="sm" /></td>
                <td className="px-4 py-3 text-right"><ChevronRight className="ml-auto size-4 text-muted-foreground" /></td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin influencers.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

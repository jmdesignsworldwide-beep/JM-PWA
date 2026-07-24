"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Search, MoreHorizontal, ChevronRight, Pencil } from "lucide-react";
import type { InfluencerRow } from "@/lib/data/influencers";
import { COLAB_ESTADOS, COLAB_ESTADO_LABEL, COLAB_ESTADO_COLOR, igHandle, type ColabEstado } from "@/lib/influencers";
import { updateCollaborationEstado } from "@/app/(app)/influencers/collab-actions";
import { NewInfluencerDialog } from "./new-influencer-dialog";
import { SocialLinks } from "@/components/ui/social-links";

/** WhatsApp del influencer: el suyo si lo tiene, si no el de la empresa. */
function waNumber(i: InfluencerRow): string | null {
  return (i.tiene_whatsapp ? i.whatsapp : i.empresa_whatsapp) ?? null;
}

type Brand = { id: string; nombre: string };

export function InfluencersView({ influencers, brands }: { influencers: InfluencerRow[]; brands: Brand[] }) {
  const [q, setQ] = useState("");

  const filtered = influencers.filter((i) =>
    !q.trim() || `${i.nombre} ${i.empresa ?? ""} ${igHandle(i.ig_url) ?? ""}`.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-4">
      {/* Buscar + Registrar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar influencer…"
            className="h-9 w-full rounded-lg border border-border bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        </div>
        <NewInfluencerDialog brands={brands} />
      </div>

      {/* Lista */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Nombre</th><th className="px-4 py-3">IG</th><th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Manager</th><th className="px-4 py-3">Contacto</th><th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map((i) => <Fila key={i.id} i={i} />)}
            {filtered.length === 0 && <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Sin influencers.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Fila({ i }: { i: InfluencerRow }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const estado = i.ultimoEstado as ColabEstado | null;
  function cambiar(e: ColabEstado) {
    if (!i.ultimaColabId) return;
    setMenuOpen(false);
    start(async () => { await updateCollaborationEstado(i.ultimaColabId!, i.id, e); router.refresh(); });
  }
  const menuItem = "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent";

  return (
    <tr className="border-t border-border transition-colors hover:bg-accent/40">
      <td className="cursor-pointer px-4 py-3 font-medium" onClick={() => router.push(`/influencers/${i.id}`)}>{i.nombre}</td>
      <td className="cursor-pointer px-4 py-3 text-muted-foreground" onClick={() => router.push(`/influencers/${i.id}`)}>{igHandle(i.ig_url) ?? "—"}</td>
      <td className="px-4 py-3">
        {estado ? (
          <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ background: COLAB_ESTADO_COLOR[estado] ?? "var(--muted-foreground)" }}>
            {COLAB_ESTADO_LABEL[estado] ?? estado}{i.colabCount > 1 ? ` · ${i.colabCount}` : ""}
          </span>
        ) : <span className="text-xs text-muted-foreground">Sin colaboración</span>}
      </td>
      <td className="cursor-pointer px-4 py-3 text-muted-foreground" onClick={() => router.push(`/influencers/${i.id}`)}>{i.tiene_manager ? (i.empresa ?? "Sí") : "Independiente"}</td>
      <td className="px-4 py-3"><SocialLinks instagram={i.ig_url} facebook={i.facebook_url} whatsapp={waNumber(i)} waText={`Hola ${i.nombre}!`} size="sm" /></td>
      <td className="px-4 py-3 text-right">
        <div className="relative inline-block" ref={menuRef}>
          <button onClick={() => setMenuOpen((v) => !v)} disabled={pending} className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground" aria-label="Opciones">
            <MoreHorizontal className="size-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 z-50 mt-1 w-52 rounded-xl border border-border bg-card p-1.5 text-left shadow-xl">
              {i.ultimaColabId && (
                <>
                  <p className="px-2.5 pb-1 pt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Cambiar estado</p>
                  {COLAB_ESTADOS.map((s) => (
                    <button key={s.id} className={menuItem} onClick={() => cambiar(s.id)}>
                      <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
                      {estado === s.id && <span className="ml-auto text-xs text-muted-foreground">actual</span>}
                    </button>
                  ))}
                  <div className="my-1 border-t border-border" />
                </>
              )}
              <button className={menuItem} onClick={() => router.push(`/influencers/${i.id}`)}><Pencil className="size-4 text-muted-foreground" /> Abrir ficha</button>
            </div>
          )}
        </div>
        <ChevronRight className="ml-1 inline size-4 cursor-pointer text-muted-foreground" onClick={() => router.push(`/influencers/${i.id}`)} />
      </td>
    </tr>
  );
}

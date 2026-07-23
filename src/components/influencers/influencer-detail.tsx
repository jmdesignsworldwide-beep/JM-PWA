"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Download, Loader2, Gift, Megaphone, AtSign, Users, Plus, MoreHorizontal, Handshake } from "lucide-react";
import type { Influencer, Collaboration } from "@/lib/data/influencers";
import { INFLUENCER_ESTADOS, INFLUENCER_ESTADO_LABEL, COLAB_ESTADOS, COLAB_ESTADO_LABEL, COLAB_ESTADO_COLOR, igHandle, type InfluencerEstado, type ColabEstado, type Plataforma } from "@/lib/influencers";
import { updateInfluencerStage, deleteInfluencer } from "@/app/(app)/influencers/actions";
import { updateCollaborationEstado, deleteCollaboration } from "@/app/(app)/influencers/collab-actions";
import { NewInfluencerDialog } from "./new-influencer-dialog";
import { CollaborationDialog } from "./collaboration-dialog";
import { fechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SocialLinks } from "@/components/ui/social-links";

type Brand = { id: string; nombre: string };
type PromoSimple = { tipo: string; cantidad: number; plataforma: string };

function waNumber(i: Influencer): string | null {
  return (i.tiene_whatsapp ? i.whatsapp : i.empresa_whatsapp) ?? null;
}

export function InfluencerDetail({ influencer, brands, collaborations }: { influencer: Influencer; brands: Brand[]; collaborations: Collaboration[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [delOpen, setDelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plataformas = (Array.isArray(influencer.plataformas) ? influencer.plataformas : []) as unknown as Plataforma[];
  const brandNombre = influencer.brand_id ? brands.find((b) => b.id === influencer.brand_id)?.nombre : null;

  function setEstado(estado: InfluencerEstado) {
    startTransition(async () => { await updateInfluencerStage(influencer.id, estado); router.refresh(); });
  }

  function borrar() {
    setError(null);
    startTransition(async () => {
      const res = await deleteInfluencer(influencer.id);
      if (res?.error) { setError(res.error); return; }
      router.push("/influencers"); router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <Link href="/influencers" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Influencers
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{influencer.nombre}</h1>
            <Badge>{INFLUENCER_ESTADO_LABEL[influencer.estado as InfluencerEstado] ?? influencer.estado}</Badge>
            {influencer.tiene_manager && <Badge dot="var(--electric)">{influencer.empresa ?? "Agencia"}</Badge>}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {[igHandle(influencer.ig_url), influencer.nicho].filter(Boolean).join(" · ") || "Sin datos adicionales"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SocialLinks instagram={influencer.ig_url} facebook={influencer.facebook_url} whatsapp={waNumber(influencer)} waText={`Hola ${influencer.nombre}!`} />
          <a href={`/api/pdf/influencer/${influencer.id}`} target="_blank" rel="noopener noreferrer"><Button variant="outline" size="sm"><Download className="size-4" /> PDF</Button></a>
          <NewInfluencerDialog brands={brands} influencer={influencer} trigger={<Button variant="gradient" size="sm"><Pencil className="size-4" /> Editar</Button>} />
          <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/10" onClick={() => setDelOpen(true)}><Trash2 className="size-4" /> Borrar</Button>
        </div>
      </div>

      {/* Estado del pipeline (outreach) */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card p-3">
        <span className="text-sm text-muted-foreground">Estado:</span>
        {INFLUENCER_ESTADOS.map((e) => (
          <button key={e.id} onClick={() => setEstado(e.id)} disabled={pending}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${influencer.estado === e.id ? "border-transparent text-white" : "border-border text-muted-foreground hover:bg-accent/40"}`}
            style={influencer.estado === e.id ? { background: e.color } : undefined}>
            <span className="size-2 rounded-full" style={{ background: influencer.estado === e.id ? "rgba(255,255,255,.9)" : e.color }} /> {e.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Plataformas */}
        <Card icon={<AtSign className="size-4 text-electric" />} title="Plataformas">
          {plataformas.length === 0 ? <Empty text="Sin plataformas." /> : (
            <ul className="space-y-2">
              {plataformas.map((p, i) => (
                <li key={i} className="flex items-center justify-between rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                  <span className="font-medium">{p.red}</span>
                  <span className="text-muted-foreground">{p.handle || "—"}{p.seguidores ? ` · ${p.seguidores} seg.` : ""}{p.engagement ? ` · ${p.engagement}% eng.` : ""}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Contacto */}
        <Card icon={<Users className="size-4 text-electric" />} title="Contacto">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Campo label="WhatsApp" value={influencer.tiene_whatsapp ? influencer.whatsapp : null} />
            <Campo label="Correo" value={influencer.tiene_correo ? influencer.correo : null} />
            <Campo label="Manager" value={influencer.tiene_manager ? (influencer.manager_nombre ?? "Sí") : "Independiente"} />
            <Campo label="Empresa" value={influencer.empresa} />
            <Campo label="WhatsApp empresa" value={influencer.empresa_whatsapp} />
            <Campo label="Marca" value={brandNombre} />
          </dl>
        </Card>
      </div>

      {/* Colaboraciones — un influencer puede tener varias */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 font-semibold"><Handshake className="size-4 text-electric" /> Colaboraciones {collaborations.length > 0 && <span className="text-sm font-normal text-muted-foreground">({collaborations.length})</span>}</h3>
          <CollaborationDialog influencerId={influencer.id} brands={brands} trigger={<Button variant="gradient" size="sm"><Plus className="size-4" /> Nueva colaboración</Button>} />
        </div>
        {collaborations.length === 0 ? (
          <Empty text="Aún no hay colaboraciones. Crea la primera con el botón de arriba." />
        ) : (
          <ul className="space-y-3">
            {collaborations.map((c) => (
              <CollabRow key={c.id} collab={c} influencerId={influencer.id} brands={brands} brandName={c.brand_id ? brands.find((b) => b.id === c.brand_id)?.nombre ?? null : null} />
            ))}
          </ul>
        )}
      </div>

      {influencer.notas && (
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{influencer.notas}</p>
        </div>
      )}

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Confirmar borrado */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)} title="Borrar influencer" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm">Vas a borrar a <strong>{influencer.nombre}</strong> y <strong>todas sus colaboraciones</strong>. Esta acción <strong>no se puede deshacer</strong>.</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setDelOpen(false)}>Cancelar</Button>
            <Button type="button" variant="outline" className="text-destructive hover:bg-destructive/10" onClick={borrar} disabled={pending}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} Sí, borrar
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function CollabRow({ collab, influencerId, brands, brandName }: { collab: Collaboration; influencerId: string; brands: Brand[]; brandName: string | null }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onDoc(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const estado = collab.estado as ColabEstado;
  const promos = (Array.isArray(collab.promos) ? collab.promos : []) as unknown as PromoSimple[];

  function cambiarEstado(e: ColabEstado) {
    setMenuOpen(false);
    startTransition(async () => { await updateCollaborationEstado(collab.id, influencerId, e); router.refresh(); });
  }
  function borrar() {
    startTransition(async () => { await deleteCollaboration(collab.id, influencerId); router.refresh(); });
  }

  const menuItem = "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent";

  return (
    <li className="rounded-xl border border-border bg-background/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium text-white" style={{ background: COLAB_ESTADO_COLOR[estado] ?? "var(--muted-foreground)" }}>
              {COLAB_ESTADO_LABEL[estado] ?? estado}
            </span>
            {brandName && <Badge dot="var(--electric)">{brandName}</Badge>}
            <span className="text-xs text-muted-foreground">{fechaCorta(collab.created_at)}</span>
          </div>
        </div>
        <div className="relative shrink-0" ref={menuRef}>
          <Button variant="ghost" size="icon" onClick={() => setMenuOpen((v) => !v)} disabled={pending} aria-label="Opciones"><MoreHorizontal className="size-4" /></Button>
          {menuOpen && (
            <div className="absolute right-0 z-50 mt-1 w-52 rounded-xl border border-border bg-card p-1.5 shadow-xl">
              <p className="px-2.5 pb-1 pt-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">Cambiar estado</p>
              {COLAB_ESTADOS.map((s) => (
                <button key={s.id} className={menuItem} onClick={() => cambiarEstado(s.id)}>
                  <span className="size-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
                  {estado === s.id && <span className="ml-auto text-xs text-muted-foreground">actual</span>}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
              <CollaborationDialog influencerId={influencerId} brands={brands} collab={collab}
                trigger={<button className={menuItem} onClick={() => setMenuOpen(false)}><Pencil className="size-4 text-muted-foreground" /> Editar</button>} />
              <button className={`${menuItem} text-destructive`} onClick={() => { setMenuOpen(false); setConfirmDel(true); }}><Trash2 className="size-4" /> Borrar</button>
            </div>
          )}
        </div>
      </div>

      {/* Mi aporte */}
      {(collab.doy_tipo || collab.doy_desc) && (
        <div className="mt-3 flex items-start gap-2 text-sm">
          <Gift className="mt-0.5 size-4 shrink-0 text-electric" />
          <div><span className="font-medium">{collab.doy_tipo ?? "Mi aporte"}</span>{collab.doy_desc && <p className="text-xs text-muted-foreground">{collab.doy_desc}</p>}</div>
        </div>
      )}

      {/* Aporte del influencer */}
      {promos.length > 0 && (
        <div className="mt-2 flex items-start gap-2 text-sm">
          <Megaphone className="mt-0.5 size-4 shrink-0 text-brand-purple" />
          <div className="flex flex-wrap gap-1.5">
            {promos.map((p, i) => (
              <span key={i} className="rounded-md border border-border bg-card px-2 py-0.5 text-xs text-muted-foreground">{p.cantidad}× {p.tipo} · {p.plataforma}</span>
            ))}
          </div>
        </div>
      )}

      {collab.notas && <p className="mt-2 whitespace-pre-wrap text-xs text-muted-foreground">{collab.notas}</p>}

      {confirmDel && (
        <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-2.5">
          <span className="text-sm text-destructive">¿Borrar esta colaboración?</span>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Cancelar</Button>
            <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={borrar} disabled={pending}>{pending && <Loader2 className="size-4 animate-spin" />} Sí, borrar</Button>
          </div>
        </div>
      )}
    </li>
  );
}

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">{icon} {title}</h3>
      {children}
    </div>
  );
}
function Campo({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-3 text-sm text-muted-foreground">{text}</p>;
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Pencil, Trash2, Download, Loader2, Gift, Megaphone, AtSign, Users, CalendarClock } from "lucide-react";
import type { Influencer } from "@/lib/data/influencers";
import { INFLUENCER_ESTADOS, INFLUENCER_ESTADO_LABEL, ESTADO_TRATO_LABEL, igHandle, type InfluencerEstado, type Plataforma, type Promo } from "@/lib/influencers";
import { updateInfluencerStage, deleteInfluencer } from "@/app/(app)/influencers/actions";
import { NewInfluencerDialog } from "./new-influencer-dialog";
import { money, fechaCorta } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { SocialLinks } from "@/components/ui/social-links";

type Brand = { id: string; nombre: string };

function waNumber(i: Influencer): string | null {
  return (i.tiene_whatsapp ? i.whatsapp : i.empresa_whatsapp) ?? null;
}

export function InfluencerDetail({ influencer, brands }: { influencer: Influencer; brands: Brand[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [delOpen, setDelOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const plataformas = (Array.isArray(influencer.plataformas) ? influencer.plataformas : []) as unknown as Plataforma[];
  const promos = (Array.isArray(influencer.promos) ? influencer.promos : []) as unknown as Promo[];
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

      {/* Estado del pipeline */}
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

        {/* Mi aporte */}
        <Card icon={<Gift className="size-4 text-electric" />} title="Mi aporte">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Campo label="Qué construyo" value={influencer.doy_tipo} />
            <Campo label="Valor" value={influencer.doy_valor != null ? money(influencer.doy_valor, influencer.doy_moneda) : null} />
            <Campo label="Fecha de entrega" value={influencer.doy_fecha_entrega ? fechaCorta(influencer.doy_fecha_entrega) : null} />
            <Campo label="Descripción" value={influencer.doy_desc} full />
          </dl>
          {influencer.doy_fecha_entrega && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-electric"><CalendarClock className="size-3.5" /> Entrega agendada en el Calendario.</p>
          )}
        </Card>

        {/* Aporte del influencer */}
        <Card icon={<Megaphone className="size-4 text-brand-purple" />} title="Aporte del influencer">
          {promos.length === 0 ? <Empty text="Sin promociones acordadas." /> : (
            <ul className="space-y-2">
              {promos.map((p, i) => (
                <li key={i} className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{p.cantidad}× {p.tipo}</span>
                    {p.valor > 0 && <span className="text-muted-foreground">{money(p.valor, p.moneda)}</span>}
                  </div>
                  <p className="text-xs text-muted-foreground">{[p.plataforma, p.fecha ? fechaCorta(p.fecha) : null].filter(Boolean).join(" · ")}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Estado del trato + fechas + notas */}
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span><span className="text-muted-foreground">Estado del trato:</span> <strong>{ESTADO_TRATO_LABEL[influencer.estado_trato as keyof typeof ESTADO_TRATO_LABEL] ?? influencer.estado_trato}</strong></span>
          {influencer.fecha_escrito && <span className="text-muted-foreground">Escrito: {fechaCorta(influencer.fecha_escrito)}</span>}
          {influencer.fecha_respondio && <span className="text-muted-foreground">Respondió: {fechaCorta(influencer.fecha_respondio)}</span>}
          {influencer.fecha_acuerdo && <span className="text-muted-foreground">Acuerdo: {fechaCorta(influencer.fecha_acuerdo)}</span>}
        </div>
        {influencer.notas && <p className="mt-3 whitespace-pre-wrap border-t border-border pt-3 text-sm text-muted-foreground">{influencer.notas}</p>}
      </div>

      {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

      {/* Confirmar borrado */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)} title="Borrar colaboración" className="max-w-md">
        <div className="space-y-4">
          <p className="text-sm">Vas a borrar a <strong>{influencer.nombre}</strong> y su colaboración. Esta acción <strong>no se puede deshacer</strong>. Si tenía una entrega agendada, también se quita del calendario.</p>
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

function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-3 flex items-center gap-2 font-semibold">{icon} {title}</h3>
      {children}
    </div>
  );
}
function Campo({ label, value, full }: { label: string; value: string | null | undefined; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={full ? "col-span-2" : ""}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 break-words font-medium">{value}</dd>
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return <p className="py-3 text-sm text-muted-foreground">{text}</p>;
}

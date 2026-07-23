"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Handshake, Gift, Megaphone } from "lucide-react";
import { createCollaboration, updateCollaboration, type PromoSimple } from "@/app/(app)/influencers/collab-actions";
import { REDES, PROMO_TIPOS, COLAB_ESTADOS, type ColabEstado } from "@/lib/influencers";
import type { Collaboration } from "@/lib/data/influencers";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

type Brand = { id: string; nombre: string };
const DOY_TIPOS = ["Sitio web", "App móvil", "Sistema / Software", "Branding / Diseño", "Otro"];
const emptyPromo = (): PromoSimple => ({ tipo: "Reel / Video", cantidad: 1, plataforma: "Instagram" });

export function CollaborationDialog({
  influencerId, brands, collab, trigger,
}: {
  influencerId: string; brands: Brand[]; collab?: Collaboration; trigger: React.ReactNode;
}) {
  const router = useRouter();
  const isEdit = !!collab;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [brandId, setBrandId] = useState("");
  const [estado, setEstado] = useState<ColabEstado>("acordado");
  const [doyTipo, setDoyTipo] = useState("Sitio web");
  const [doyDesc, setDoyDesc] = useState("");
  const [promos, setPromos] = useState<PromoSimple[]>([emptyPromo()]);
  const [notas, setNotas] = useState("");

  function reinit() {
    if (collab) {
      setBrandId(collab.brand_id ?? "");
      setEstado((collab.estado as ColabEstado) ?? "acordado");
      setDoyTipo(collab.doy_tipo ?? "Sitio web");
      setDoyDesc(collab.doy_desc ?? "");
      const proms = Array.isArray(collab.promos) ? (collab.promos as unknown as PromoSimple[]) : [];
      setPromos(proms.length ? proms.map((p) => ({ tipo: p.tipo, cantidad: p.cantidad ?? 1, plataforma: p.plataforma ?? "Instagram" })) : [emptyPromo()]);
      setNotas(collab.notas ?? "");
    } else {
      setBrandId(""); setEstado("acordado"); setDoyTipo("Sitio web"); setDoyDesc(""); setPromos([emptyPromo()]); setNotas("");
    }
    setError(null);
  }

  function setProm(i: number, p: Partial<PromoSimple>) { setPromos((a) => a.map((x, idx) => idx === i ? { ...x, ...p } : x)); }

  function submit() {
    setError(null);
    startTransition(async () => {
      const payload = {
        brand_id: brandId || null,
        estado,
        doy_tipo: doyTipo,
        doy_desc: doyDesc.trim() || null,
        promos: promos.filter((p) => p.tipo && p.cantidad > 0),
        notas: notas.trim() || null,
      };
      const res = isEdit
        ? await updateCollaboration(collab!.id, influencerId, payload)
        : await createCollaboration(influencerId, payload);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <span onClick={() => { reinit(); setOpen(true); }}>{trigger}</span>
      <Dialog open={open} onClose={() => setOpen(false)} title={isEdit ? "Editar colaboración" : "Nueva colaboración"} className="max-w-2xl">
        <div className="space-y-5">
          {/* Marca + estado */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="¿Para cuál marca?">
              <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">— Elegir marca —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </Select>
            </Field>
            <Field label="Estado">
              <Select value={estado} onChange={(e) => setEstado(e.target.value as ColabEstado)}>
                {COLAB_ESTADOS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
              </Select>
            </Field>
          </div>

          {/* Mi aporte — sin valor/moneda/fecha */}
          <Section icon={<Gift className="size-4 text-electric" />} title="Mi aporte">
            <Field label="Qué construyo / entrego">
              <Select value={doyTipo} onChange={(e) => setDoyTipo(e.target.value)}>{DOY_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
            </Field>
            <Field label="Descripción"><Textarea rows={2} value={doyDesc} onChange={(e) => setDoyDesc(e.target.value)} placeholder="Alcance de lo que entregas…" /></Field>
          </Section>

          {/* Aporte del influencer — sin valor/moneda/fecha */}
          <Section icon={<Megaphone className="size-4 text-brand-purple" />} title="Aporte del influencer">
            <div className="space-y-3">
              {promos.map((p, i) => (
                <div key={i} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Promoción {i + 1}</span>
                    {promos.length > 1 && <button type="button" onClick={() => setPromos((a) => a.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <Field label="Tipo"><Select value={p.tipo} onChange={(e) => setProm(i, { tipo: e.target.value })}>{PROMO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
                    <Field label="Cantidad"><Input type="number" min="0" value={p.cantidad} onChange={(e) => setProm(i, { cantidad: Number(e.target.value) })} /></Field>
                    <Field label="Plataforma"><Select value={p.plataforma} onChange={(e) => setProm(i, { plataforma: e.target.value })}>{REDES.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setPromos((a) => [...a, emptyPromo()])}><Plus className="size-4" /> Agregar promoción</Button>
            </div>
          </Section>

          <Field label="Notas"><Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></Field>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} variant="gradient" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Handshake className="size-4" />} {isEdit ? "Guardar cambios" : "Guardar colaboración"}</Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">{icon} {title}</h3>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

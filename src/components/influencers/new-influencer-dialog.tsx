"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, UserPlus, AtSign } from "lucide-react";
import { createInfluencer, updateInfluencer } from "@/app/(app)/influencers/actions";
import type { Influencer } from "@/lib/data/influencers";
import { REDES, type Plataforma } from "@/lib/influencers";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Brand = { id: string; nombre: string };
const emptyPlat = (): Plataforma => ({ red: "Instagram", handle: "", seguidores: "", engagement: "" });

/**
 * REGISTRO del influencer (quién es): identidad, redes y contacto. El trato
 * (colaboración) ya no vive aquí — se crea aparte, en la ficha, con
 * CollaborationDialog. Un influencer puede tener varias colaboraciones.
 */
export function NewInfluencerDialog({ brands, influencer, trigger, onCreated }: {
  brands: Brand[]; influencer?: Influencer; trigger?: React.ReactNode; onCreated?: (id: string) => void;
}) {
  const router = useRouter();
  const isEdit = !!influencer;
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [nombre, setNombre] = useState("");
  const [nicho, setNicho] = useState("");
  const [plataformas, setPlataformas] = useState<Plataforma[]>([emptyPlat()]);
  const [tieneWa, setTieneWa] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [tieneCorreo, setTieneCorreo] = useState(false);
  const [correo, setCorreo] = useState("");
  const [facebook, setFacebook] = useState("");
  const [tieneManager, setTieneManager] = useState(false);
  const [empresa, setEmpresa] = useState("");
  const [managerNombre, setManagerNombre] = useState("");
  const [brandId, setBrandId] = useState("");
  const [notas, setNotas] = useState("");

  /** Carga el estado desde el influencer (edición) o lo limpia (nuevo). */
  function reinit() {
    if (!influencer) {
      setNombre(""); setNicho(""); setPlataformas([emptyPlat()]); setTieneWa(false); setWhatsapp("");
      setTieneCorreo(false); setCorreo(""); setFacebook(""); setTieneManager(false); setEmpresa(""); setManagerNombre("");
      setBrandId(""); setNotas(""); setError(null);
      return;
    }
    setNombre(influencer.nombre ?? "");
    setNicho(influencer.nicho ?? "");
    const plats = Array.isArray(influencer.plataformas) ? (influencer.plataformas as unknown as Plataforma[]) : [];
    setPlataformas(plats.length ? plats : [emptyPlat()]);
    setTieneWa(!!influencer.tiene_whatsapp); setWhatsapp(influencer.whatsapp ?? "");
    setTieneCorreo(!!influencer.tiene_correo); setCorreo(influencer.correo ?? "");
    setFacebook(influencer.facebook_url ?? "");
    setTieneManager(!!influencer.tiene_manager); setEmpresa(influencer.empresa ?? ""); setManagerNombre(influencer.manager_nombre ?? "");
    setBrandId(influencer.brand_id ?? "");
    setNotas(influencer.notas ?? "");
    setError(null);
  }

  function setPlat(i: number, p: Partial<Plataforma>) { setPlataformas((a) => a.map((x, idx) => idx === i ? { ...x, ...p } : x)); }

  function submit() {
    setError(null);
    if (!nombre.trim()) { setError("El nombre del influencer es obligatorio."); return; }
    startTransition(async () => {
      const handlePrincipal = plataformas.find((p) => p.handle.trim())?.handle.trim() || null;
      const payload = {
        nombre: nombre.trim(),
        nicho: nicho.trim() || null,
        ig_handle: handlePrincipal,
        plataformas: plataformas.filter((p) => p.handle.trim() || p.seguidores.trim()),
        tiene_whatsapp: tieneWa, whatsapp: tieneWa ? (whatsapp.trim() || null) : null,
        tiene_correo: tieneCorreo, correo: tieneCorreo ? (correo.trim() || null) : null,
        facebook_url: facebook.trim() || null,
        tiene_manager: tieneManager,
        empresa: tieneManager ? (empresa.trim() || null) : null,
        manager_nombre: tieneManager ? (managerNombre.trim() || null) : null,
        brand_id: brandId || null,
        notas: notas.trim() || null,
      };
      if (isEdit) {
        const res = await updateInfluencer(influencer!.id, payload);
        if (res?.error) { setError(res.error); return; }
        setOpen(false); router.refresh();
        return;
      }
      const res = await createInfluencer(payload);
      if (res?.error) { setError(res.error); return; }
      setOpen(false);
      router.refresh();
      if (res.id && onCreated) onCreated(res.id);
    });
  }

  return (
    <>
      {trigger
        ? <span onClick={() => { reinit(); setOpen(true); }}>{trigger}</span>
        : <Button variant="gradient" onClick={() => { reinit(); setOpen(true); }}><UserPlus className="size-4" /> Registrar influencer</Button>}
      <Dialog open={open} onClose={() => setOpen(false)} title={isEdit ? "Editar influencer" : "Registrar influencer"} className="max-w-3xl">
        <div className="space-y-5">
          <Section icon={<AtSign className="size-4 text-electric" />} title="Influencer">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Nombre *"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" /></Field>
              <Field label="Nicho"><Input value={nicho} onChange={(e) => setNicho(e.target.value)} placeholder="Moda, fitness, tech…" /></Field>
            </div>
            <Label className="mt-1 block">Plataformas</Label>
            <div className="space-y-3">
              {plataformas.map((p, i) => (
                <div key={i} className="rounded-lg border border-border bg-background/40 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Plataforma {i + 1}</span>
                    {plataformas.length > 1 && <button type="button" onClick={() => setPlataformas((a) => a.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive" aria-label="Quitar plataforma"><Trash2 className="size-4" /></button>}
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <Field label="Red"><Select value={p.red} onChange={(e) => setPlat(i, { red: e.target.value })}>{REDES.map((r) => <option key={r} value={r}>{r}</option>)}</Select></Field>
                    <Field label="Usuario / handle"><Input value={p.handle} onChange={(e) => setPlat(i, { handle: e.target.value })} placeholder="@usuario" /></Field>
                    <Field label="Seguidores"><Input value={p.seguidores} onChange={(e) => setPlat(i, { seguidores: e.target.value })} placeholder="Ej. 12500" inputMode="numeric" /></Field>
                    <Field label="Engagement %"><Input value={p.engagement} onChange={(e) => setPlat(i, { engagement: e.target.value })} placeholder="Ej. 3.5" inputMode="decimal" /></Field>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={() => setPlataformas((a) => [...a, emptyPlat()])}><Plus className="size-4" /> Agregar plataforma</Button>
            </div>
            <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-border p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm"><Switch checked={tieneWa} onCheckedChange={setTieneWa} /> WhatsApp</label>
                {tieneWa && <Input type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="1 809 000 0000" />}
                <label className="flex items-center gap-2 text-sm"><Switch checked={tieneCorreo} onCheckedChange={setTieneCorreo} /> Correo</label>
                {tieneCorreo && <Input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />}
                <label className="flex items-center gap-2 pt-1 text-sm text-muted-foreground">Facebook (opcional)</label>
                <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="usuario o link" />
              </div>
              <div className="rounded-lg border border-border p-3 space-y-2">
                <label className="flex items-center gap-2 text-sm"><Switch checked={tieneManager} onCheckedChange={setTieneManager} /> Tiene manager / agencia</label>
                {tieneManager ? (
                  <>
                    <Input value={empresa} onChange={(e) => setEmpresa(e.target.value)} placeholder="Agencia / empresa" />
                    <Input value={managerNombre} onChange={(e) => setManagerNombre(e.target.value)} placeholder="Nombre del manager" />
                  </>
                ) : <p className="text-xs text-muted-foreground">Independiente</p>}
              </div>
            </div>
          </Section>

          <Field label="¿Para cuál de tus marcas? (opcional)">
            <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
              <option value="">— Elegir marca —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
            </Select>
          </Field>
          <Field label="Notas"><Input value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Notas del influencer (opcional)" /></Field>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} variant="gradient" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />} {isEdit ? "Guardar cambios" : "Registrar influencer"}</Button>
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

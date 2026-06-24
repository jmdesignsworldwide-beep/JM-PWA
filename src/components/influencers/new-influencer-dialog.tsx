"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2, Trash2, Download, MessageCircle, Handshake, Gift, Megaphone, AtSign } from "lucide-react";
import { createInfluencer } from "@/app/(app)/influencers/actions";
import { REDES, PROMO_TIPOS, ESTADOS_TRATO, type Plataforma, type Promo } from "@/lib/influencers";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

type Brand = { id: string; nombre: string };
const DOY_TIPOS = ["Sitio web", "App móvil", "Sistema / Software", "Branding / Diseño", "Otro"];

const emptyPlat = (): Plataforma => ({ red: "Instagram", handle: "", seguidores: "", engagement: "" });
const emptyPromo = (): Promo => ({ tipo: "Reel / Video", cantidad: 1, plataforma: "Instagram", valor: 0, moneda: "DOP", fecha: "" });

export function NewInfluencerDialog({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [creado, setCreado] = useState<{ id: string; nombre: string; whatsapp: string | null } | null>(null);

  // Influencer
  const [nombre, setNombre] = useState("");
  const [nicho, setNicho] = useState("");
  const [plataformas, setPlataformas] = useState<Plataforma[]>([emptyPlat()]);
  const [tieneWa, setTieneWa] = useState(false);
  const [whatsapp, setWhatsapp] = useState("");
  const [tieneCorreo, setTieneCorreo] = useState(false);
  const [correo, setCorreo] = useState("");
  const [tieneManager, setTieneManager] = useState(false);
  const [empresa, setEmpresa] = useState("");
  const [managerNombre, setManagerNombre] = useState("");
  const [brandId, setBrandId] = useState("");
  // Lo que doy
  const [doyTipo, setDoyTipo] = useState("Sitio web");
  const [doyDesc, setDoyDesc] = useState("");
  const [doyValor, setDoyValor] = useState<number | "">("");
  const [doyMoneda, setDoyMoneda] = useState<"DOP" | "USD">("DOP");
  const [doyEntrega, setDoyEntrega] = useState("");
  // Lo que dan
  const [promos, setPromos] = useState<Promo[]>([emptyPromo()]);
  const [estadoTrato, setEstadoTrato] = useState("propuesto");
  const [notas, setNotas] = useState("");

  function reset() {
    setNombre(""); setNicho(""); setPlataformas([emptyPlat()]); setTieneWa(false); setWhatsapp("");
    setTieneCorreo(false); setCorreo(""); setTieneManager(false); setEmpresa(""); setManagerNombre("");
    setBrandId(""); setDoyTipo("Sitio web"); setDoyDesc(""); setDoyValor(""); setDoyMoneda("DOP");
    setDoyEntrega(""); setPromos([emptyPromo()]); setEstadoTrato("propuesto"); setNotas(""); setError(null); setCreado(null);
  }

  function setPlat(i: number, p: Partial<Plataforma>) { setPlataformas((a) => a.map((x, idx) => idx === i ? { ...x, ...p } : x)); }
  function setProm(i: number, p: Partial<Promo>) { setPromos((a) => a.map((x, idx) => idx === i ? { ...x, ...p } : x)); }

  function submit() {
    setError(null);
    if (!nombre.trim()) { setError("El nombre del influencer es obligatorio."); return; }
    startTransition(async () => {
      const handlePrincipal = plataformas.find((p) => p.handle.trim())?.handle.trim() || null;
      const res = await createInfluencer({
        nombre: nombre.trim(),
        nicho: nicho.trim() || null,
        ig_handle: handlePrincipal,
        plataformas: plataformas.filter((p) => p.handle.trim() || p.seguidores.trim()),
        tiene_whatsapp: tieneWa, whatsapp: tieneWa ? (whatsapp.trim() || null) : null,
        tiene_correo: tieneCorreo, correo: tieneCorreo ? (correo.trim() || null) : null,
        tiene_manager: tieneManager,
        empresa: tieneManager ? (empresa.trim() || null) : null,
        manager_nombre: tieneManager ? (managerNombre.trim() || null) : null,
        brand_id: brandId || null,
        doy_tipo: doyTipo, doy_desc: doyDesc.trim() || null,
        doy_valor: doyValor === "" ? null : Number(doyValor), doy_moneda: doyMoneda,
        doy_fecha_entrega: doyEntrega || null,
        promos: promos.filter((p) => p.tipo && (p.cantidad > 0 || p.valor > 0 || p.fecha)),
        estado_trato: estadoTrato as "propuesto",
        notas: notas.trim() || null,
      });
      if (res?.error) { setError(res.error); return; }
      setCreado({ id: res.id!, nombre: nombre.trim(), whatsapp: tieneWa ? whatsapp.trim() : null });
      router.refresh();
    });
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const waNum = (creado?.whatsapp ?? "").replace(/\D/g, "");
  const waText = creado
    ? `¡Hola ${creado.nombre}! 🤝 Te comparto el acuerdo de colaboración con JM Designs.\n\n📄 ${origin}/api/pdf/influencer/${creado.id}\n\n¡Hagámoslo realidad!`
    : "";

  return (
    <>
      <Button variant="gradient" onClick={() => { reset(); setOpen(true); }}><Plus className="size-4" /> Nueva colaboración</Button>
      <Dialog open={open} onClose={() => setOpen(false)} title={creado ? "Colaboración guardada" : "Nueva colaboración con influencer"} className="max-w-3xl">
        {creado ? (
          <div className="space-y-3">
            <p className="text-sm text-success">✅ Guardada. Genera el acuerdo branded y compártelo.</p>
            <div className="flex flex-wrap gap-2">
              <a href={`/api/pdf/influencer/${creado.id}`} target="_blank" rel="noopener noreferrer">
                <Button variant="gradient"><Download className="size-4" /> PDF de acuerdo</Button>
              </a>
              {waNum && (
                <a href={`https://wa.me/${waNum}?text=${encodeURIComponent(waText)}`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="text-success"><MessageCircle className="size-4" /> Enviar por WhatsApp</Button>
                </a>
              )}
              <Button variant="ghost" onClick={() => { setOpen(false); }}>Cerrar</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Influencer */}
            <Section icon={<AtSign className="size-4 text-electric" />} title="Influencer">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Nombre *"><Input value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" /></Field>
                <Field label="Nicho"><Input value={nicho} onChange={(e) => setNicho(e.target.value)} placeholder="Moda, fitness, tech…" /></Field>
              </div>
              <Label className="mt-1 block text-xs text-muted-foreground">Plataformas</Label>
              <div className="space-y-2">
                {plataformas.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                    <Select className="sm:col-span-3" value={p.red} onChange={(e) => setPlat(i, { red: e.target.value })}>
                      {REDES.map((r) => <option key={r} value={r}>{r}</option>)}
                    </Select>
                    <Input className="sm:col-span-3" value={p.handle} onChange={(e) => setPlat(i, { handle: e.target.value })} placeholder="@handle" />
                    <Input className="sm:col-span-3" value={p.seguidores} onChange={(e) => setPlat(i, { seguidores: e.target.value })} placeholder="Seguidores" inputMode="numeric" />
                    <Input className="sm:col-span-2" value={p.engagement} onChange={(e) => setPlat(i, { engagement: e.target.value })} placeholder="Eng. %" />
                    <div className="flex items-center sm:col-span-1">
                      {plataformas.length > 1 && <button type="button" onClick={() => setPlataformas((a) => a.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>}
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

            {/* Marca */}
            <Field label="¿Para cuál de tus marcas?">
              <Select value={brandId} onChange={(e) => setBrandId(e.target.value)}>
                <option value="">— Elegir marca —</option>
                {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </Select>
            </Field>

            {/* Lo que doy */}
            <Section icon={<Gift className="size-4 text-electric" />} title="Lo que YO doy">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="Qué construyo"><Select value={doyTipo} onChange={(e) => setDoyTipo(e.target.value)}>{DOY_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Select></Field>
                <Field label="Fecha de entrega"><Input type="date" value={doyEntrega} onChange={(e) => setDoyEntrega(e.target.value)} /></Field>
              </div>
              <Field label="Descripción"><Textarea rows={2} value={doyDesc} onChange={(e) => setDoyDesc(e.target.value)} placeholder="Alcance de lo que entregas…" /></Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Valor estimado"><Input type="number" min="0" step="0.01" value={doyValor} onChange={(e) => setDoyValor(e.target.value === "" ? "" : Number(e.target.value))} placeholder="0.00" /></Field>
                <Field label="Moneda"><Select value={doyMoneda} onChange={(e) => setDoyMoneda(e.target.value as "DOP" | "USD")}><option value="DOP">DOP</option><option value="USD">USD</option></Select></Field>
              </div>
            </Section>

            {/* Lo que dan */}
            <Section icon={<Megaphone className="size-4 text-brand-purple" />} title="Lo que ELLOS dan (promoción)">
              <div className="space-y-2">
                {promos.map((p, i) => (
                  <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-12">
                    <Select className="sm:col-span-3" value={p.tipo} onChange={(e) => setProm(i, { tipo: e.target.value })}>{PROMO_TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}</Select>
                    <Input className="sm:col-span-1" type="number" min="0" value={p.cantidad} onChange={(e) => setProm(i, { cantidad: Number(e.target.value) })} placeholder="Cant." />
                    <Select className="sm:col-span-2" value={p.plataforma} onChange={(e) => setProm(i, { plataforma: e.target.value })}>{REDES.map((r) => <option key={r} value={r}>{r}</option>)}</Select>
                    <Input className="sm:col-span-2" type="number" min="0" step="0.01" value={p.valor} onChange={(e) => setProm(i, { valor: Number(e.target.value) })} placeholder="Valor" />
                    <Select className="sm:col-span-1" value={p.moneda} onChange={(e) => setProm(i, { moneda: e.target.value as "DOP" | "USD" })}><option value="DOP">DOP</option><option value="USD">USD</option></Select>
                    <Input className="sm:col-span-2" type="date" value={p.fecha} onChange={(e) => setProm(i, { fecha: e.target.value })} title="Fecha de publicación" />
                    <div className="flex items-center sm:col-span-1">
                      {promos.length > 1 && <button type="button" onClick={() => setPromos((a) => a.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setPromos((a) => [...a, emptyPromo()])}><Plus className="size-4" /> Agregar promoción</Button>
                <p className="text-xs text-muted-foreground">La fecha de cada publicación arma el timeline vs. tu fecha de entrega.</p>
              </div>
            </Section>

            {/* Estado + notas */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Estado del trato"><Select value={estadoTrato} onChange={(e) => setEstadoTrato(e.target.value)}>{ESTADOS_TRATO.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</Select></Field>
            </div>
            <Field label="Notas"><Textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} /></Field>

            {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} variant="gradient" disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : <Handshake className="size-4" />} Guardar colaboración</Button>
            </div>
          </div>
        )}
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

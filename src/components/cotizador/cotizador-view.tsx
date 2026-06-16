"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles, Loader2, Code2, Package, Plus, Trash2, Save, Download,
  MessageCircle, ArrowRightCircle, Check, Wand2,
} from "lucide-react";
import { saveQuote, convertQuoteToOrder, type SaveQuoteInput } from "@/app/(app)/cotizador/actions";
import {
  TIPOS_SOLUCION_COT, INDUSTRIAS_COT, MODULO_LABEL, RELEVANCIA, modulosOrdenados,
} from "@/lib/cotizador";
import { ITBIS_RATE, PRINT_CATEGORIAS } from "@/lib/pedidos";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { cn } from "@/lib/utils";

type Client = {
  id: string; nombre: string; apellido: string | null;
  whatsapp: string | null; telefono: string | null; brand_id: string | null;
};
type PrintProduct = { id: string; nombre: string; categoria: string | null; precio_base: number; moneda: string };
type PItem = { producto: string; categoria: string; metodo: "unidad" | "tamano"; cantidad: number; ancho: number; alto: number; precio_unitario: number };

const emptyP = (): PItem => ({ producto: "", categoria: PRINT_CATEGORIAS[0], metodo: "unidad", cantidad: 1, ancho: 0, alto: 0, precio_unitario: 0 });
const pSubtotal = (it: PItem) => Math.round((it.metodo === "tamano" ? it.ancho * it.alto : 1) * it.cantidad * it.precio_unitario * 100) / 100;

export function CotizadorView({ clients, printProducts }: { clients: Client[]; printProducts: PrintProduct[] }) {
  const router = useRouter();
  const [rama, setRama] = useState<"designs" | "distribution">("designs");
  const [clientId, setClientId] = useState("");
  const [savedId, setSavedId] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Software
  const [tipoSolucion, setTipoSolucion] = useState("");
  const [industria, setIndustria] = useState("");
  const [modulos, setModulos] = useState<Set<string>>(new Set());
  const [notas, setNotas] = useState("");
  const [precioManual, setPrecioManual] = useState<number | "">("");

  // Imprenta
  const [items, setItems] = useState<PItem[]>([emptyP()]);
  const [descuento, setDescuento] = useState(0);
  const [aplicaItbis, setAplicaItbis] = useState(false);
  const [moneda, setMoneda] = useState<"DOP" | "USD">("DOP");

  // AI
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  const client = clients.find((c) => c.id === clientId) ?? null;
  const modsOrden = useMemo(() => modulosOrdenados(industria || null), [industria]);
  const relevantes = new Set((industria && RELEVANCIA[industria]) || []);

  const printSubtotal = useMemo(() => items.reduce((s, it) => s + pSubtotal(it), 0), [items]);
  const printItbis = aplicaItbis ? Math.round((printSubtotal - descuento) * ITBIS_RATE * 100) / 100 : 0;
  const printTotal = Math.max(0, printSubtotal - descuento + printItbis);

  function toggleModulo(id: string) {
    setModulos((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
    setSavedId(null);
  }

  async function runAI() {
    setAiLoading(true); setAiMsg(null);
    try {
      const res = await fetch("/api/ai/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt }),
      });
      const json = await res.json();
      if (!json.ok) { setAiMsg(json.reason ?? "La IA no respondió. Cotiza manual."); return; }
      const d = json.data;
      setRama("designs");
      if (d.industria && INDUSTRIAS_COT.includes(d.industria)) setIndustria(d.industria);
      if (d.tipo_solucion && TIPOS_SOLUCION_COT.includes(d.tipo_solucion)) setTipoSolucion(d.tipo_solucion);
      setModulos(new Set(d.modulos ?? []));
      if (d.precio_min && d.precio_max) {
        setPrecioManual(Math.round((d.precio_min + d.precio_max) / 2));
        setNotas(`${d.notas ?? ""}\n\n(IA sugiere rango: ${money(d.precio_min, "DOP")} – ${money(d.precio_max, "DOP")})`.trim());
      } else if (d.notas) setNotas(d.notas);
      setAiUsed(true);
      setSavedId(null);
      setAiMsg("✅ Borrador generado por IA. Revisa, ajusta y guarda.");
    } catch {
      setAiMsg("Error de conexión con la IA. Puedes cotizar manual.");
    } finally {
      setAiLoading(false);
    }
  }

  function doSave() {
    setError(null);
    if (!clientId) { setError("Elige un cliente para la cotización."); return; }
    const base: SaveQuoteInput = {
      client_id: clientId,
      rama,
      brand_id: client?.brand_id ?? null,
      ai_generado: aiUsed,
    };
    let input: SaveQuoteInput;
    if (rama === "designs") {
      if (modulos.size === 0) { setError("Selecciona al menos un módulo."); return; }
      input = { ...base, tipo_solucion: tipoSolucion || null, industria: industria || null,
        modulos_json: [...modulos], notas: notas || null, precio_manual: precioManual === "" ? null : Number(precioManual) };
    } else {
      const valid = items.filter((it) => it.producto.trim());
      if (valid.length === 0) { setError("Agrega al menos un producto."); return; }
      input = { ...base, notas: notas || null, precio_manual: printTotal,
        items_json: valid.map((it) => ({ producto: it.producto, categoria: it.categoria, metodo: it.metodo,
          cantidad: it.cantidad, ancho: it.ancho, alto: it.alto, precio_unitario: it.precio_unitario, subtotal: pSubtotal(it) })) };
    }
    startTransition(async () => {
      const res = await saveQuote(input);
      if (res?.error) { setError(res.error); return; }
      setSavedId(res.id!);
    });
  }

  function doConvert() {
    if (!savedId) return;
    startTransition(async () => {
      const res = await convertQuoteToOrder(savedId);
      if (res?.error) { setError(res.error); return; }
      router.push(`/pedidos/${res.id}`);
    });
  }

  const waText = `Hola ${client?.nombre ?? ""} 👋, te comparto la cotización de tu proyecto.`;
  const waNum = (client?.whatsapp ?? client?.telefono ?? "").replace(/\D/g, "");

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      <div className="space-y-5 lg:col-span-2">
        {/* Cliente + rama */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Cliente</Label>
              <Select value={clientId} onChange={(e) => { setClientId(e.target.value); setSavedId(null); }}>
                <option value="">— Elegir cliente —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.nombre} {c.apellido ?? ""}</option>)}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Rama</Label>
              <div className="grid grid-cols-2 gap-2">
                <BranchBtn active={rama === "designs"} onClick={() => { setRama("designs"); setSavedId(null); }} icon={<Code2 className="size-4" />} label="Software" />
                <BranchBtn active={rama === "distribution"} onClick={() => { setRama("distribution"); setSavedId(null); }} icon={<Package className="size-4" />} label="Imprenta" />
              </div>
            </div>
          </div>
        </div>

        {rama === "designs" ? (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Tipo de solución</Label>
                <Select value={tipoSolucion} onChange={(e) => setTipoSolucion(e.target.value)}>
                  <option value="">— Seleccionar —</option>
                  {TIPOS_SOLUCION_COT.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Industria</Label>
                <Combobox
                  options={INDUSTRIAS_COT.map((i) => ({ value: i, label: i }))}
                  value={industria}
                  onChange={setIndustria}
                  placeholder="Buscar industria…"
                />
              </div>
            </div>

            <div>
              <Label>Módulos a incluir {industria && <span className="text-xs text-muted-foreground">(relevantes a {industria} primero)</span>}</Label>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {modsOrden.map((m) => {
                  const on = modulos.has(m.id);
                  const rel = relevantes.has(m.id);
                  return (
                    <button key={m.id} type="button" onClick={() => toggleModulo(m.id)}
                      className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                        on ? "border-electric/60 bg-accent/40" : "border-border hover:bg-accent/30")}>
                      <span className={cn("flex size-4 shrink-0 items-center justify-center rounded border", on ? "border-electric bg-electric text-white" : "border-border")}>
                        {on && <Check className="size-3" />}
                      </span>
                      <span className="flex-1">{m.label}</span>
                      {rel && <Badge dot="var(--electric)">top</Badge>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Precio manual (opcional)</Label>
                <Input type="number" min="0" step="0.01" value={precioManual}
                  onChange={(e) => setPrecioManual(e.target.value === "" ? "" : Number(e.target.value))} placeholder="RD$" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notas</Label>
              <Textarea value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Alcance, condiciones…" />
            </div>
          </div>
        ) : (
          <div className="space-y-4 rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Productos</h3>
              <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, emptyP()])}><Plus className="size-4" /> Añadir</Button>
            </div>
            {items.map((it, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-border bg-card/50 p-3 sm:grid-cols-12">
                <div className="sm:col-span-4 space-y-1">
                  <Label className="text-xs">Producto</Label>
                  <Input value={it.producto} onChange={(e) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, producto: e.target.value } : x))}
                    list="print-cat" placeholder="Ej. Gorras" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Categoría</Label>
                  <Select value={it.categoria} onChange={(e) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, categoria: e.target.value } : x))}>
                    {PRINT_CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Cobro</Label>
                  <Select value={it.metodo} onChange={(e) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, metodo: e.target.value as "unidad" | "tamano" } : x))}>
                    <option value="unidad">Unidad</option><option value="tamano">Tamaño</option>
                  </Select>
                </div>
                <div className="sm:col-span-1 space-y-1">
                  <Label className="text-xs">Cant.</Label>
                  <Input type="number" min="0" value={it.cantidad} onChange={(e) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, cantidad: Number(e.target.value) } : x))} />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Precio</Label>
                  <Input type="number" min="0" step="0.01" value={it.precio_unitario} onChange={(e) => setItems((p) => p.map((x, idx) => idx === i ? { ...x, precio_unitario: Number(e.target.value) } : x))} />
                </div>
                <div className="flex items-end justify-between sm:col-span-1">
                  <span className="text-xs font-medium">{money(pSubtotal(it), moneda)}</span>
                  {items.length > 1 && <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-destructive"><Trash2 className="size-4" /></button>}
                </div>
              </div>
            ))}
            <datalist id="print-cat">{printProducts.map((p) => <option key={p.id} value={p.nombre} />)}</datalist>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between gap-2"><Label>Moneda</Label>
                  <Select value={moneda} onChange={(e) => setMoneda(e.target.value as "DOP" | "USD")} className="h-9 w-24"><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
                <div className="flex items-center justify-between gap-2"><Label>Descuento</Label>
                  <Input type="number" min="0" step="0.01" value={descuento} onChange={(e) => setDescuento(Number(e.target.value))} className="h-9 w-32" /></div>
                <div className="flex items-center justify-between gap-2"><Label>ITBIS 18%</Label><Switch checked={aplicaItbis} onCheckedChange={setAplicaItbis} /></div>
              </div>
              <div className="space-y-1 rounded-lg border border-border bg-card p-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{money(printSubtotal, moneda)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">ITBIS</span><span>{money(printItbis, moneda)}</span></div>
                <div className="flex justify-between border-t border-border pt-1 font-semibold"><span>Total</span><span className="text-gradient">{money(printTotal, moneda)}</span></div>
              </div>
            </div>
            <div className="space-y-1.5"><Label>Notas</Label><Textarea value={notas} onChange={(e) => setNotas(e.target.value)} /></div>
          </div>
        )}

        {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

        {/* Acciones */}
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="gradient" onClick={doSave} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Guardar cotización
          </Button>
          {savedId && (
            <>
              <a href={`/api/pdf/quote/${savedId}`} target="_blank" rel="noopener noreferrer">
                <Button variant="outline"><Download className="size-4" /> PDF</Button>
              </a>
              {waNum && (
                <a target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waNum}?text=${encodeURIComponent(waText)}`}>
                  <Button variant="outline" className="text-success"><MessageCircle className="size-4" /> WhatsApp</Button>
                </a>
              )}
              <Button variant="outline" onClick={doConvert} disabled={pending}>
                <ArrowRightCircle className="size-4" /> Convertir en pedido
              </Button>
              <span className="flex items-center gap-1.5 text-sm text-success"><Check className="size-4" /> Guardada</span>
            </>
          )}
        </div>
      </div>

      {/* AI Assistant */}
      <div className="lg:col-span-1">
        <div className="sticky top-20 rounded-xl border border-border bg-card">
          <div className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Wand2 className="size-4 text-electric" />
            <h3 className="font-semibold">AI Quote Assistant</h3>
          </div>
          <div className="space-y-3 p-4">
            <p className="text-sm text-muted-foreground">Escribe en español lo que pide el cliente y la IA arma un borrador (tú decides siempre).</p>
            <Textarea rows={4} value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ej. restaurante quiere sistema con inventario, POS y facturación fiscal" />
            <Button variant="gradient" className="w-full" onClick={runAI} disabled={aiLoading || !aiPrompt.trim()}>
              {aiLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Generar con IA
            </Button>
            {aiMsg && <p className="rounded-lg border border-border bg-background/40 px-3 py-2 text-xs">{aiMsg}</p>}
            {modulos.size > 0 && rama === "designs" && (
              <div className="flex flex-wrap gap-1.5 border-t border-border pt-3">
                {[...modulos].map((id) => <Badge key={id}>{MODULO_LABEL[id] ?? id}</Badge>)}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BranchBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
      active ? "border-electric/60 bg-accent/40 font-medium" : "border-border hover:bg-accent/30")}>
      {icon} {label}
    </button>
  );
}

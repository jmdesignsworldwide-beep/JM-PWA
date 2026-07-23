"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2, Tag } from "lucide-react";
import { createOrder, type NewOrderInput, type OrderItemInput } from "@/app/(app)/pedidos/actions";
import { createLead } from "@/app/(app)/leads/actions";
import { PRINT_CATEGORIAS, TIPOS_SOLUCION, ITBIS_RATE, planPresets, diasHasta } from "@/lib/pedidos";
import { INDUSTRIA_OPTIONS } from "@/lib/ventas";
import { Combobox } from "@/components/ui/combobox";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

type Rama = "designs" | "distribution";
type Item = {
  producto: string;
  categoria: string;
  personalizacion: string;
  metodo: "unidad" | "tamano";
  cantidad: number;
  ancho: number;
  alto: number;
  precio_unitario: number;
  diseno_por_jm: boolean;
};

const emptyItem = (): Item => ({
  producto: "",
  categoria: PRINT_CATEGORIAS[0],
  personalizacion: "",
  metodo: "unidad",
  cantidad: 1,
  ancho: 0,
  alto: 0,
  precio_unitario: 0,
  diseno_por_jm: false,
});

function itemSubtotal(it: Item) {
  const base = it.metodo === "tamano" ? (it.ancho || 0) * (it.alto || 0) : 1;
  return Math.round(base * (it.cantidad || 0) * (it.precio_unitario || 0) * 100) / 100;
}

type Client = { id: string; nombre: string; factura_fiscal: boolean; brand_id: string | null };
type ClientLite = { id: string; nombre: string };
type BrandLite = { id: string; nombre: string };
type CatLite = { id: string; nombre: string; precio_base: number; categoria: string | null; unidad: string | null };

export function NewOrderForm({
  client,
  clients = [],
  brands = [],
  catalog = {},
}: {
  client?: Client | null;
  clients?: ClientLite[];
  brands?: BrandLite[];
  catalog?: Record<string, CatLite[]>;
}) {
  const router = useRouter();
  // Pedido primero: se elige (o crea) el cliente y la marca dentro de este form.
  const [clientId, setClientId] = useState(client?.id ?? "");
  const [brandId, setBrandId] = useState(client?.brand_id ?? brands[0]?.id ?? "");
  const rama: Rama = useMemo(
    () => (brands.find((b) => b.id === brandId)?.nombre.toLowerCase().includes("distribution") ? "distribution" : "designs"),
    [brandId, brands],
  );
  const [moneda, setMoneda] = useState<"DOP" | "USD">("DOP");
  const [industria, setIndustria] = useState("");
  const [tipoSolucion, setTipoSolucion] = useState("");
  const [items, setItems] = useState<Item[]>([emptyItem()]);
  const [descuento, setDescuento] = useState(0);
  const [aplicaItbis, setAplicaItbis] = useState(client?.factura_fiscal ?? false);
  const [fechaEntrega, setFechaEntrega] = useState("");
  const [planId, setPlanId] = useState("completo");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const catItems = catalog[brandId] ?? [];

  /** Añade un ítem al pedido desde el catálogo (prefill editable). */
  function addFromCatalog(c: CatLite) {
    setItems((prev) => {
      const base = { ...emptyItem(), producto: c.nombre, precio_unitario: Number(c.precio_base) || 0, categoria: c.categoria ?? PRINT_CATEGORIAS[0] };
      // Si el único ítem está vacío, lo reemplaza; si no, añade.
      if (prev.length === 1 && !prev[0].producto.trim()) return [base];
      return [...prev, base];
    });
  }

  const subtotal = useMemo(
    () => items.reduce((s, it) => s + itemSubtotal(it), 0),
    [items],
  );
  const itbis = aplicaItbis ? Math.round((subtotal - descuento) * ITBIS_RATE * 100) / 100 : 0;
  const total = Math.max(0, subtotal - descuento + itbis);
  const presets = planPresets(diasHasta(fechaEntrega || null));
  const plan = presets.find((p) => p.id === planId) ?? presets[0];

  function update(i: number, patch: Partial<Item>) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }

  function submit() {
    setError(null);
    if (!clientId) { setError("Elige o crea un cliente para el pedido."); return; }
    if (!brandId) { setError("Elige la marca del pedido."); return; }
    const valid = items.filter((it) => it.producto.trim() && itemSubtotal(it) >= 0);
    if (valid.length === 0) {
      setError("Agrega al menos un ítem con descripción.");
      return;
    }
    const detalle = valid.map((it) => ({
      producto: it.producto,
      categoria: rama === "distribution" ? it.categoria : null,
      personalizacion: it.personalizacion || null,
      metodo: rama === "distribution" ? it.metodo : null,
      cantidad: it.cantidad,
      ancho: it.metodo === "tamano" ? it.ancho : null,
      alto: it.metodo === "tamano" ? it.alto : null,
      precio_unitario: it.precio_unitario,
      subtotal: itemSubtotal(it),
      diseno_por_jm: it.diseno_por_jm,
    }));

    const input: NewOrderInput = {
      client_id: clientId,
      rama,
      moneda,
      industria: rama === "designs" ? industria || null : null,
      tipo_solucion: rama === "designs" ? tipoSolucion || null : null,
      detalle_json: detalle,
      items: rama === "distribution" ? (detalle as OrderItemInput[]) : undefined,
      subtotal,
      descuento,
      aplica_itbis: aplicaItbis,
      itbis,
      total,
      fecha_entrega: fechaEntrega || null,
      plan_pago: plan.plan,
      brand_id: brandId,
    };

    startTransition(async () => {
      const res = await createOrder(input);
      if (res?.error) {
        setError(res.error);
        return;
      }
      router.push(`/pedidos/${res.id}`);
    });
  }

  return (
    <div className="space-y-5">
      {/* Cliente: elegir o crear (sin salir del pedido) */}
      <div className="space-y-1.5">
        <Label>Cliente</Label>
        <Combobox
          options={clients.map((c) => ({ value: c.id, label: c.nombre }))}
          value={clientId}
          onChange={setClientId}
          placeholder="Buscar o crear cliente…"
          createLabel="Crear cliente"
          onCreate={async (label) => {
            setError(null);
            const r = await createLead({ nombre: label, fuente: "Pedido" });
            if ("id" in r && r.id) return { value: r.id, label };
            setError(("error" in r && r.error) || "No se pudo crear el cliente.");
            return null;
          }}
        />
        <p className="text-xs text-muted-foreground">Si no existe, escríbelo y créalo aquí mismo — no pierdes lo que llevas lleno.</p>
      </div>

      {/* Marca: define qué catálogo aparece */}
      {brands.length > 0 && (
        <div className="space-y-1.5">
          <Label>Marca / empresa</Label>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {brands.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setBrandId(b.id)}
                className={cn(
                  "rounded-xl border p-3 text-left text-sm font-medium transition-all",
                  brandId === b.id
                    ? "border-electric/60 bg-accent/40 ring-2 ring-[color-mix(in_srgb,var(--electric)_25%,transparent)]"
                    : "border-border hover:bg-accent/30",
                )}
              >
                {b.nombre}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Catálogo de la marca: toca para añadir al pedido */}
      {catItems.length > 0 && (
        <div className="space-y-2 rounded-xl border border-border bg-card/40 p-3">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            <Tag className="size-3.5" /> Catálogo — toca para añadir
          </p>
          <div className="flex flex-wrap gap-2">
            {catItems.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => addFromCatalog(c)}
                className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm transition-colors hover:border-electric/50 hover:bg-accent/40"
              >
                <Plus className="size-3.5 text-electric" /> {c.nombre}
                {Number(c.precio_base) > 0 && <span className="text-xs text-muted-foreground">· {money(Number(c.precio_base), moneda)}</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Designs: industria + tipo */}
      {rama === "designs" && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Industria</Label>
            <Combobox options={INDUSTRIA_OPTIONS} defaultValue={industria} onChange={setIndustria} placeholder="Buscar industria…" />
          </div>
          <div className="space-y-1.5">
            <Label>Tipo de solución</Label>
            <Select value={tipoSolucion} onChange={(e) => setTipoSolucion(e.target.value)}>
              <option value="">— Seleccionar —</option>
              {TIPOS_SOLUCION.map((t) => (<option key={t} value={t}>{t}</option>))}
            </Select>
          </div>
        </div>
      )}

      {/* Ítems */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-medium">{rama === "designs" ? "Módulos / conceptos" : "Productos del pedido"}</h3>
          <Button variant="outline" size="sm" onClick={() => setItems((p) => [...p, emptyItem()])}>
            <Plus className="size-4" /> Añadir
          </Button>
        </div>

        {items.map((it, i) => (
          <div key={i} className="rounded-xl border border-border bg-card/50 p-3">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-12">
              <div className="sm:col-span-5 space-y-1">
                <Label className="text-xs">{rama === "designs" ? "Concepto" : "Producto"}</Label>
                <Input
                  value={it.producto}
                  onChange={(e) => update(i, { producto: e.target.value })}
                  placeholder={rama === "designs" ? "Ej. Módulo de inventario" : "Ej. Gorras bordadas"}
                />
              </div>

              {rama === "distribution" && (
                <div className="sm:col-span-3 space-y-1">
                  <Label className="text-xs">Categoría</Label>
                  <Select value={it.categoria} onChange={(e) => update(i, { categoria: e.target.value })}>
                    {PRINT_CATEGORIAS.map((c) => (<option key={c} value={c}>{c}</option>))}
                  </Select>
                </div>
              )}

              {rama === "distribution" && (
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Cobro</Label>
                  <Select value={it.metodo} onChange={(e) => update(i, { metodo: e.target.value as "unidad" | "tamano" })}>
                    <option value="unidad">Por unidad</option>
                    <option value="tamano">Por tamaño</option>
                  </Select>
                </div>
              )}

              <div className={cn("space-y-1", rama === "designs" ? "sm:col-span-2" : "sm:col-span-2")}>
                <Label className="text-xs">Cantidad</Label>
                <Input type="number" min="0" value={it.cantidad}
                  onChange={(e) => update(i, { cantidad: Number(e.target.value) })} />
              </div>

              {rama === "distribution" && it.metodo === "tamano" && (
                <>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Ancho</Label>
                    <Input type="number" min="0" step="0.01" value={it.ancho}
                      onChange={(e) => update(i, { ancho: Number(e.target.value) })} />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Alto</Label>
                    <Input type="number" min="0" step="0.01" value={it.alto}
                      onChange={(e) => update(i, { alto: Number(e.target.value) })} />
                  </div>
                </>
              )}

              <div className={cn("space-y-1", rama === "designs" ? "sm:col-span-3" : "sm:col-span-3")}>
                <Label className="text-xs">{rama === "distribution" && it.metodo === "tamano" ? "Precio / área" : "Precio unitario"}</Label>
                <Input type="number" min="0" step="0.01" value={it.precio_unitario}
                  onChange={(e) => update(i, { precio_unitario: Number(e.target.value) })} />
              </div>

              <div className="flex items-end justify-between gap-2 sm:col-span-12">
                {rama === "distribution" && (
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Switch checked={it.diseno_por_jm} onCheckedChange={(v) => update(i, { diseno_por_jm: v })} />
                    Diseño por JM
                  </label>
                )}
                <span className="ml-auto text-sm font-medium">{money(itemSubtotal(it), moneda)}</span>
                {items.length > 1 && (
                  <button onClick={() => setItems((p) => p.filter((_, idx) => idx !== i))}
                    className="text-muted-foreground transition-colors hover:text-destructive">
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Totales + entrega + plan */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-center justify-between gap-3">
            <Label>Moneda</Label>
            <Select value={moneda} onChange={(e) => setMoneda(e.target.value as "DOP" | "USD")} className="h-9 w-28">
              <option value="DOP">DOP</option>
              <option value="USD">USD</option>
            </Select>
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label>Descuento</Label>
            <Input type="number" min="0" step="0.01" value={descuento}
              onChange={(e) => setDescuento(Number(e.target.value))} className="h-9 w-40" />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label>ITBIS 18% (si fiscal)</Label>
            <Switch checked={aplicaItbis} onCheckedChange={setAplicaItbis} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label>Fecha de entrega</Label>
            <DatePicker value={fechaEntrega} onChange={setFechaEntrega} className="w-44" />
          </div>
          <div className="space-y-1.5">
            <Label>Regla de pago (split)</Label>
            <Select value={planId} onChange={(e) => setPlanId(e.target.value)}>
              {presets.map((p) => (<option key={p.id} value={p.id}>{p.label}</option>))}
            </Select>
            <p className="text-xs text-muted-foreground">
              {plan.plan.map((p) => `${p.label} ${p.porcentaje}%`).join(" · ")} — se agendan solos al firmar.
            </p>
          </div>
        </div>

        <div className="space-y-2 rounded-xl border border-border bg-card p-4">
          <Row label="Subtotal" value={money(subtotal, moneda)} />
          <Row label="Descuento" value={`- ${money(descuento, moneda)}`} />
          <Row label={`ITBIS (${aplicaItbis ? "18%" : "no aplica"})`} value={money(itbis, moneda)} />
          <div className="my-2 h-px bg-border" />
          <div className="flex items-center justify-between text-lg font-semibold">
            <span>Total</span>
            <span className="text-gradient">{money(total, moneda)}</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => router.back()}>Cancelar</Button>
        <Button variant="gradient" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />}
          Guardar pedido
        </Button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </div>
  );
}

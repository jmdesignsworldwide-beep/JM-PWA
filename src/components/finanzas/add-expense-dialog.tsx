"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Receipt, Camera, ImageUp, Sparkles, X, Building2, User, RotateCcw, Plus, ListChecks } from "lucide-react";
import { addExpense } from "@/app/(app)/finanzas/actions";
import { uploadFile } from "@/lib/upload";
import { rdToday } from "@/lib/fecha";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

type Opt = { id: string; nombre: string };
type Linea = { descripcion: string | null; monto: number | null };

type Form = {
  monto: string; moneda: "DOP" | "USD"; fecha: string; categoria: string;
  comercio: string; itbis: string; metodo_pago: string;
  descripcion: string; project_id: string; brand_id: string; es_personal: boolean;
};

const vacio = (): Form => ({
  monto: "", moneda: "DOP", fecha: rdToday(), categoria: "",
  comercio: "", itbis: "", metodo_pago: "",
  descripcion: "", project_id: "", brand_id: "", es_personal: false,
});

export function AddExpenseDialog({
  categorias, categoriasPersonal = [], projects, brands, trigger,
}: {
  categorias: string[]; categoriasPersonal?: string[]; projects: Opt[]; brands: Opt[]; trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState<Form>(vacio);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  // Imagen del recibo (se sube al guardar) + escaneo IA.
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanMsg, setScanMsg] = useState<string | null>(null);
  // Categoría sugerida por la IA que no está en la lista existente.
  const [extraCat, setExtraCat] = useState<string | null>(null);
  // Renglones leídos del recibo (para confirmar) y cuántas partes se escanearon.
  const [lineas, setLineas] = useState<Linea[]>([]);
  const [partes, setPartes] = useState(0);
  const camRef = useRef<HTMLInputElement>(null);
  const galRef = useRef<HTMLInputElement>(null);
  const parteRef = useRef<HTMLInputElement>(null);

  // Lista de categorías según el ámbito elegido (negocio o personal).
  const catBase = form.es_personal && categoriasPersonal.length ? categoriasPersonal : categorias;

  function reset() {
    setForm(vacio());
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setScanMsg(null);
    setExtraCat(null);
    setLineas([]);
    setPartes(0);
    setError(null);
  }

  function close() { setOpen(false); }

  /**
   * Escanea una foto de recibo. `parte=true` significa "otra parte del mismo
   * recibo": acumula renglones y solo rellena campos vacíos (nunca pisa lo que
   * ya se leyó/escribiste, ni suma el total solo — eso lo confirmas tú).
   */
  async function scan(picked: File | null, parte = false) {
    if (!picked) return;
    setError(null);
    if (!parte) {
      setFile(picked);
      if (preview) URL.revokeObjectURL(preview);
      setPreview(URL.createObjectURL(picked));
      setLineas([]);
      setPartes(1);
    } else {
      setPartes((n) => n + 1);
    }
    setScanning(true);
    setScanMsg(null);
    try {
      const fd = new FormData();
      fd.append("imagen", picked);
      fd.append("categorias", JSON.stringify(catBase));
      const res = await fetch("/api/ai/receipt", { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) { setScanMsg(json.reason ?? "No se pudo leer el recibo. Llénalo a mano."); return; }
      const d = json.data;
      const nuevas: Linea[] = Array.isArray(d.lineas) ? d.lineas : [];
      setLineas((prev) => [...prev, ...nuevas]);
      setForm((f) => {
        const cat = d.categoria ?? f.categoria;
        if (d.categoria && !catBase.includes(d.categoria)) setExtraCat(d.categoria);
        // En modo "parte" solo se rellenan campos aún vacíos; nunca se pisa.
        const fill = (actual: string, leido: string | null) => parte ? (actual || (leido ?? "")) : (leido ?? actual);
        return {
          ...f,
          monto: parte ? (f.monto || (d.monto != null ? String(d.monto) : "")) : (d.monto != null ? String(d.monto) : f.monto),
          moneda: parte ? f.moneda : (d.moneda ?? f.moneda),
          fecha: fill(f.fecha, d.fecha),
          categoria: fill(f.categoria, cat) || f.categoria,
          comercio: fill(f.comercio, d.comercio),
          itbis: parte ? (f.itbis || (d.itbis != null ? String(d.itbis) : "")) : (d.itbis != null ? String(d.itbis) : f.itbis),
          metodo_pago: fill(f.metodo_pago, d.metodo_pago),
        };
      });
      const leidos = [d.monto != null, d.fecha, d.comercio].filter(Boolean).length;
      setScanMsg(
        leidos === 0 && nuevas.length === 0
          ? "No se leyó nada claro. Revisa la foto o llénalo a mano."
          : `${parte ? "Parte añadida" : "Recibo leído"} (confianza ${d.confianza}). Revisa los datos antes de guardar.`,
      );
    } catch {
      setScanMsg("No se pudo leer el recibo. Llénalo a mano.");
    } finally {
      setScanning(false);
    }
  }

  function quitarFoto() {
    setFile(null);
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setScanMsg(null);
    setLineas([]);
    setPartes(0);
  }

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const monto = Number(form.monto);
    if (!Number.isFinite(monto) || monto <= 0) { setError("Pon un monto válido."); return; }
    startTransition(async () => {
      let factura_url: string | null = null;
      if (file && file.size > 0) {
        setUploading(true);
        factura_url = await uploadFile("comprobantes", file);
        setUploading(false);
        if (!factura_url) { setError("No se pudo subir la imagen del recibo (se guardará sin ella)."); }
      }
      const t = (s: string) => { const v = s.trim(); return v ? v : null; };
      const res = await addExpense({
        monto,
        moneda: form.moneda,
        fecha: form.fecha,
        categoria: t(form.categoria),
        descripcion: t(form.descripcion),
        project_id: t(form.project_id),
        brand_id: t(form.brand_id),
        comercio: t(form.comercio),
        itbis: form.itbis.trim() ? Number(form.itbis) : null,
        metodo_pago: t(form.metodo_pago),
        es_personal: form.es_personal,
        factura_url,
      });
      if (res?.error) { setError(res.error); return; }
      reset();
      setOpen(false);
      router.refresh();
    });
  }

  const catOptions = [...new Set([
    ...(extraCat ? [extraCat] : []),
    ...(form.categoria && !catBase.includes(form.categoria) ? [form.categoria] : []),
    ...catBase,
  ])];
  const busy = pending || uploading;
  // Suma de los renglones leídos (referencia; el total lo confirmas tú, no la IA).
  const sumaLineas = lineas.reduce((s, l) => s + (l.monto ?? 0), 0);

  return (
    <>
      <span onClick={() => { reset(); setOpen(true); }}>
        {trigger ?? <Button variant="outline"><Receipt className="size-4" /> Registrar gasto</Button>}
      </span>
      <Dialog open={open} onClose={close} title="Registrar gasto" description="Escanea el recibo o llénalo a mano. Etiqueta a un proyecto para ver tu margen real.">
        {/* Inputs ocultos: cámara (captura directa), galería y "otra parte". */}
        <input ref={camRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { scan(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <input ref={galRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { scan(e.target.files?.[0] ?? null); e.target.value = ""; }} />
        <input ref={parteRef} type="file" accept="image/*" className="hidden"
          onChange={(e) => { scan(e.target.files?.[0] ?? null, true); e.target.value = ""; }} />

        <form onSubmit={submit} className="space-y-4">
          {/* Escáner de recibo */}
          <div className="rounded-xl border border-electric/30 bg-[color-mix(in_srgb,var(--electric)_7%,transparent)] p-3">
            {!preview ? (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="size-4 text-electric" /> Escanear recibo
                  <span className="text-xs font-normal text-muted-foreground">La IA llena el formulario por ti.</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Button type="button" variant="outline" onClick={() => camRef.current?.click()}>
                    <Camera className="size-4" /> Tomar foto
                  </Button>
                  <Button type="button" variant="outline" onClick={() => galRef.current?.click()}>
                    <ImageUp className="size-4" /> Subir imagen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Recibo" className="size-16 rounded-lg border border-border object-cover" />
                  <div className="min-w-0 flex-1 text-sm">
                    {scanning ? (
                      <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="size-4 animate-spin" /> Leyendo recibo…</span>
                    ) : (
                      <span className="text-muted-foreground">{scanMsg ?? "Recibo adjunto."}{partes > 1 ? ` · ${partes} partes` : ""}</span>
                    )}
                  </div>
                  <Button type="button" variant="ghost" size="icon" onClick={quitarFoto} aria-label="Quitar foto"><X className="size-4" /></Button>
                </div>

                {/* Repetir el escaneo o añadir otra parte del mismo recibo */}
                {!scanning && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => galRef.current?.click()}>
                      <RotateCcw className="size-3.5" /> Repetir escaneo
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => parteRef.current?.click()}>
                      <Plus className="size-3.5" /> Escanear otra parte
                    </Button>
                  </div>
                )}

                {/* Renglones leídos: para confirmar, no se suman solos */}
                {lineas.length > 0 && (
                  <div className="rounded-lg border border-border bg-card/60 p-2.5">
                    <p className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><ListChecks className="size-3.5" /> {lineas.length} renglón{lineas.length === 1 ? "" : "es"} leído{lineas.length === 1 ? "" : "s"}</p>
                    <ul className="max-h-32 space-y-0.5 overflow-y-auto text-xs">
                      {lineas.map((l, i) => (
                        <li key={i} className="flex justify-between gap-2 border-b border-border/50 py-0.5 last:border-0">
                          <span className="min-w-0 truncate text-muted-foreground">{l.descripcion}</span>
                          <span className="shrink-0 tabular-nums">{l.monto != null ? l.monto.toLocaleString("es-DO", { minimumFractionDigits: 2 }) : "—"}</span>
                        </li>
                      ))}
                    </ul>
                    {sumaLineas > 0 && (
                      <p className="mt-1.5 text-[11px] text-muted-foreground">Suma de renglones: {sumaLineas.toLocaleString("es-DO", { minimumFractionDigits: 2 })} · el total lo confirmas tú arriba.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Negocio vs Personal — se mantienen separados en los números del negocio. */}
          <div className="grid grid-cols-2 gap-2">
            {([["negocio", false, Building2, "Negocio"], ["personal", true, User, "Personal"]] as const).map(([k, val, Icon, label]) => (
              <button key={k} type="button" onClick={() => set("es_personal", val)}
                className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  form.es_personal === val ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monto</Label>
              <Input name="monto" type="number" step="0.01" min="0" required value={form.monto} onChange={(e) => set("monto", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Moneda</Label>
              <Select value={form.moneda} onChange={(e) => set("moneda", e.target.value as "DOP" | "USD")}><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            <div className="space-y-1.5"><Label>Fecha</Label>
              <DatePicker value={form.fecha} onChange={(v) => set("fecha", v)} /></div>
            <div className="space-y-1.5"><Label>Categoría</Label>
              <Select value={form.categoria} onChange={(e) => set("categoria", e.target.value)}>
                <option value="">— Seleccionar —</option>{catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select></div>
            <div className="space-y-1.5"><Label>Comercio</Label>
              <Input value={form.comercio} onChange={(e) => set("comercio", e.target.value)} placeholder="¿Dónde fue?" /></div>
            <div className="space-y-1.5"><Label>ITBIS (opcional)</Label>
              <Input type="number" step="0.01" min="0" value={form.itbis} onChange={(e) => set("itbis", e.target.value)} placeholder="0.00" /></div>
            <div className="space-y-1.5"><Label>Método de pago</Label>
              <Select value={form.metodo_pago} onChange={(e) => set("metodo_pago", e.target.value)}>
                <option value="">— Sin especificar —</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
                <option value="otro">Otro</option>
              </Select></div>
            <div className="space-y-1.5"><Label>Proyecto (para margen)</Label>
              <Select value={form.project_id} onChange={(e) => set("project_id", e.target.value)} disabled={form.es_personal}>
                <option value="">— Ninguno —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select></div>
            <div className="space-y-1.5 col-span-2"><Label>Marca</Label>
              <Select value={form.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
                <option value="">— Ninguna —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </Select></div>
          </div>
          <div className="space-y-1.5"><Label>Descripción</Label>
            <Textarea value={form.descripcion} onChange={(e) => set("descripcion", e.target.value)} placeholder="¿En qué fue?" /></div>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
            <Button type="submit" variant="gradient" disabled={busy || scanning}>
              {busy && <Loader2 className="size-4 animate-spin" />} {uploading ? "Subiendo…" : "Guardar gasto"}
            </Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}

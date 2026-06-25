"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil, Trash2, Building2, User, ImageOff, FileText } from "lucide-react";
import { updateMovimiento, deleteMovimiento, getReceiptUrl } from "@/app/(app)/finanzas/actions";
import { money, fechaCorta } from "@/lib/format";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { cn } from "@/lib/utils";

type Opt = { id: string; nombre: string };

export type Mov = {
  kind: "income" | "expense";
  id: string;
  monto: number;
  moneda: string;
  fecha: string;
  categoria: string | null;
  descripcion: string | null;
  brand_id: string | null;
  project_id: string | null;
  es_personal?: boolean | null;
  // expense
  comercio?: string | null;
  itbis?: number | null;
  metodo_pago?: string | null;
  factura_url?: string | null;
  // income
  client_id?: string | null;
  comprobante_url?: string | null;
};

export function TransactionDetail({
  mov, onClose, categoriasIngreso, categoriasGasto, projects, brands, clients, brandMap,
}: {
  mov: Mov;
  onClose: () => void;
  categoriasIngreso: string[];
  categoriasGasto: string[];
  projects: Opt[];
  brands: Opt[];
  clients: Opt[];
  brandMap: Record<string, string>;
}) {
  const router = useRouter();
  const isExpense = mov.kind === "expense";
  const color = isExpense ? "var(--destructive)" : "var(--success)";
  const fileRef = isExpense ? mov.factura_url : mov.comprobante_url;

  const [editing, setEditing] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Imagen del recibo: URL firmada (bucket privado).
  const [imgUrl, setImgUrl] = useState<string | null>(null);
  const [imgState, setImgState] = useState<"idle" | "loading" | "ready" | "error">(fileRef ? "loading" : "idle");
  const isPdf = !!fileRef && /\.pdf$/i.test(fileRef);

  useEffect(() => {
    if (!fileRef) return;
    let alive = true;
    getReceiptUrl(fileRef).then((res) => {
      if (!alive) return;
      if ("url" in res && res.url) { setImgUrl(res.url); setImgState("ready"); }
      else setImgState("error");
    });
    return () => { alive = false; };
  }, [fileRef]);

  // Form de edición
  const [f, setF] = useState({
    monto: String(mov.monto),
    moneda: (mov.moneda === "USD" ? "USD" : "DOP") as "DOP" | "USD",
    fecha: mov.fecha,
    categoria: mov.categoria ?? "",
    descripcion: mov.descripcion ?? "",
    brand_id: mov.brand_id ?? "",
    project_id: mov.project_id ?? "",
    es_personal: !!mov.es_personal,
    comercio: mov.comercio ?? "",
    itbis: mov.itbis != null ? String(mov.itbis) : "",
    metodo_pago: mov.metodo_pago ?? "",
    client_id: mov.client_id ?? "",
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));

  function guardar() {
    setError(null);
    const monto = Number(f.monto);
    if (!Number.isFinite(monto) || monto <= 0) { setError("Pon un monto válido."); return; }
    const t = (s: string) => { const v = s.trim(); return v ? v : null; };
    const patch = isExpense
      ? {
          monto, moneda: f.moneda, fecha: f.fecha, categoria: t(f.categoria), descripcion: t(f.descripcion),
          brand_id: t(f.brand_id), project_id: f.es_personal ? null : t(f.project_id), es_personal: f.es_personal,
          comercio: t(f.comercio), itbis: f.itbis.trim() ? Number(f.itbis) : null, metodo_pago: t(f.metodo_pago),
        }
      : {
          monto, moneda: f.moneda, fecha: f.fecha, categoria: t(f.categoria), descripcion: t(f.descripcion),
          brand_id: t(f.brand_id), project_id: t(f.project_id), es_personal: f.es_personal, client_id: t(f.client_id),
        };
    startTransition(async () => {
      const res = await updateMovimiento(mov.kind, mov.id, patch);
      if (res?.error) { setError(res.error); return; }
      setEditing(false);
      router.refresh();
      onClose();
    });
  }

  function borrar() {
    setError(null);
    startTransition(async () => {
      const res = await deleteMovimiento(mov.kind, mov.id);
      if (res?.error) { setError(res.error); return; }
      router.refresh();
      onClose();
    });
  }

  const categorias = isExpense ? categoriasGasto : categoriasIngreso;
  const catOptions = mov.categoria && !categorias.includes(mov.categoria) ? [mov.categoria, ...categorias] : categorias;

  return (
    <Dialog open onClose={onClose} title={isExpense ? "Gasto" : "Ingreso"} className="max-w-lg">
      {!editing ? (
        <div className="space-y-4">
          {/* Monto destacado */}
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
            <div>
              <p className="text-2xl font-bold tracking-tight" style={{ color }}>
                {isExpense ? "−" : "+"}{money(mov.monto, mov.moneda)}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">{fechaCorta(mov.fecha)}</p>
            </div>
            <span className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
              mov.es_personal ? "border-border text-muted-foreground" : "border-electric/40 text-electric")}>
              {mov.es_personal ? <User className="size-3.5" /> : <Building2 className="size-3.5" />}
              {mov.es_personal ? "Personal" : "Negocio"}
            </span>
          </div>

          {/* Campos */}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            <Campo label="Categoría" value={mov.categoria} />
            {isExpense && <Campo label="Comercio" value={mov.comercio} />}
            {isExpense && <Campo label="ITBIS" value={mov.itbis != null ? money(mov.itbis, mov.moneda) : null} />}
            {isExpense && <Campo label="Método de pago" value={mov.metodo_pago} capitalize />}
            {!isExpense && <Campo label="Cliente" value={mov.client_id ? (clients.find((c) => c.id === mov.client_id)?.nombre ?? "—") : null} />}
            <Campo label="Proyecto" value={mov.project_id ? (projects.find((p) => p.id === mov.project_id)?.nombre ?? "—") : null} />
            <Campo label="Marca" value={mov.brand_id ? (brandMap[mov.brand_id] ?? "—") : null} />
            <Campo label="Descripción" value={mov.descripcion} full />
          </dl>

          {/* Recibo / comprobante */}
          {fileRef && (
            <div className="space-y-1.5">
              <Label>{isExpense ? "Recibo" : "Comprobante"}</Label>
              {imgState === "loading" && <div className="flex h-40 items-center justify-center rounded-lg border border-border text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>}
              {imgState === "error" && <div className="flex h-20 items-center justify-center gap-2 rounded-lg border border-border text-sm text-muted-foreground"><ImageOff className="size-4" /> No se pudo cargar.</div>}
              {imgState === "ready" && imgUrl && (
                isPdf ? (
                  <a href={imgUrl} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" className="w-full"><FileText className="size-4" /> Ver archivo (PDF)</Button>
                  </a>
                ) : (
                  <a href={imgUrl} target="_blank" rel="noopener noreferrer" className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imgUrl} alt="Recibo" className="max-h-72 w-full rounded-lg border border-border object-contain" />
                  </a>
                )
              )}
            </div>
          )}

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

          {/* Acciones */}
          {confirmDel ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3">
              <span className="text-sm text-destructive">¿Seguro que quieres borrarlo?</span>
              <div className="flex gap-2">
                <Button type="button" variant="ghost" size="sm" onClick={() => setConfirmDel(false)}>Cancelar</Button>
                <Button type="button" variant="outline" size="sm" className="text-destructive" onClick={borrar} disabled={pending}>
                  {pending && <Loader2 className="size-4 animate-spin" />} Sí, borrar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" className="text-destructive" onClick={() => setConfirmDel(true)}><Trash2 className="size-4" /> Borrar</Button>
              <Button type="button" variant="gradient" onClick={() => setEditing(true)}><Pencil className="size-4" /> Editar</Button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Negocio vs Personal */}
          <div className="grid grid-cols-2 gap-2">
            {([["negocio", false, Building2, "Negocio"], ["personal", true, User, "Personal"]] as const).map(([k, val, Icon, label]) => (
              <button key={k} type="button" onClick={() => set("es_personal", val)}
                className={cn("flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                  f.es_personal === val ? "border-electric bg-electric/10 text-foreground" : "border-border text-muted-foreground hover:bg-accent/40")}>
                <Icon className="size-4" /> {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5"><Label>Monto</Label><Input type="number" step="0.01" min="0" value={f.monto} onChange={(e) => set("monto", e.target.value)} /></div>
            <div className="space-y-1.5"><Label>Moneda</Label><Select value={f.moneda} onChange={(e) => set("moneda", e.target.value as "DOP" | "USD")}><option value="DOP">DOP</option><option value="USD">USD</option></Select></div>
            <div className="space-y-1.5"><Label>Fecha</Label><DatePicker value={f.fecha} onChange={(v) => set("fecha", v)} /></div>
            <div className="space-y-1.5"><Label>Categoría</Label>
              <Select value={f.categoria} onChange={(e) => set("categoria", e.target.value)}>
                <option value="">— Seleccionar —</option>{catOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select></div>
            {isExpense && <>
              <div className="space-y-1.5"><Label>Comercio</Label><Input value={f.comercio} onChange={(e) => set("comercio", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>ITBIS</Label><Input type="number" step="0.01" min="0" value={f.itbis} onChange={(e) => set("itbis", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Método de pago</Label>
                <Select value={f.metodo_pago} onChange={(e) => set("metodo_pago", e.target.value)}>
                  <option value="">— Sin especificar —</option><option value="efectivo">Efectivo</option><option value="tarjeta">Tarjeta</option><option value="transferencia">Transferencia</option><option value="otro">Otro</option>
                </Select></div>
            </>}
            {!isExpense && <div className="space-y-1.5"><Label>Cliente</Label>
              <Select value={f.client_id} onChange={(e) => set("client_id", e.target.value)}>
                <option value="">— Ninguno —</option>{clients.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </Select></div>}
            <div className="space-y-1.5"><Label>Proyecto</Label>
              <Select value={f.project_id} onChange={(e) => set("project_id", e.target.value)} disabled={isExpense && f.es_personal}>
                <option value="">— Ninguno —</option>{projects.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </Select></div>
            <div className="space-y-1.5"><Label>Marca</Label>
              <Select value={f.brand_id} onChange={(e) => set("brand_id", e.target.value)}>
                <option value="">— Ninguna —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
              </Select></div>
          </div>
          <div className="space-y-1.5"><Label>Descripción</Label><Textarea value={f.descripcion} onChange={(e) => set("descripcion", e.target.value)} /></div>

          {error && <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => { setEditing(false); setError(null); }}>Cancelar</Button>
            <Button type="button" variant="gradient" onClick={guardar} disabled={pending}>
              {pending && <Loader2 className="size-4 animate-spin" />} Guardar cambios
            </Button>
          </div>
        </div>
      )}
    </Dialog>
  );
}

function Campo({ label, value, full, capitalize }: { label: string; value: string | null | undefined; full?: boolean; capitalize?: boolean }) {
  if (!value) return null;
  return (
    <div className={cn("min-w-0", full && "col-span-2")}>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className={cn("mt-0.5 break-words font-medium", capitalize && "capitalize")}>{value}</dd>
    </div>
  );
}

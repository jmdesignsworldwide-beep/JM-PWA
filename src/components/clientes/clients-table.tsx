"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, UserCheck, Target, User, SlidersHorizontal, X } from "lucide-react";
import type { Client, ContactAgg } from "@/lib/data/clients";
import { INDUSTRIAS, CATEGORIAS_SERVICIO } from "@/lib/ventas";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import { SocialLinks } from "@/components/ui/social-links";
import { EstadoSelect } from "@/components/clientes/estado-select";
import { containerVariants, itemVariants } from "@/components/animations/motion";
import { CountUp } from "@/components/animations/count-up";

function initials(nombre: string, apellido?: string | null) {
  return `${(nombre[0] ?? "").toUpperCase()}${(apellido?.[0] ?? "").toUpperCase()}` || "?";
}

function Avatar({ nombre, apellido }: { nombre: string; apellido?: string | null }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--electric),var(--brand-purple))] text-xs font-semibold text-white">
      {initials(nombre, apellido)}
    </span>
  );
}

function StatChip({ icon: Icon, label, value }: { icon: typeof UserCheck; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-electric"><Icon className="size-4" /></div>
      <div>
        <p className="text-lg font-bold leading-none"><CountUp value={value} /></p>
        <p className="text-[11px] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

type Brand = { id: string; nombre: string };

const CAT_LABEL: Record<string, string> = Object.fromEntries(CATEGORIAS_SERVICIO.map((c) => [c.id, c.label]));
/** Etiqueta legible de una categoría (los 4 ids fijos → label; el resto tal cual). */
const catLabel = (c: string) => CAT_LABEL[c] ?? c;
const CANON_CATS: string[] = CATEGORIAS_SERVICIO.map((c) => c.id);
/** Ordena categorías: primero las 4 canónicas presentes, luego el resto alfabético. */
function orderCats(cats: string[]) {
  const set = new Set(cats);
  const canon = CANON_CATS.filter((c) => set.has(c));
  const extra = cats.filter((c) => !CANON_CATS.includes(c)).sort((a, b) => a.localeCompare(b, "es"));
  return [...canon, ...extra];
}

/** Coincidencia por inicio de palabra (para la búsqueda de industria con lupita). */
function industriaMatch(industrias: string[], term: string) {
  const t = term.trim().toLowerCase();
  if (!t) return true;
  return industrias.some((ind) => {
    const low = ind.toLowerCase();
    return low.startsWith(t) || low.split(/[\s/]+/).some((w) => w.startsWith(t));
  });
}

export function ClientsTable({
  clients,
  brands,
  aggregates = {},
  initialEstado = "",
}: {
  clients: Client[];
  brands: Brand[];
  aggregates?: Record<string, ContactAgg>;
  initialEstado?: string;
}) {
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState(initialEstado); // "" | "lead" | "activo" | "personal"
  const [fMarca, setFMarca] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fIndustria, setFIndustria] = useState("");
  const [sheet, setSheet] = useState(false);

  const brandMap = useMemo(() => Object.fromEntries(brands.map((b) => [b.id, b.nombre])), [brands]);

  // Conjuntos EFECTIVOS por contacto: su marca/categoría/industria propias +
  // las derivadas de sus pedidos (multi-marca). La categoría va ETIQUETADA por
  // marca (pares) para que la cascada solo ofrezca lo que esa marca usa.
  const eff = useMemo(() => {
    const m = new Map<string, { brands: Set<string>; pairs: { brand: string | null; cat: string }[]; cats: Set<string>; inds: string[] }>();
    for (const c of clients) {
      const a = aggregates[c.id];
      const bs = new Set<string>(a?.brandIds ?? []);
      if (c.brand_id) bs.add(c.brand_id);
      const pairs = [...(a?.pairs ?? [])];
      // Categoría propia del contacto (útil para prospectos sin pedidos aún).
      if (c.categoria_servicio) pairs.push({ brand: c.brand_id ?? null, cat: c.categoria_servicio });
      const is = new Set<string>(a?.industrias ?? []);
      if (c.industria) is.add(c.industria);
      m.set(c.id, { brands: bs, pairs, cats: new Set(pairs.map((p) => p.cat)), inds: [...is] });
    }
    return m;
  }, [clients, aggregates]);

  // Contactos de negocio (excluye Personal) que pasan estado + búsqueda: base
  // para derivar qué categorías/industrias existen bajo la marca elegida.
  const negocio = useMemo(() => clients.filter((c) => !c.es_personal), [clients]);

  // Cascada: categorías disponibles según la marca elegida (solo las que esa
  // marca realmente usa; no mostrar lo que no aplica).
  const categoriaOptions = useMemo(() => {
    const present = new Set<string>();
    for (const c of negocio) {
      const e = eff.get(c.id)!;
      for (const p of e.pairs) if (!fMarca || p.brand === fMarca) present.add(p.cat);
    }
    return orderCats([...present]);
  }, [negocio, eff, fMarca]);

  // ¿El contacto tiene un pedido con esta categoría bajo la marca elegida?
  const matchCat = (e: { pairs: { brand: string | null; cat: string }[] }, marca: string, cat: string) =>
    e.pairs.some((p) => p.cat === cat && (!marca || p.brand === marca));

  // Cascada: industrias disponibles según marca (+ categoría) — sugerencias de la lupita.
  const industriaOptions = useMemo(() => {
    const present = new Set<string>();
    for (const c of negocio) {
      const e = eff.get(c.id)!;
      if (fMarca && !e.brands.has(fMarca)) continue;
      if (fCategoria && !matchCat(e, fMarca, fCategoria)) continue;
      e.inds.forEach((x) => present.add(x));
    }
    // Orden canónico primero, luego cualquier valor heredado.
    const canon = INDUSTRIAS.filter((i) => present.has(i));
    const extra = [...present].filter((i) => !INDUSTRIAS.includes(i));
    return [...canon, ...extra];
  }, [negocio, eff, fCategoria, fMarca]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients.filter((c) => {
      // "Personal" es su propia vista; el resto de vistas los excluye.
      if (fEstado === "personal") { if (!c.es_personal) return false; }
      else if (c.es_personal) return false;
      if (fEstado === "lead" && !c.es_lead) return false;
      if (fEstado === "activo" && c.es_lead) return false;
      const e = eff.get(c.id)!;
      if (fMarca && !e.brands.has(fMarca)) return false;
      if (fCategoria && !matchCat(e, fMarca, fCategoria)) return false;
      if (!industriaMatch(e.inds, fIndustria)) return false;
      if (term) {
        const hay = `${c.nombre} ${c.apellido ?? ""} ${c.correo ?? ""} ${c.telefono ?? ""} ${c.whatsapp ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [clients, eff, q, fEstado, fMarca, fCategoria, fIndustria]);

  const totales = useMemo(() => {
    const neg = clients.filter((c) => !c.es_personal);
    return {
      activos: neg.filter((c) => !c.es_lead).length,
      leads: neg.filter((c) => c.es_lead).length,
      personal: clients.filter((c) => c.es_personal).length,
    };
  }, [clients]);

  // Al cambiar la marca, se limpian categoría e industria (cascada).
  function cambiarMarca(v: string) { setFMarca(v); setFCategoria(""); setFIndustria(""); }

  const activos = [fMarca, fCategoria, fIndustria.trim(), fEstado].filter(Boolean).length;
  function limpiar() { setFMarca(""); setFCategoria(""); setFIndustria(""); setFEstado(""); }

  const controls = (
    <FilterControls
      brands={brands} fEstado={fEstado} setFEstado={setFEstado}
      fMarca={fMarca} onMarca={cambiarMarca}
      fCategoria={fCategoria} setFCategoria={setFCategoria} categoriaOptions={categoriaOptions}
      fIndustria={fIndustria} setFIndustria={setFIndustria} industriaOptions={industriaOptions}
    />
  );

  return (
    <div className="space-y-4">
      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        <StatChip icon={UserCheck} label="Clientes activos" value={totales.activos} />
        <StatChip icon={Target} label="Prospectos" value={totales.leads} />
        <StatChip icon={User} label="Personal" value={totales.personal} />
      </div>

      {/* Buscador + acciones (siempre visibles). */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono…"
            className="h-9 w-full rounded-lg border border-border bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Móvil: botón de filtros (hoja). Escritorio: filtros en fila. */}
        <Button variant="outline" size="sm" className="sm:hidden" onClick={() => setSheet(true)}>
          <SlidersHorizontal className="size-4" /> Filtros
          {activos > 0 && <span className="ml-1 flex size-5 items-center justify-center rounded-full bg-electric text-[11px] font-semibold text-white">{activos}</span>}
        </Button>
        <div className="hidden flex-wrap items-center gap-2 sm:flex">{controls}</div>

        <div className="ml-auto"><NewLeadDialog brands={brands} label="Nuevo registro" /></div>
      </div>

      {/* Chips de filtros activos (móvil, para saber qué está aplicado). */}
      {activos > 0 && (
        <div className="flex flex-wrap items-center gap-2 sm:hidden">
          {fMarca && <FilterChip label={brandMap[fMarca] ?? "Marca"} onClear={() => cambiarMarca("")} />}
          {fCategoria && <FilterChip label={CAT_LABEL[fCategoria] ?? fCategoria} onClear={() => setFCategoria("")} />}
          {fIndustria.trim() && <FilterChip label={fIndustria.trim()} onClear={() => setFIndustria("")} />}
          {fEstado && <FilterChip label={fEstado === "lead" ? "Prospectos" : fEstado === "activo" ? "Activos" : "Personal"} onClear={() => setFEstado("")} />}
          <button onClick={limpiar} className="text-xs text-muted-foreground underline">Limpiar</button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          No hay registros con estos filtros.
        </div>
      ) : (
        <>
        {/* Móvil: tarjetas apiladas (sin scroll horizontal) */}
        <motion.ul variants={containerVariants} initial="hidden" animate="show" className="space-y-2 sm:hidden">
          {filtered.map((c) => (
            <motion.li key={c.id} variants={itemVariants}>
              <Link href={`/clientes/${c.id}`} className="flex gap-3 rounded-xl border border-border bg-card p-4 transition-all hover:border-electric/40 hover:shadow-md active:bg-accent/40">
                <Avatar nombre={c.nombre} apellido={c.apellido} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium">{c.nombre} {c.apellido ?? ""}</span>
                    {c.es_personal ? (
                      <Badge dot="var(--electric)">Personal</Badge>
                    ) : c.es_lead ? (
                      <Badge dot="var(--warning)">Prospecto</Badge>
                    ) : (
                      <Badge dot="var(--success)">Activo</Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {marcasLabel(eff.get(c.id), brandMap, c.categoria_servicio, c.industria)}
                  </p>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{c.whatsapp ?? c.telefono ?? c.correo ?? "Sin contacto"}</p>
                  <SocialLinks instagram={c.instagram} facebook={c.facebook} whatsapp={c.whatsapp ?? c.telefono} waText={`Hola ${c.nombre}!`} size="sm" className="mt-2" />
                </div>
              </Link>
            </motion.li>
          ))}
        </motion.ul>

        {/* Escritorio: tabla */}
        <div className="hidden overflow-x-auto rounded-xl border border-border sm:block">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Categoría</th>
                <th className="px-4 py-3 font-medium">Industria</th>
                <th className="px-4 py-3 font-medium">Marcas</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="show">
              {filtered.map((c) => {
                const e = eff.get(c.id);
                return (
                <motion.tr
                  key={c.id}
                  variants={itemVariants}
                  className="border-t border-border transition-colors hover:bg-accent/40"
                >
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="flex items-center gap-2.5 font-medium hover:text-electric">
                      <Avatar nombre={c.nombre} apellido={c.apellido} />
                      {c.nombre} {c.apellido ?? ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.es_personal
                      ? <Badge dot="var(--electric)">Personal</Badge>
                      : <EstadoSelect clientId={c.id} esLead={c.es_lead} />}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{catList(e, c.categoria_servicio)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.industria ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{brandsList(e, brandMap, c.brand_id)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{c.whatsapp ?? c.telefono ?? c.correo ?? "—"}</span>
                      <SocialLinks instagram={c.instagram} facebook={c.facebook} whatsapp={c.whatsapp ?? c.telefono} waText={`Hola ${c.nombre}!`} size="sm" />
                    </div>
                  </td>
                </motion.tr>
              ); })}
            </motion.tbody>
          </table>
        </div>
        </>
      )}

      {/* Móvil: hoja de filtros (bottom sheet con safe-area, vía Dialog). */}
      {sheet && (
        <Dialog open onClose={() => setSheet(false)} title="Filtros" description="Marca → categoría → industria → estado." className="max-w-md">
          <div className="space-y-4">
            {controls}
            <div className="flex justify-between gap-2 pt-1">
              <Button variant="ghost" onClick={limpiar} disabled={activos === 0}>Limpiar</Button>
              <Button variant="gradient" onClick={() => setSheet(false)}>Ver {filtered.length}</Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}

function FilterChip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <span className="flex items-center gap-1 rounded-full border border-electric/40 bg-electric/10 px-2.5 py-1 text-xs">
      {label}
      <button onClick={onClear} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
    </span>
  );
}

/** Controles de filtro en cascada, reusados en la fila (desktop) y la hoja (móvil). */
function FilterControls({
  brands, fEstado, setFEstado, fMarca, onMarca,
  fCategoria, setFCategoria, categoriaOptions,
  fIndustria, setFIndustria, industriaOptions,
}: {
  brands: Brand[];
  fEstado: string; setFEstado: (v: string) => void;
  fMarca: string; onMarca: (v: string) => void;
  fCategoria: string; setFCategoria: (v: string) => void; categoriaOptions: string[];
  fIndustria: string; setFIndustria: (v: string) => void; industriaOptions: string[];
}) {
  return (
    <>
      {/* 1) Marca (primero) */}
      <Select aria-label="Marca" value={fMarca} onChange={(e) => onMarca(e.target.value)} className="h-9 w-full sm:w-auto">
        <option value="">Todas las marcas</option>
        {brands.map((b) => <option key={b.id} value={b.id}>{b.nombre}</option>)}
      </Select>

      {/* 2) Categoría (según la marca) */}
      <Select aria-label="Categoría" value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} className="h-9 w-full sm:w-auto"
        disabled={categoriaOptions.length === 0}>
        <option value="">Toda categoría</option>
        {categoriaOptions.map((id) => <option key={id} value={id}>{CAT_LABEL[id] ?? id}</option>)}
      </Select>

      {/* 3) Estado */}
      <Select aria-label="Estado" value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="h-9 w-full sm:w-auto">
        <option value="">Todos</option>
        <option value="lead">Prospectos</option>
        <option value="activo">Clientes activos</option>
        <option value="personal">Personal</option>
      </Select>

      {/* 4) Industria con búsqueda (lupita) */}
      <div className="relative w-full sm:w-52">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={fIndustria}
          onChange={(e) => setFIndustria(e.target.value)}
          placeholder="Industria…"
          list="industria-opts"
          className="h-9 w-full rounded-lg border border-border bg-background/50 pl-9 pr-8 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
        {fIndustria && (
          <button onClick={() => setFIndustria("")} aria-label="Limpiar industria"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground"><X className="size-3.5" /></button>
        )}
        <datalist id="industria-opts">
          {industriaOptions.map((i) => <option key={i} value={i} />)}
        </datalist>
      </div>
    </>
  );
}

type Eff = { brands: Set<string>; pairs: { brand: string | null; cat: string }[]; cats: Set<string>; inds: string[] } | undefined;

/** Etiqueta compacta (móvil): categorías + marcas + industria propia. */
function marcasLabel(e: Eff, brandMap: Record<string, string>, catProp: string | null, indProp: string | null) {
  const cats = e ? [...e.cats].map((x) => catLabel(x)) : (catProp ? [catLabel(catProp)] : []);
  const marcas = e ? [...e.brands].map((id) => brandMap[id]).filter(Boolean) : [];
  return [cats.join("/"), indProp, marcas.join(" · ")].filter(Boolean).join(" · ") || "Sin datos";
}

function catList(e: Eff, catProp: string | null) {
  const cats = e ? [...e.cats] : (catProp ? [catProp] : []);
  if (cats.length === 0) return "—";
  return cats.map((x) => catLabel(x)).join(", ");
}

function brandsList(e: Eff, brandMap: Record<string, string>, brandProp: string | null) {
  const ids = e && e.brands.size ? [...e.brands] : (brandProp ? [brandProp] : []);
  if (ids.length === 0) return "—";
  return ids.map((id) => brandMap[id]).filter(Boolean).join(", ") || "—";
}

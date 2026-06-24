"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, Users, UserCheck, Target } from "lucide-react";
import type { Client } from "@/lib/data/clients";
import { ETAPA_LABEL, INDUSTRIAS } from "@/lib/ventas";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { NewLeadDialog } from "@/components/leads/new-lead-dialog";
import { SocialLinks } from "@/components/ui/social-links";
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

function StatChip({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: number }) {
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

export function ClientsTable({
  clients,
  brands,
}: {
  clients: Client[];
  brands: Brand[];
}) {
  const [q, setQ] = useState("");
  const [fEstado, setFEstado] = useState(""); // "" | "lead" | "activo"
  const [fIndustria, setFIndustria] = useState("");
  const [fCategoria, setFCategoria] = useState("");
  const [fMarca, setFMarca] = useState("");

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((b) => [b.id, b.nombre])),
    [brands],
  );
  // Lista completa de industrias (siempre disponible para filtrar) + cualquier
  // valor heredado en datos viejos que no esté en la lista canónica.
  const industrias = useMemo(() => {
    const extra = clients
      .map((c) => c.industria)
      .filter((i): i is string => !!i && !INDUSTRIAS.includes(i));
    return [...INDUSTRIAS, ...new Set(extra)];
  }, [clients]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return clients.filter((c) => {
      if (fEstado === "lead" && !c.es_lead) return false;
      if (fEstado === "activo" && c.es_lead) return false;
      if (fIndustria && c.industria !== fIndustria) return false;
      if (fCategoria && c.categoria_servicio !== fCategoria) return false;
      if (fMarca && c.brand_id !== fMarca) return false;
      if (term) {
        const hay = `${c.nombre} ${c.apellido ?? ""} ${c.correo ?? ""} ${c.telefono ?? ""} ${c.whatsapp ?? ""}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      return true;
    });
  }, [clients, q, fEstado, fIndustria, fCategoria, fMarca]);

  const totales = useMemo(() => ({
    total: clients.length,
    activos: clients.filter((c) => !c.es_lead).length,
    leads: clients.filter((c) => c.es_lead).length,
  }), [clients]);

  return (
    <div className="space-y-4">
      {/* Resumen rápido */}
      <div className="grid grid-cols-3 gap-3">
        <StatChip icon={Users} label="Total" value={totales.total} />
        <StatChip icon={UserCheck} label="Clientes activos" value={totales.activos} />
        <StatChip icon={Target} label="Prospectos" value={totales.leads} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, correo, teléfono…"
            className="h-9 w-full rounded-lg border border-border bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Select value={fEstado} onChange={(e) => setFEstado(e.target.value)} className="h-9 w-auto">
          <option value="">Todos</option>
          <option value="lead">Solo prospectos</option>
          <option value="activo">Solo clientes</option>
        </Select>
        <Select value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} className="h-9 w-auto">
          <option value="">Toda categoría</option>
          <option value="web">Web</option>
          <option value="software">Software</option>
          <option value="app">App</option>
          <option value="distribution">JM Distribution</option>
        </Select>
        <Select value={fIndustria} onChange={(e) => setFIndustria(e.target.value)} className="h-9 w-auto">
          <option value="">Toda industria</option>
          {industrias.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </Select>
        <Select value={fMarca} onChange={(e) => setFMarca(e.target.value)} className="h-9 w-auto">
          <option value="">Todas las marcas</option>
          {brands.map((b) => (
            <option key={b.id} value={b.id}>{b.nombre}</option>
          ))}
        </Select>
        <div className="ml-auto"><NewLeadDialog brands={brands} label="Nuevo cliente" /></div>
      </div>

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
                    {c.es_lead ? (
                      <Badge dot="var(--warning)">Prospecto</Badge>
                    ) : (
                      <Badge dot="var(--success)">Activo</Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {[c.categoria_servicio, c.industria, c.brand_id ? brandMap[c.brand_id] : null].filter(Boolean).join(" · ") || "Sin datos"}
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
                <th className="px-4 py-3 font-medium">Marca</th>
                <th className="px-4 py-3 font-medium">Contacto</th>
              </tr>
            </thead>
            <motion.tbody variants={containerVariants} initial="hidden" animate="show">
              {filtered.map((c) => (
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
                    {c.es_lead ? (
                      <Badge dot="var(--warning)">Prospecto · {ETAPA_LABEL[c.etapa_venta]}</Badge>
                    ) : (
                      <Badge dot="var(--success)">Cliente activo</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{c.categoria_servicio ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.industria ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.brand_id ? brandMap[c.brand_id] ?? "—" : "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground">{c.whatsapp ?? c.telefono ?? c.correo ?? "—"}</span>
                      <SocialLinks instagram={c.instagram} facebook={c.facebook} whatsapp={c.whatsapp ?? c.telefono} waText={`Hola ${c.nombre}!`} size="sm" />
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
        </>
      )}
    </div>
  );
}

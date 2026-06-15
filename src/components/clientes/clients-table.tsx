"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search } from "lucide-react";
import type { Client } from "@/lib/data/clients";
import { ETAPA_LABEL } from "@/lib/ventas";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { containerVariants, itemVariants } from "@/components/animations/motion";

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
  const industrias = useMemo(
    () => [...new Set(clients.map((c) => c.industria).filter(Boolean))] as string[],
    [clients],
  );

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

  return (
    <div className="space-y-4">
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
          <option value="lead">Solo leads</option>
          <option value="activo">Solo clientes</option>
        </Select>
        <Select value={fCategoria} onChange={(e) => setFCategoria(e.target.value)} className="h-9 w-auto">
          <option value="">Toda categoría</option>
          <option value="web">Web</option>
          <option value="software">Software</option>
          <option value="ambos">Ambos</option>
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
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
          No hay registros con estos filtros.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
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
                    <Link href={`/clientes/${c.id}`} className="font-medium hover:text-electric">
                      {c.nombre} {c.apellido ?? ""}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    {c.es_lead ? (
                      <Badge dot="var(--warning)">Lead · {ETAPA_LABEL[c.etapa_venta]}</Badge>
                    ) : (
                      <Badge dot="var(--success)">Cliente activo</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 capitalize text-muted-foreground">{c.categoria_servicio ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.industria ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.brand_id ? brandMap[c.brand_id] ?? "—" : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.whatsapp ?? c.telefono ?? c.correo ?? "—"}</td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}
    </div>
  );
}

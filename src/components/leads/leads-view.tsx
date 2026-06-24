"use client";

import { useMemo, useState } from "react";
import type { Client } from "@/lib/data/clients";
import { ETAPAS, INDUSTRIAS } from "@/lib/ventas";
import { LeadsTable } from "./leads-table";
import { NewLeadDialog } from "./new-lead-dialog";
import { Select } from "@/components/ui/select";

type Brand = { id: string; nombre: string };

export function LeadsView({ leads, brands }: { leads: Client[]; brands: Brand[] }) {
  const [fMarca, setFMarca] = useState("");
  const [fIndustria, setFIndustria] = useState("");
  const [fFuente, setFFuente] = useState("");
  const [fEtapa, setFEtapa] = useState("");

  const brandMap = useMemo(
    () => Object.fromEntries(brands.map((b) => [b.id, b.nombre])),
    [brands],
  );

  // Lista completa de industrias (siempre filtrable) + valores heredados.
  const industrias = useMemo(() => {
    const extra = leads
      .map((l) => l.industria)
      .filter((i): i is string => !!i && !INDUSTRIAS.includes(i));
    return [...INDUSTRIAS, ...new Set(extra)];
  }, [leads]);
  const fuentes = useMemo(
    () => [...new Set(leads.map((l) => l.fuente).filter(Boolean))] as string[],
    [leads],
  );

  const filtered = useMemo(
    () =>
      leads.filter(
        (l) =>
          (!fMarca || l.brand_id === fMarca) &&
          (!fIndustria || l.industria === fIndustria) &&
          (!fFuente || l.fuente === fFuente) &&
          (!fEtapa || l.etapa_venta === fEtapa),
      ),
    [leads, fMarca, fIndustria, fFuente, fEtapa],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          <Select value={fMarca} onChange={(e) => setFMarca(e.target.value)} className="h-9 w-auto">
            <option value="">Todas las marcas</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.nombre}</option>
            ))}
          </Select>
          <Select value={fIndustria} onChange={(e) => setFIndustria(e.target.value)} className="h-9 w-auto">
            <option value="">Toda industria</option>
            {industrias.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </Select>
          <Select value={fFuente} onChange={(e) => setFFuente(e.target.value)} className="h-9 w-auto">
            <option value="">Toda fuente</option>
            {fuentes.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </Select>
          <Select value={fEtapa} onChange={(e) => setFEtapa(e.target.value)} className="h-9 w-auto">
            <option value="">Toda etapa</option>
            {ETAPAS.map((e) => (
              <option key={e.id} value={e.id}>{e.label}</option>
            ))}
          </Select>
        </div>

        <NewLeadDialog brands={brands} />
      </div>

      <LeadsTable leads={filtered} brandMap={brandMap} />
    </div>
  );
}

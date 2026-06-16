"use client";

import { useMemo, useState } from "react";
import { LayoutGrid, Table2 } from "lucide-react";
import type { Client } from "@/lib/data/clients";
import { ETAPAS, INDUSTRIAS } from "@/lib/ventas";
import { KanbanBoard } from "./kanban-board";
import { LeadsTable } from "./leads-table";
import { NewLeadDialog } from "./new-lead-dialog";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Brand = { id: string; nombre: string };

export function LeadsView({ leads, brands }: { leads: Client[]; brands: Brand[] }) {
  const [mode, setMode] = useState<"kanban" | "table">("kanban");
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
          (mode === "kanban" || !fEtapa || l.etapa_venta === fEtapa),
      ),
    [leads, fMarca, fIndustria, fFuente, fEtapa, mode],
  );

  const filterKey = `${fMarca}|${fIndustria}|${fFuente}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg border border-border p-0.5">
          <button
            onClick={() => setMode("kanban")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              mode === "kanban" ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
          >
            <LayoutGrid className="size-4" /> Kanban
          </button>
          <button
            onClick={() => setMode("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              mode === "table" ? "bg-accent text-foreground" : "text-muted-foreground",
            )}
          >
            <Table2 className="size-4" /> Tabla
          </button>
        </div>

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
          {mode === "table" && (
            <Select value={fEtapa} onChange={(e) => setFEtapa(e.target.value)} className="h-9 w-auto">
              <option value="">Toda etapa</option>
              {ETAPAS.map((e) => (
                <option key={e.id} value={e.id}>{e.label}</option>
              ))}
            </Select>
          )}
        </div>

        <NewLeadDialog brands={brands} />
      </div>

      {mode === "kanban" ? (
        <KanbanBoard key={filterKey} leads={filtered} brandMap={brandMap} />
      ) : (
        <LeadsTable leads={filtered} brandMap={brandMap} />
      )}
    </div>
  );
}

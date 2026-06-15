"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ETAPA_LABEL } from "@/lib/ventas";
import type { Client } from "@/lib/data/clients";
import { Badge } from "@/components/ui/badge";
import { money } from "@/lib/format";
import { containerVariants, itemVariants } from "@/components/animations/motion";

export function LeadsTable({
  leads,
  brandMap,
}: {
  leads: Client[];
  brandMap: Record<string, string>;
}) {
  if (leads.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-sm text-muted-foreground">
        No hay leads con estos filtros.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border">
      <table className="w-full text-sm">
        <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="px-4 py-3 font-medium">Nombre</th>
            <th className="px-4 py-3 font-medium">Etapa</th>
            <th className="px-4 py-3 font-medium">Valor est.</th>
            <th className="px-4 py-3 font-medium">Industria</th>
            <th className="px-4 py-3 font-medium">Fuente</th>
            <th className="px-4 py-3 font-medium">Marca</th>
          </tr>
        </thead>
        <motion.tbody variants={containerVariants} initial="hidden" animate="show">
          {leads.map((l) => (
            <motion.tr
              key={l.id}
              variants={itemVariants}
              className="border-t border-border transition-colors hover:bg-accent/40"
            >
              <td className="px-4 py-3">
                <Link href={`/clientes/${l.id}`} className="font-medium hover:text-electric">
                  {l.nombre} {l.apellido ?? ""}
                </Link>
                {l.lo_que_quiere && (
                  <p className="line-clamp-1 text-xs text-muted-foreground">{l.lo_que_quiere}</p>
                )}
              </td>
              <td className="px-4 py-3">
                <Badge>{ETAPA_LABEL[l.etapa_venta]}</Badge>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {l.valor_estimado != null ? money(l.valor_estimado, l.valor_estimado_moneda) : "—"}
              </td>
              <td className="px-4 py-3 text-muted-foreground">{l.industria ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">{l.fuente ?? "—"}</td>
              <td className="px-4 py-3 text-muted-foreground">
                {l.brand_id ? brandMap[l.brand_id] ?? "—" : "—"}
              </td>
            </motion.tr>
          ))}
        </motion.tbody>
      </table>
    </div>
  );
}

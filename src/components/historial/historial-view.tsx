"use client";

import { Fragment, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, ShieldCheck, Search } from "lucide-react";
import type { AuditRow } from "@/lib/data/auditoria";
import { fechaHora } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

const ACCION_COLOR: Record<string, string> = {
  INSERT: "var(--success)", UPDATE: "var(--electric)", DELETE: "var(--destructive)",
};
const ACCION_LABEL: Record<string, string> = { INSERT: "Creado", UPDATE: "Editado", DELETE: "Borrado" };

export function HistorialView({ rows, tablas }: { rows: AuditRow[]; tablas: string[] }) {
  const router = useRouter();
  const params = useSearchParams();
  const [openId, setOpenId] = useState<string | null>(null);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(params.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.push(`/historial?${p.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
        <ShieldCheck className="size-4" /> Registro inmutable: nadie puede borrar ni editar esta auditoría (garantizado por la base de datos).
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={params.get("accion") ?? ""} onChange={(e) => setParam("accion", e.target.value)} className="h-9 w-auto">
          <option value="">Toda acción</option>
          <option value="INSERT">Creado</option>
          <option value="UPDATE">Editado</option>
          <option value="DELETE">Borrado</option>
        </Select>
        <Select value={params.get("tabla") ?? ""} onChange={(e) => setParam("tabla", e.target.value)} className="h-9 w-auto">
          <option value="">Toda tabla</option>
          {tablas.map((t) => <option key={t} value={t}>{t}</option>)}
        </Select>
        <Input type="date" defaultValue={params.get("desde") ?? ""} onChange={(e) => setParam("desde", e.target.value)} className="h-9 w-auto" />
        <Input type="date" defaultValue={params.get("hasta") ?? ""} onChange={(e) => setParam("hasta", e.target.value)} className="h-9 w-auto" />
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="ID de registro…" defaultValue={params.get("q") ?? ""} onBlur={(e) => setParam("q", e.target.value)} className="h-9 w-44 pl-9" />
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border px-6 py-12 text-center text-sm text-muted-foreground">Sin registros con estos filtros.</div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr><th className="px-4 py-3">Acción</th><th className="px-4 py-3">Tabla</th><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Fecha</th><th className="px-4 py-3"></th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <Fragment key={r.id}>
                  <tr className="border-t border-border hover:bg-accent/30">
                    <td className="px-4 py-2.5"><Badge dot={ACCION_COLOR[r.accion]}>{ACCION_LABEL[r.accion] ?? r.accion}</Badge></td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.tabla}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{r.usuarioNombre}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{fechaHora(r.fecha)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setOpenId(openId === r.id ? null : r.id)} className="text-muted-foreground hover:text-foreground">
                        <ChevronDown className={`size-4 transition-transform ${openId === r.id ? "rotate-180" : ""}`} />
                      </button>
                    </td>
                  </tr>
                  {openId === r.id && (
                    <tr className="border-t border-border bg-background/40">
                      <td colSpan={5} className="px-4 py-3">
                        <p className="mb-1 text-xs text-muted-foreground">Registro: {r.registro_id ?? "—"}</p>
                        <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-card p-3 text-xs">{JSON.stringify(r.contenido_json, null, 2)}</pre>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

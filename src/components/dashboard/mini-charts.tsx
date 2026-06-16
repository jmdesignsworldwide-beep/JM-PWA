import { ETAPA_LABEL } from "@/lib/ventas";
import type { EtapaVenta } from "@/lib/ventas";

const PROJ_LABEL: Record<string, string> = {
  pendiente: "Pendiente", en_progreso: "En progreso", entregado: "Entregado", pagado: "Pagado", cancelado: "Cancelado",
};

export function FunnelChart({ data }: { data: { etapa: string; count: number }[] }) {
  const max = Math.max(1, ...data.map((d) => d.count));
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 font-semibold">Embudo de conversión (leads)</h3>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.etapa} className="flex items-center gap-3 text-sm">
            <span className="w-32 shrink-0 text-xs text-muted-foreground">{ETAPA_LABEL[d.etapa as EtapaVenta] ?? d.etapa}</span>
            <div className="h-5 flex-1 rounded bg-secondary">
              <div className="flex h-full items-center justify-end rounded bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))] px-2 text-[10px] font-medium text-white"
                style={{ width: `${Math.max(6, (d.count / max) * 100)}%` }}>{d.count > 0 ? d.count : ""}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StatusChart({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data);
  const total = entries.reduce((s, [, n]) => s + n, 0);
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h3 className="mb-4 font-semibold">Proyectos por estado</h3>
      {total === 0 ? <p className="text-sm text-muted-foreground">Aún no hay proyectos.</p> : (
        <div className="space-y-2">
          {entries.map(([estado, n]) => (
            <div key={estado} className="flex items-center gap-3 text-sm">
              <span className="w-28 shrink-0 text-xs text-muted-foreground">{PROJ_LABEL[estado] ?? estado}</span>
              <div className="h-2 flex-1 rounded-full bg-secondary"><div className="h-full rounded-full bg-electric" style={{ width: `${(n / total) * 100}%` }} /></div>
              <span className="w-6 text-right text-xs">{n}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

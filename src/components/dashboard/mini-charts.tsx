const PROJ_LABEL: Record<string, string> = {
  pendiente: "Pendiente", en_progreso: "En progreso", entregado: "Entregado", pagado: "Pagado", cancelado: "Cancelado",
};

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

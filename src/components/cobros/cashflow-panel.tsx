import { money } from "@/lib/format";
import { cn } from "@/lib/utils";

type Bucket = { DOP: number; USD: number };
type Cashflow = {
  vencido: Bucket;
  estaSemana: Bucket;
  proxSemana: Bucket;
  esteMes: Bucket;
};

function Amounts({ b }: { b: Bucket }) {
  const has = b.DOP !== 0 || b.USD !== 0;
  if (!has) return <p className="text-lg font-semibold text-muted-foreground">—</p>;
  return (
    <div>
      {b.DOP !== 0 && <p className="text-lg font-semibold">{money(b.DOP, "DOP")}</p>}
      {b.USD !== 0 && <p className="text-sm font-medium text-muted-foreground">{money(b.USD, "USD")}</p>}
    </div>
  );
}

export function CashflowPanel({ data }: { data: Cashflow }) {
  const cards: { key: keyof Cashflow; label: string; danger?: boolean }[] = [
    { key: "vencido", label: "Vencido", danger: true },
    { key: "estaSemana", label: "Esta semana" },
    { key: "proxSemana", label: "Próxima semana" },
    { key: "esteMes", label: "Este mes" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className={cn(
            "rounded-xl border p-4",
            c.danger ? "border-destructive/40 bg-destructive/10" : "border-border bg-card",
          )}
        >
          <p className={cn("text-xs font-medium uppercase tracking-wide", c.danger ? "text-destructive" : "text-muted-foreground")}>
            {c.label}
          </p>
          <div className="mt-2">
            <Amounts b={data[c.key]} />
          </div>
        </div>
      ))}
    </div>
  );
}

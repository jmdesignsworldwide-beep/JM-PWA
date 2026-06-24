import { AlertTriangle, Clock, CalendarClock, CalendarDays, type LucideIcon } from "lucide-react";
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
  const cards: { key: keyof Cashflow; label: string; icon: LucideIcon; danger?: boolean }[] = [
    { key: "vencido", label: "Vencido", icon: AlertTriangle, danger: true },
    { key: "estaSemana", label: "Esta semana", icon: Clock },
    { key: "proxSemana", label: "Próxima semana", icon: CalendarClock },
    { key: "esteMes", label: "Este mes", icon: CalendarDays },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.key}
            className={cn(
              "rounded-xl border p-4 transition-all hover:shadow-md",
              c.danger ? "border-destructive/40 bg-destructive/10 hover:border-destructive/60" : "border-border bg-card hover:border-electric/40",
            )}
          >
            <div className="flex items-center justify-between">
              <p className={cn("text-xs font-medium uppercase tracking-wide", c.danger ? "text-destructive" : "text-muted-foreground")}>
                {c.label}
              </p>
              <Icon className={cn("size-4", c.danger ? "text-destructive" : "text-electric")} />
            </div>
            <div className="mt-2">
              <Amounts b={data[c.key]} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

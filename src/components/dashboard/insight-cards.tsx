import { TrendingUp, AlertTriangle, CircleDollarSign, Clock, Star, Lightbulb } from "lucide-react";
import type { Insight } from "@/lib/data/insights";

const ICONS = {
  trend: TrendingUp, warn: AlertTriangle, money: CircleDollarSign, clock: Clock, star: Star,
};

export function InsightCards({ insights }: { insights: Insight[] }) {
  if (insights.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-5 py-8 text-center text-sm text-muted-foreground">
        <Lightbulb className="mx-auto mb-2 size-5" />
        Aún no hay suficientes datos para insights. Mientras más uses el sistema, más aprende.
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {insights.map((i, idx) => {
        const Icon = ICONS[i.icon];
        return (
          <div key={idx} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-electric">
              <Icon className="size-4" />
            </div>
            <p className="text-sm leading-relaxed">{i.texto}</p>
          </div>
        );
      })}
    </div>
  );
}

import Link from "next/link";
import { CalendarDays, CalendarRange, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type Vista = "dia" | "semana" | "mes";

/** Selector Día · Semana · Mes. Cambia de vista por URL (?v=…&d=…). */
export function CalendarViewSwitcher({ vista, anchor, month }: { vista: Vista; anchor: string; month: string }) {
  const opts: { id: Vista; label: string; href: string; icon: typeof Calendar }[] = [
    { id: "dia", label: "Día", href: `/calendario?v=dia&d=${anchor}`, icon: CalendarDays },
    { id: "semana", label: "Semana", href: `/calendario?v=semana&d=${anchor}`, icon: CalendarRange },
    { id: "mes", label: "Mes", href: `/calendario?m=${month}`, icon: Calendar },
  ];
  return (
    <div className="inline-flex rounded-lg border border-border p-0.5">
      {opts.map((o) => {
        const Icon = o.icon;
        const active = vista === o.id;
        return (
          <Link key={o.id} href={o.href}
            className={cn("flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
              active ? "bg-accent text-foreground" : "text-muted-foreground hover:bg-accent/40")}>
            <Icon className="size-4" /> {o.label}
          </Link>
        );
      })}
    </div>
  );
}

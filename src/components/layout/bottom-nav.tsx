"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { LayoutDashboard, Target, Users, CalendarClock, Menu, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Item = { label: string; href: string; icon: LucideIcon };

/** Accesos principales (pulgar). El resto del menú vive tras "Más". */
const PRIMARY: Item[] = [
  { label: "Inicio", href: "/", icon: LayoutDashboard },
  { label: "Prospectos", href: "/leads", icon: Target },
  { label: "Clientes", href: "/clientes", icon: Users },
  { label: "Cobros", href: "/cobros", icon: CalendarClock },
];

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Barra de navegación inferior (solo móvil/tablet). En escritorio se usa el
 * sidebar. "Más" abre el menú completo (el drawer del AppShell).
 */
export function BottomNav({ onMore, hidden = [] }: { onMore: () => void; hidden?: string[] }) {
  const pathname = usePathname();
  // "/" (Inicio) siempre visible; el resto se puede ocultar desde Configuración.
  const items = PRIMARY.filter((item) => item.href === "/" || !hidden.includes(item.href));

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-safe backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md" style={{ gridTemplateColumns: `repeat(${items.length + 1}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                active ? "text-primary" : "text-foreground/75",
              )}
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute top-0 h-0.5 w-10 rounded-full bg-[linear-gradient(90deg,var(--electric),var(--brand-purple))]"
                />
              )}
              <Icon className="size-[22px]" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={onMore}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold text-foreground/75 transition-colors active:text-primary"
        >
          <Menu className="size-[22px]" />
          <span>Más</span>
        </button>
      </div>
    </nav>
  );
}

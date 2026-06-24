"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { NAV_ITEMS } from "@/lib/nav";
import { LogoWordmark } from "@/components/brand/logo";
import { InstallButton } from "@/components/pwa/install-button";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Dashboard y Configuración nunca se ocultan (para no perder el acceso). */
const SIEMPRE_VISIBLE = ["/", "/configuracion"];

export function Sidebar({ onNavigate, hidden = [] }: { onNavigate?: () => void; hidden?: string[] }) {
  const pathname = usePathname();
  const items = NAV_ITEMS.filter((i) => SIEMPRE_VISIBLE.includes(i.href) || !hidden.includes(i.href));

  return (
    <div className="flex h-full flex-col gap-2 border-r border-border bg-card/40 backdrop-blur-xl">
      <div className="flex h-16 items-center px-5">
        <LogoWordmark />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-2">
        {items.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={cn(
                "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "text-foreground"
                  : "text-foreground/70 hover:text-foreground",
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 rounded-lg border border-border bg-[linear-gradient(90deg,color-mix(in_srgb,var(--electric)_18%,transparent),color-mix(in_srgb,var(--brand-purple)_12%,transparent))]"
                />
              )}
              {active && (
                <span className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full bg-[linear-gradient(180deg,var(--electric),var(--brand-purple))]" />
              )}
              <Icon
                className={cn(
                  "relative z-10 size-[18px] shrink-0 transition-colors",
                  active && "text-electric",
                )}
              />
              <span className="relative z-10 truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-3">
        <InstallButton className="w-full justify-center" />
        <p className="mt-3 px-1 text-center text-[10px] text-muted-foreground">
          v0.1 · Fase 1 · Fundación
        </p>
      </div>
    </div>
  );
}

"use client";

import { Bell, Menu, Search } from "lucide-react";
import { BrandSelector } from "./brand-selector";
import { UserMenu } from "./user-menu";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";

export function Topbar({
  email,
  onMenuClick,
}: {
  email: string;
  onMenuClick: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onMenuClick}
        aria-label="Abrir menú"
      >
        <Menu />
      </Button>

      {/* Buscador global (placeholder en Fase 1) */}
      <div className="relative flex-1 max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Buscar leads, clientes, pedidos…"
          className="h-9 w-full rounded-lg border border-border bg-background/50 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <BrandSelector />
        <ThemeToggle />
        <Button
          variant="ghost"
          size="icon"
          aria-label="Notificaciones"
          className="relative"
        >
          <Bell />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-electric ring-2 ring-background" />
        </Button>
        <UserMenu email={email} />
      </div>
    </header>
  );
}

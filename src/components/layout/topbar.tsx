"use client";

import { Menu } from "lucide-react";
import { BrandSelector } from "./brand-selector";
import { UserMenu } from "./user-menu";
import { NotificationsBell } from "./notifications-bell";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { GlobalSearch } from "@/components/search/global-search";
import { Button } from "@/components/ui/button";
import type { AgendaEvent } from "@/lib/data/agenda";

export function Topbar({
  email,
  onMenuClick,
  alerts,
}: {
  email: string;
  onMenuClick: () => void;
  alerts: { count: number; items: AgendaEvent[] };
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

      {/* Buscador global */}
      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <BrandSelector />
        <ThemeToggle />
        <NotificationsBell count={alerts.count} items={alerts.items} />
        <UserMenu email={email} />
      </div>
    </header>
  );
}

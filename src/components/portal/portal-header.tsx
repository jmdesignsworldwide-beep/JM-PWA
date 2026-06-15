"use client";

import { useRouter } from "next/navigation";
import { LogOut, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { EMPRESA } from "@/lib/empresa";

export function PortalHeader({ brandName }: { brandName: string | null }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/portal/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-background/70 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-2.5">
        <Logo size={30} />
        <div className="leading-tight">
          <p className="text-sm font-semibold">{brandName ?? EMPRESA.nombre}</p>
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Portal de cliente</p>
        </div>
      </div>
      <div className="ml-auto flex items-center gap-1.5">
        <a href={`https://wa.me/${EMPRESA.whatsapp}`} target="_blank" rel="noopener noreferrer">
          <Button variant="outline" size="sm" className="gap-2 text-success">
            <MessageCircle className="size-4" /> <span className="hidden sm:inline">Contactar a JM</span>
          </Button>
        </a>
        <ThemeToggle />
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Cerrar sesión">
          <LogOut className="size-4" />
        </Button>
      </div>
    </header>
  );
}

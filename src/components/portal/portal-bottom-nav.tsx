"use client";

import { Rocket, CircleDollarSign, FolderDown, MessageCircle } from "lucide-react";
import { EMPRESA } from "@/lib/empresa";

/**
 * Barra inferior del portal (solo móvil). Salta a las secciones de la página
 * y deja el contacto de WhatsApp al alcance del pulgar.
 */
export function PortalBottomNav() {
  const items = [
    { label: "Proyecto", href: "#journey", icon: Rocket },
    { label: "Facturas", href: "#facturas", icon: CircleDollarSign },
    { label: "Docs", href: "#documentos", icon: FolderDown },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/85 pb-safe backdrop-blur-xl sm:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4">
        {items.map((it) => {
          const Icon = it.icon;
          return (
            <a key={it.href} href={it.href} className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground active:text-electric">
              <Icon className="size-[22px]" />
              <span>{it.label}</span>
            </a>
          );
        })}
        <a
          href={`https://wa.me/${EMPRESA.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium text-success"
        >
          <MessageCircle className="size-[22px]" />
          <span>Contacto</span>
        </a>
      </div>
    </nav>
  );
}

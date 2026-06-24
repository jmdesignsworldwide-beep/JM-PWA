"use client";

import { instagramUrl, facebookUrl, whatsappUrl } from "@/lib/social";
import { cn } from "@/lib/utils";

/**
 * Fila de botones sociales clicables (Instagram · Facebook · WhatsApp).
 * Reutilizable en Clientes, Prospectos e Influencers. Cada botón abre en una
 * pestaña nueva y frena la propagación (sirve dentro de tarjetas/links).
 * Usa SVGs de marca propios porque lucide ya no trae íconos de marca.
 */
export function SocialLinks({
  instagram, facebook, whatsapp, waText, size = "md", className,
}: {
  instagram?: string | null;
  facebook?: string | null;
  whatsapp?: string | null;
  waText?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const ig = instagramUrl(instagram);
  const fb = facebookUrl(facebook);
  const wa = whatsappUrl(whatsapp, waText);
  if (!ig && !fb && !wa) return null;

  const box = size === "sm" ? "size-7" : "size-8";
  const icon = size === "sm" ? "size-3.5" : "size-4";

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {ig && <SocialBtn href={ig} label="Instagram" box={box} color="#E1306C"><IgIcon className={icon} /></SocialBtn>}
      {fb && <SocialBtn href={fb} label="Facebook" box={box} color="#1877F2"><FbIcon className={icon} /></SocialBtn>}
      {wa && <SocialBtn href={wa} label="WhatsApp" box={box} color="#25D366"><WaIcon className={icon} /></SocialBtn>}
    </div>
  );
}

function SocialBtn({
  href, label, box, color, children,
}: {
  href: string; label: string; box: string; color: string; children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      title={label}
      onClick={(e) => e.stopPropagation()}
      className={cn(
        "flex items-center justify-center rounded-lg border border-border bg-background/40 text-muted-foreground transition-all hover:scale-105 hover:text-white",
        box,
      )}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = color; e.currentTarget.style.borderColor = color; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = ""; e.currentTarget.style.borderColor = ""; }}
    >
      {children}
    </a>
  );
}

function IgIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.78-3.89 1.09 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.45 2.89h-2.33v6.99A10 10 0 0 0 22 12z" />
    </svg>
  );
}

function WaIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M.057 24l1.687-6.163a11.867 11.867 0 0 1-1.587-5.946C.16 5.335 5.495 0 12.05 0a11.817 11.817 0 0 1 8.413 3.488 11.824 11.824 0 0 1 3.48 8.414c-.003 6.557-5.338 11.892-11.893 11.892a11.9 11.9 0 0 1-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884a9.86 9.86 0 0 0 1.51 5.26l-.999 3.648 3.752-.983.227.136zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

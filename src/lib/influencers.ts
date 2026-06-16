export type InfluencerEstado =
  | "nuevo" | "escrito" | "respondio" | "negociando" | "acuerdo" | "descartado";

/** Estados del pipeline de influencers (outbound) — SEPARADO de leads. */
export const INFLUENCER_ESTADOS: { id: InfluencerEstado; label: string; color: string }[] = [
  { id: "nuevo", label: "Sin contactar", color: "var(--muted-foreground)" },
  { id: "escrito", label: "Escrito", color: "var(--electric)" },
  { id: "respondio", label: "Respondió", color: "#38bdf8" },
  { id: "negociando", label: "Negociando", color: "var(--brand-purple)" },
  { id: "acuerdo", label: "Dijo SÍ / Acuerdo", color: "var(--success)" },
  { id: "descartado", label: "Dijo NO / Cerrado", color: "var(--destructive)" },
];

export const INFLUENCER_ESTADO_LABEL: Record<InfluencerEstado, string> = Object.fromEntries(
  INFLUENCER_ESTADOS.map((e) => [e.id, e.label]),
) as Record<InfluencerEstado, string>;

/** Extrae el @handle de una URL de Instagram. */
export function igHandle(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) return `@${m[1].replace(/\/$/, "")}`;
  if (/^@?[A-Za-z0-9._]+$/.test(url.trim())) return `@${url.trim().replace(/^@/, "")}`;
  return null;
}

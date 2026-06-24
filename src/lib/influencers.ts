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

/** Estado general del TRATO de colaboración (distinto del pipeline de outreach). */
export type EstadoTrato = "propuesto" | "acordado" | "activo" | "completado" | "no_concreto";
export const ESTADOS_TRATO: { id: EstadoTrato; label: string }[] = [
  { id: "propuesto", label: "Propuesto" },
  { id: "acordado", label: "Acordado" },
  { id: "activo", label: "Activo" },
  { id: "completado", label: "Completado" },
  { id: "no_concreto", label: "No se concretó" },
];
export const ESTADO_TRATO_LABEL: Record<EstadoTrato, string> = Object.fromEntries(
  ESTADOS_TRATO.map((e) => [e.id, e.label]),
) as Record<EstadoTrato, string>;

/** Redes soportadas en una colaboración. */
export const REDES = ["Instagram", "TikTok", "YouTube", "Facebook", "X / Twitter", "Otra"] as const;
/** Tipos de promoción que el influencer entrega. */
export const PROMO_TIPOS = ["Post", "Reel / Video", "Story", "Mención", "Reseña", "Otro"] as const;

/** Una plataforma del influencer (se guarda en jsonb plataformas[]). */
export type Plataforma = { red: string; handle: string; seguidores: string; engagement: string };
/** Una promoción acordada (se guarda en jsonb promos[]). */
export type Promo = { tipo: string; cantidad: number; plataforma: string; valor: number; moneda: "DOP" | "USD"; fecha: string };

/** Extrae el @handle de una URL de Instagram. */
export function igHandle(url: string | null): string | null {
  if (!url) return null;
  const m = url.match(/instagram\.com\/([A-Za-z0-9._]+)/i);
  if (m) return `@${m[1].replace(/\/$/, "")}`;
  if (/^@?[A-Za-z0-9._]+$/.test(url.trim())) return `@${url.trim().replace(/^@/, "")}`;
  return null;
}

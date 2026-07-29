// Constantes y tipos client-safe del módulo Mis Proyectos (Incubadora).
// (Las funciones de datos que tocan Supabase viven en @/lib/data/ventures.)

/** Metadatos de mercado para la encuesta ONLINE (se guarda en perfil_json). */
export const MERCADOS = ["Mundial", "Solo RD", "RD + Estados Unidos", "Latinoamérica"] as const;
export const TAMANOS_LOCAL = ["Pequeño", "Mediano", "Grande"] as const;

/** Perfil flexible (encuesta online/físico) guardado en ventures.perfil_json. */
export type VenturePerfil = {
  mercado?: string;
  metas?: string;
  ciudad?: string;
  sucursales?: string;   // "una" | "varias"
  tamano?: string;
  colores?: string;
};

export type RedTipo = "instagram" | "facebook" | "tiktok" | "whatsapp" | "web";

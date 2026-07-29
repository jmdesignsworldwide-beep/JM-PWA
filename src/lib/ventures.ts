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

/** Un campo/sección de una idea (plantilla o propio). */
export type IdeaCampo = { label: string; valor: string };

/** Tipos de idea con su plantilla base de campos. Siempre editable + campos libres. */
export const IDEA_TIPOS: { id: string; label: string; campos: string[] }[] = [
  { id: "app", label: "App", campos: ["Nombre", "Para qué sirve", "Pantallas / secciones", "Funciones", "Público", "Notas"] },
  { id: "local", label: "Local físico", campos: ["Nombre", "Concepto", "Ubicación / zona", "Productos / servicios", "Público", "Notas"] },
  { id: "servicio", label: "Servicio online", campos: ["Nombre", "Qué ofrece", "Cómo funciona", "Canales", "Público", "Notas"] },
  { id: "tienda", label: "Tienda", campos: ["Nombre", "Qué vende", "Catálogo / productos", "Canales de venta", "Público", "Notas"] },
  { id: "otro", label: "Libre", campos: ["Nombre", "Notas"] },
];

/** Plantilla de campos (vacíos) para un tipo de idea. */
export function ideaTemplate(tipo: string): IdeaCampo[] {
  const t = IDEA_TIPOS.find((x) => x.id === tipo) ?? IDEA_TIPOS[IDEA_TIPOS.length - 1];
  return t.campos.map((label) => ({ label, valor: "" }));
}

import type { Row } from "@/lib/database.types";

// Nota: las "etapas de venta" (pipeline por etapas) se retiraron. Se conserva
// solo el tipo EtapaVenta porque la columna sigue en la BD y algunos writes la
// rellenan con un valor válido ("nuevo" para prospecto, "ganado" para cliente).
export type EtapaVenta = Row<"clients">["etapa_venta"];

/** Categoría de servicio (4 opciones). */
export const CATEGORIAS_SERVICIO = [
  { id: "web", label: "Web" },
  { id: "software", label: "Software" },
  { id: "app", label: "App" },
  { id: "distribution", label: "JM Distribution" },
] as const;

export type CategoriaServicio = (typeof CATEGORIAS_SERVICIO)[number]["id"];

/** Listado de industrias (RD). Editable. */
export const INDUSTRIAS = [
  "Automotriz",
  "Legal",
  "Contable / Finanzas",
  "Salud y Belleza",
  "Retail / Comercio",
  "Construcción",
  "Turismo / Hotelería",
  "Restaurantes / Food",
  "Educación",
  "Tecnología",
  "Manufactura",
  "Logística / Transporte",
  "Agropecuario",
  "Servicios profesionales",
  "Inmobiliaria",
  "Entretenimiento",
  "ONG / Religioso",
  "Belleza / Estética",
  "Deportes / Fitness",
  "General / Otro",
];

/** Fuentes de origen del lead. */
export const FUENTES = [
  "Instagram",
  "Facebook",
  "TikTok",
  "WhatsApp",
  "Referido",
  "Página web",
  "Google",
  "Evento",
  "Otro",
];

/** Opciones para el Combobox con búsqueda (value/label). */
export const CATEGORIA_OPTIONS = CATEGORIAS_SERVICIO.map((c) => ({ value: c.id, label: c.label }));
export const INDUSTRIA_OPTIONS = INDUSTRIAS.map((i) => ({ value: i, label: i }));
export const FUENTE_OPTIONS = FUENTES.map((f) => ({ value: f, label: f }));

/** Pasos del ciclo de vida del cliente (barra visual). */
export const CICLO_VIDA = [
  "Prospecto",
  "Pedido",
  "Contrato",
  "Facturado",
  "En progreso",
  "Entregado",
  "Pagado",
] as const;

export type CicloPaso = (typeof CICLO_VIDA)[number];

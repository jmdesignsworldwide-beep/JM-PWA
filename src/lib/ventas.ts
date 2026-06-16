import type { Row } from "@/lib/database.types";

export type EtapaVenta = Row<"clients">["etapa_venta"];

/** Etapas del pipeline INBOUND de ventas (orden del Kanban). */
export const ETAPAS: {
  id: EtapaVenta;
  label: string;
  color: string;
}[] = [
  { id: "nuevo", label: "Nuevo lead", color: "var(--electric)" },
  { id: "contactado", label: "Contactado", color: "#38bdf8" },
  { id: "cotizado", label: "Cotizado", color: "var(--brand-purple)" },
  { id: "contrato_enviado", label: "Contrato enviado", color: "#f59e0b" },
  { id: "ganado", label: "Ganado", color: "var(--success)" },
  { id: "perdido", label: "Perdido", color: "var(--destructive)" },
];

export const ETAPA_LABEL: Record<EtapaVenta, string> = Object.fromEntries(
  ETAPAS.map((e) => [e.id, e.label]),
) as Record<EtapaVenta, string>;

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
  "Restaurante / Food",
  "Retail / Tienda",
  "Salud / Clínica",
  "Belleza / Spa",
  "Inmobiliaria",
  "Construcción",
  "Educación",
  "Servicios profesionales",
  "Tecnología",
  "Turismo / Hotelería",
  "Transporte / Logística",
  "Manufactura",
  "Finanzas / Seguros",
  "ONG / Fundación",
  "Entretenimiento / Eventos",
  "Moda",
  "Automotriz",
  "Agropecuario",
  "Otro",
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
  "Lead",
  "Pedido",
  "Contrato",
  "Facturado",
  "En progreso",
  "Entregado",
  "Pagado",
] as const;

export type CicloPaso = (typeof CICLO_VIDA)[number];

import type { PlanPagoItem } from "@/app/(app)/pedidos/actions";

/** Estado del pedido (los tres que permite la BD). */
export type OrderEstado = "activo" | "completado" | "cancelado";

/**
 * Estados del pedido. Un pedido nuevo nace "activo". "completado" llega al
 * saldar el 100% (o a mano); "cancelado" es manual.
 */
export const ORDER_ESTADOS: { id: OrderEstado; label: string; color: string }[] = [
  { id: "activo", label: "Activo", color: "var(--electric)" },
  { id: "completado", label: "Completado", color: "var(--success)" },
  { id: "cancelado", label: "Cancelado", color: "var(--destructive)" },
];

export const ORDER_ESTADO_LABEL: Record<OrderEstado, string> = Object.fromEntries(
  ORDER_ESTADOS.map((e) => [e.id, e.label]),
) as Record<OrderEstado, string>;

export const ORDER_ESTADO_COLOR: Record<OrderEstado, string> = Object.fromEntries(
  ORDER_ESTADOS.map((e) => [e.id, e.color]),
) as Record<OrderEstado, string>;

/**
 * Calcula el estado que debería tener el pedido tras un pago: al saldar el 100%
 * pasa a "completado". Nunca revive un "cancelado". Devuelve null si no cambia.
 */
export function siguienteEstadoPorPago(
  actual: string, total: number, pagado: number,
): OrderEstado | null {
  if (actual === "cancelado" || actual === "completado") return null;
  const saldado = total > 0 && pagado >= total;
  return saldado ? "completado" : null;
}

/** Catálogo base de imprenta (JM Distribution). */
export const PRINT_CATEGORIAS = [
  "Gorras",
  "T-shirts",
  "Bordado",
  "Sublimado",
  "Letreros",
  "Stickers",
  "Banners",
  "Papelería",
  "Vinil",
  "Gran formato",
  "Otros",
];

export const TIPOS_SOLUCION = [
  "Sitio web",
  "Tienda online",
  "App móvil",
  "Sistema a la medida",
  "Sistema POS / Inventario",
  "Landing page",
  "Branding / Identidad",
  "Otro",
];

export const ITBIS_RATE = 0.18;

/**
 * Presets de regla de pago. `diasEntrega` = días desde hoy hasta la entrega
 * (se usa como offset de los cobros "a la entrega").
 */
export function planPresets(diasEntrega: number): {
  id: string;
  label: string;
  plan: PlanPagoItem[];
}[] {
  const entrega = Math.max(0, diasEntrega);
  const mid = Math.round(entrega / 2);
  return [
    {
      id: "completo",
      label: "Pago único (100%)",
      plan: [{ label: "Pago único", porcentaje: 100, offset_dias: 0 }],
    },
    {
      id: "50_50",
      label: "50% inicio / 50% entrega",
      plan: [
        { label: "Inicial", porcentaje: 50, offset_dias: 0 },
        { label: "A la entrega", porcentaje: 50, offset_dias: entrega },
      ],
    },
    {
      id: "deposito_30",
      label: "Depósito 30% / 70% entrega",
      plan: [
        { label: "Depósito", porcentaje: 30, offset_dias: 0 },
        { label: "A la entrega", porcentaje: 70, offset_dias: entrega },
      ],
    },
    {
      id: "tres",
      label: "3 pagos (40 / 30 / 30)",
      plan: [
        { label: "Inicial", porcentaje: 40, offset_dias: 0 },
        { label: "Avance", porcentaje: 30, offset_dias: mid },
        { label: "A la entrega", porcentaje: 30, offset_dias: entrega },
      ],
    },
  ];
}

/** Días entre hoy y una fecha ISO futura (>= 0). */
export function diasHasta(fechaISO: string | null | undefined): number {
  if (!fechaISO) return 14;
  const ms = new Date(fechaISO).getTime() - Date.now();
  return Math.max(0, Math.round(ms / 86400000));
}

/** Días transcurridos desde una fecha ISO pasada (>= 0). */
export function diasDesde(fechaISO: string | null | undefined): number {
  if (!fechaISO) return 0;
  const ms = Date.now() - new Date(fechaISO).getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

/** Color de antigüedad del contrato sin firmar (más viejo = más urgente). */
export function antiguedadColor(dias: number): { label: string; color: string } {
  if (dias <= 1) return { label: "Recién enviado", color: "var(--success)" };
  if (dias <= 3) return { label: `Enviado hace ${dias} días`, color: "var(--electric)" };
  if (dias <= 7) return { label: `Sin firmar · ${dias} días`, color: "var(--warning)" };
  return { label: `Sin firmar · ${dias} días`, color: "var(--destructive)" };
}

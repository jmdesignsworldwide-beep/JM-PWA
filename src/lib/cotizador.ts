/** Banco de módulos y catálogos para el Cotizador (Rama Software / JM Nexus Designs). */

export const TIPOS_SOLUCION_COT = [
  "Sitio web",
  "Software / Sistema",
  "CRM",
  "ERP",
  "App móvil",
  "E-commerce",
  "A la medida",
];

export const INDUSTRIAS_COT = [
  "Automotriz",
  "Legal",
  "Contable/Financiero",
  "Salud y Belleza",
  "Retail/Comercio",
  "Construcción/Inmobiliaria",
  "Turismo/Hotelería",
  "Restaurantes/Food",
  "Educación",
  "Tecnología/Software",
  "Manufactura/Industrial",
  "Logística/Transporte",
  "Agropecuario",
  "Servicios profesionales",
  "Entretenimiento/Eventos",
  "ONG/Religioso",
  "General/Otro",
];

export type Modulo = { id: string; label: string };

export const MODULOS: Modulo[] = [
  { id: "clientes", label: "Gestión de clientes" },
  { id: "facturacion", label: "Facturación NCF/e-CF" },
  { id: "inventario", label: "Inventario" },
  { id: "finanzas", label: "Control financiero" },
  { id: "nominas", label: "Nóminas" },
  { id: "vacaciones", label: "Vacaciones" },
  { id: "empleados", label: "Gestión de empleados" },
  { id: "auditoria", label: "Historial / Auditoría" },
  { id: "dgii", label: "Reportes DGII" },
  { id: "roles", label: "Seguridad / Roles" },
  { id: "pos", label: "POS" },
  { id: "citas", label: "Citas / Reservas" },
  { id: "multisucursal", label: "Multi-sucursal" },
  { id: "cotizaciones", label: "Cotizaciones" },
  { id: "dashboards", label: "Reportes / Dashboards" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "whatsapp", label: "Integración WhatsApp" },
  { id: "appcliente", label: "App móvil cliente" },
  { id: "pago", label: "Pasarela de pago" },
  { id: "proyectos", label: "Gestión de proyectos" },
];

export const MODULO_LABEL: Record<string, string> = Object.fromEntries(
  MODULOS.map((m) => [m.id, m.label]),
);

/** Módulos más relevantes por industria (se muestran primero / resaltados). */
export const RELEVANCIA: Record<string, string[]> = {
  "Restaurantes/Food": ["pos", "inventario", "citas", "facturacion"],
  "Legal": ["citas", "facturacion", "proyectos", "auditoria"],
  "Contable/Financiero": ["facturacion", "dgii", "finanzas", "clientes"],
  "Salud y Belleza": ["citas", "clientes", "facturacion", "notificaciones"],
  "Retail/Comercio": ["inventario", "pos", "facturacion", "multisucursal"],
  "Construcción/Inmobiliaria": ["proyectos", "cotizaciones", "finanzas", "clientes"],
  "Turismo/Hotelería": ["citas", "pago", "clientes", "notificaciones"],
  "Educación": ["clientes", "pago", "citas", "notificaciones"],
  "Tecnología/Software": ["proyectos", "clientes", "facturacion", "dashboards"],
  "Manufactura/Industrial": ["inventario", "finanzas", "empleados", "proyectos"],
  "Logística/Transporte": ["proyectos", "inventario", "notificaciones", "clientes"],
  "Agropecuario": ["inventario", "finanzas", "empleados", "clientes"],
  "Servicios profesionales": ["clientes", "facturacion", "citas", "proyectos"],
  "Entretenimiento/Eventos": ["citas", "pago", "clientes", "notificaciones"],
  "Automotriz": ["inventario", "citas", "facturacion", "clientes"],
  "ONG/Religioso": ["clientes", "finanzas", "notificaciones", "dashboards"],
  "General/Otro": ["clientes", "facturacion", "dashboards", "roles"],
};

/** Ordena los módulos poniendo primero los relevantes a la industria. */
export function modulosOrdenados(industria: string | null): Modulo[] {
  const rel = (industria && RELEVANCIA[industria]) || [];
  const set = new Set(rel);
  const primero = rel.map((id) => MODULOS.find((m) => m.id === id)!).filter(Boolean);
  const resto = MODULOS.filter((m) => !set.has(m.id));
  return [...primero, ...resto];
}

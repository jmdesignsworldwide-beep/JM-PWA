// ============================================================================
// ASISTENTE — Capa 1: detección de intención por palabras clave (sin IA externa)
// Puro y sin dependencias (client+server safe). Reconoce TODAS las formas de
// decir cada cosa: minúsculas/mayúsculas, con o sin acentos, errores comunes.
//
// Arquitectura (3 capas): (1) detección de intención [este archivo] →
// (2) consulta de datos [answer.ts, server] → (3) respuesta.
// PUNTO DE IA FUTURA: cuando detectarIntencion() devuelve "desconocido", ahí se
// enchufa el fallback a Gemini/IA por encima, sin rehacer las capas 2 y 3.
// ============================================================================

export type IntentId =
  | "deudas" | "cobros" | "vencimientos"
  | "ingresos" | "gastos" | "neto"
  | "agenda" | "pedidos" | "clientes" | "datos_cliente" | "proyectos" | "pendientes" | "resumen";

export type PeriodoKey = "hoy" | "ayer" | "semana" | "mes" | "mes_pasado" | "anio";

export const INTENT_LABEL: Record<IntentId, string> = {
  deudas: "A quién le debo",
  cobros: "Quién me debe",
  vencimientos: "Próximos cobros",
  ingresos: "Ingresos",
  gastos: "Gastos",
  neto: "Balance",
  agenda: "Mi agenda",
  pedidos: "Mis pedidos",
  clientes: "Mis clientes",
  datos_cliente: "Datos de cliente",
  proyectos: "Mis proyectos",
  pendientes: "Mis pendientes",
  resumen: "Resumen general",
};

/** Pregunta canónica por intención (para los botones de acceso rápido). */
export const EJEMPLO: Record<IntentId, string> = {
  deudas: "¿A quién le debo?",
  cobros: "¿Quién me debe?",
  vencimientos: "¿Qué cobros vencen?",
  ingresos: "¿Cuánto he facturado este mes?",
  gastos: "¿Cuánto gasté este mes?",
  neto: "¿Cómo voy este mes?",
  agenda: "¿Qué tengo esta semana?",
  pedidos: "¿Cuántos pedidos activos tengo?",
  clientes: "¿Cuántos clientes tengo?",
  datos_cliente: "Datos de un cliente",
  proyectos: "¿Cómo van mis proyectos?",
  pendientes: "¿Qué pendientes tengo?",
  resumen: "¿Cómo va todo?",
};

/** Categorías para el mensaje amable cuando no se entiende. */
export const CATEGORIAS: { id: IntentId; label: string; ejemplo: string }[] = [
  { id: "cobros", label: "Cobros", ejemplo: "quién me debe" },
  { id: "deudas", label: "Deudas", ejemplo: "a quién le debo" },
  { id: "neto", label: "Finanzas", ejemplo: "cuánto gasté este mes" },
  { id: "agenda", label: "Agenda", ejemplo: "qué tengo esta semana" },
  { id: "pedidos", label: "Pedidos", ejemplo: "mis pedidos activos" },
  { id: "clientes", label: "Clientes", ejemplo: "mi mejor cliente" },
];

/** minúsculas, sin acentos, colapsa espacios. */
export function normalizar(s: string): string {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

// Frases por intención. El ORDEN es la prioridad (deudas antes que cobros para
// que "le debo" gane sobre "debo", etc.).
const DICC: { id: IntentId; frases: string[] }[] = [
  { id: "vencimientos", frases: ["que dia me toca cobrar", "cuando me pagan", "cuando me van a pagar", "que vence", "que cobros vencen", "fechas de pago", "fecha de pago", "cuando tengo que cobrar", "cuando cobro", "vencimiento", "proximos cobros", "que me toca cobrar", "quien me paga esta semana", "cobros de esta semana", "cobros esta semana"] },
  { id: "deudas", frases: ["a quien le debo", "le debo", "cuanto debo", "que debo", "tengo que pagar", "que tengo que pagar", "pagos que debo", "mis deudas", "quien me cobra", "a quien tengo que pagar", "le tengo que pagar", "cuanto le debo", "a quien no le he pagado", "deudas pendientes", "que le debo a", "no le he pagado"] },
  { id: "cobros", frases: ["quien me debe", "cuanto me deben", "me deben", "a quien le tengo que cobrar", "tengo que cobrar", "quien no me ha pagado", "no me ha pagado", "cobros pendientes", "mis cobros", "me debe", "saldo pendiente", "me falta cobrar", "que me falta cobrar", "quien debe", "quien me queda debiendo", "cuanto me falta que me paguen", "clientes que deben", "cuanto le falta a", "me pago todo", "ya me pago"] },
  { id: "datos_cliente", frases: ["datos de", "info de", "informacion de", "telefono de", "el telefono de", "numero de", "whatsapp de", "el whatsapp de", "correo de", "el correo de", "contacto de", "ficha de"] },
  { id: "ingresos", frases: ["cuanto he facturado", "cuanto he ganado", "cuanto gane", "cuanto entro", "mis ingresos", "cuanto facture", "ingreso", "cuanto vendi", "cuanto he cobrado en total", "facturado", "cuanto gano", "ganancia", "ganado", "cuanto dinero entro", "mis ventas", "cuanto gane con"] },
  { id: "gastos", frases: ["cuanto he gastado", "en que gaste", "mis gastos", "cuanto gaste", "gaste", "gastado", "gasto", "mis egresos", "egreso", "cuanto llevo gastado", "en que se me fue", "mi mayor gasto", "mayor gasto", "en que se fue el dinero"] },
  { id: "neto", frases: ["cuanto tengo", "cuanto me queda", "mi balance", "balance", "cuanto disponible", "neto", "cuanto tengo disponible", "como voy", "ganancia real", "cuanto me sobro", "disponible", "como esta mi dinero", "estoy en positivo", "estoy en negativo", "cuanto gane de verdad"] },
  { id: "agenda", frases: ["que tengo hoy", "que tengo esta semana", "mi agenda", "agenda", "que reuniones", "reunion", "que eventos", "evento", "que tengo que hacer", "mis entregas", "que entrego", "que hay manana", "mis citas", "cita", "que hay hoy", "tengo algo manana", "reuniones de esta semana", "que me toca hacer", "que tengo pendiente hoy"] },
  { id: "pedidos", frases: ["cuantos pedidos", "mis pedidos", "pedidos activos", "pedidos sin pagar", "pedidos completados", "estado de mis pedidos", "pedido", "pedidos pendientes", "pedidos sin terminar", "que le debo entregar a"] },
  { id: "clientes", frases: ["cuantos clientes", "mi mejor cliente", "quien me compra mas", "clientes activos", "cuantos prospectos", "prospecto", "quien no me compra", "mis clientes", "cliente inactivo", "clientes", "cual es mi cliente top", "cliente top", "clientes que mas me pagan"] },
  { id: "proyectos", frases: ["que pendientes tengo de", "como va el proyecto", "que me falta en", "mis proyectos", "que proyectos tengo", "proyecto", "pendientes de"] },
  { id: "pendientes", frases: ["que pendientes tengo", "mis pendientes", "mi lista", "mis tareas", "que me falta hacer", "cuantos pendientes", "lista de pendientes", "mis to do", "mi to-do"] },
  { id: "resumen", frases: ["como va todo", "resumen", "dame un resumen", "como estoy", "estado del negocio", "resumeme", "resume el dia", "resume la semana", "resume el mes", "como vamos", "como va mi negocio", "ponme al dia"] },
];

// Periodos: frase normalizada → clave.
const PERIODOS: { k: PeriodoKey; frases: string[] }[] = [
  { k: "hoy", frases: ["hoy", "del dia", "en el dia"] },
  { k: "ayer", frases: ["ayer"] },
  { k: "mes_pasado", frases: ["mes pasado", "el mes pasado"] },
  { k: "semana", frases: ["esta semana", "semanal", "de la semana", "en la semana", "semana"] },
  { k: "anio", frases: ["este ano", "anual", "del ano", "en el ano", "este year"] },
  { k: "mes", frases: ["este mes", "mensual", "del mes", "en el mes", "mes"] },
];

export type Deteccion = { intent: IntentId | "desconocido"; periodo: PeriodoKey | null };

/** Detecta intención + periodo a partir del texto libre. */
export function detectarIntencion(texto: string): Deteccion {
  const t = normalizar(texto);
  let intent: IntentId | "desconocido" = "desconocido";
  for (const grupo of DICC) {
    if (grupo.frases.some((f) => t.includes(f))) { intent = grupo.id; break; }
  }
  let periodo: PeriodoKey | null = null;
  for (const p of PERIODOS) {
    if (p.frases.some((f) => t.includes(f))) { periodo = p.k; break; }
  }
  return { intent, periodo };
}

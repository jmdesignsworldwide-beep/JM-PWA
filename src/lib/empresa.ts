/**
 * Datos e identidad de la empresa — FUENTE ÚNICA.
 * Cualquier documento (factura, recibo, contrato, cotización) toma de aquí el
 * nombre, contacto y logo. Si algo cambia (ej. el WhatsApp), se cambia SOLO
 * aquí y se actualiza en todos los PDFs a la vez. Sin placeholders regados.
 */
export const EMPRESA = {
  nombre: "JM Designs Worldwide",
  tagline: "Diseño · Software · Distribución",
  // WhatsApp del equipo JM (formato internacional, solo dígitos).
  whatsapp: "18097072997",
  email: "jm.designs.worldwide@gmail.com",
  // Logo real (PNG) para documentos. Versión blanca = sobre fondos oscuros;
  // negra = sobre fondos claros. Rutas relativas a /public.
  logoClaro: "brand/logo-mark-white.png",
  logoOscuro: "brand/logo-mark-black.png",
};

/** WhatsApp en formato legible: "18097072997" -> "+1 809 707 2997". */
export function whatsappBonito(digits: string = EMPRESA.whatsapp): string {
  const d = (digits ?? "").replace(/\D/g, "");
  if (d.length === 11) return `+${d[0]} ${d.slice(1, 4)} ${d.slice(4, 7)} ${d.slice(7)}`;
  if (d.length === 10) return `+1 ${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return `+${d}`;
}

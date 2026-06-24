/**
 * Construye URLs clicables a partir de handles o URLs sueltas de redes.
 * Acepta tanto "@usuario", "usuario", como una URL completa, y siempre
 * devuelve una URL navegable (o null si no hay nada útil).
 */

/** Limpia un handle: quita @, espacios y barras sobrantes. */
function cleanHandle(v: string): string {
  return v.trim().replace(/^@/, "").replace(/\/+$/, "").trim();
}

/** Instagram: abre el perfil (desde el perfil se puede mandar DM). */
export function instagramUrl(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/instagram\.com/i.test(s)) return `https://${s.replace(/^\/+/, "")}`;
  const h = cleanHandle(s);
  return h ? `https://instagram.com/${h}` : null;
}

/** Facebook: abre el perfil/página. */
export function facebookUrl(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  if (/(facebook\.com|fb\.com|fb\.me)/i.test(s)) return `https://${s.replace(/^\/+/, "")}`;
  const h = cleanHandle(s);
  return h ? `https://facebook.com/${h}` : null;
}

/** WhatsApp: wa.me con el número (solo dígitos) y un texto opcional. */
export function whatsappUrl(v: string | null | undefined, text?: string): string | null {
  if (!v) return null;
  const num = v.replace(/\D/g, "");
  if (!num) return null;
  const base = `https://wa.me/${num}`;
  return text ? `${base}?text=${encodeURIComponent(text)}` : base;
}

/** Etiqueta corta @handle para mostrar (sin la URL completa). */
export function shortHandle(v: string | null | undefined): string | null {
  if (!v) return null;
  const m = v.match(/(?:instagram\.com|facebook\.com|fb\.com)\/([A-Za-z0-9._-]+)/i);
  const h = m ? m[1] : cleanHandle(v);
  return h ? `@${h}` : null;
}

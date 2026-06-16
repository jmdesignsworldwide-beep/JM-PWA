/**
 * Rate limiter ligero en memoria (por instancia). Frena abuso sin molestar al
 * usuario legítimo. **Falla-abierto**: si algo se rompe, deja pasar.
 * Para un límite global real se usaría una tabla en Supabase (futuro).
 */
const hits = new Map<string, number[]>();

export function rateLimit(key: string, max = 20, windowMs = 60_000): boolean {
  try {
    const now = Date.now();
    const arr = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (arr.length >= max) return false;
    arr.push(now);
    hits.set(key, arr);
    // Limpieza ocasional para no crecer sin límite.
    if (hits.size > 5000) hits.clear();
    return true;
  } catch {
    return true; // fail-open
  }
}

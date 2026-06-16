/**
 * Convierte un texto a un username limpio: minúsculas, sin acentos ni espacios.
 * "María Pérez" → "maria.perez". Los caracteres no alfanuméricos se vuelven ".".
 */
export function slugUsername(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}/gu, "") // quita acentos (marcas diacríticas)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".") // no alfanumérico → punto
    .replace(/\.+/g, ".") // colapsa puntos
    .replace(/^\.|\.$/g, ""); // quita puntos de los extremos
}

/** Username base a partir de nombre + apellido (fallback "cliente"). */
export function baseUsername(nombre: string | null, apellido?: string | null): string {
  const full = `${nombre ?? ""} ${apellido ?? ""}`.trim();
  return slugUsername(full) || "cliente";
}

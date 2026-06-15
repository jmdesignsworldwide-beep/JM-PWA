/** Formato de dinero con su moneda (DOP/USD). */
export function money(amount: number, moneda: string = "DOP") {
  const symbol = moneda === "USD" ? "US$" : "RD$";
  return `${symbol} ${Number(amount).toLocaleString("es-DO", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/** Fecha corta en español (RD). */
export function fechaCorta(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Fecha + hora. */
export function fechaHora(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("es-DO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

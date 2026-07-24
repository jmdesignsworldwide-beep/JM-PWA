/**
 * Deriva un "concepto" legible de un pedido (qué es) y su lista de items, para
 * que al registrar un pago se vea CLARO qué se está pagando. Usa lo que ya
 * existe en el pedido: tipo_solucion / detalle_json / industria / rama.
 */

type DetalleItem = { producto?: string | null; cantidad?: number | null; categoria?: string | null; subtotal?: number | null };

export function itemsDePedido(detalle_json: unknown): string[] {
  const arr = Array.isArray(detalle_json) ? (detalle_json as DetalleItem[]) : [];
  return arr
    .map((d) => {
      const nombre = (d.producto ?? "").toString().trim();
      if (!nombre) return "";
      const cant = d.cantidad && d.cantidad > 1 ? `${d.cantidad}× ` : "";
      const cat = d.categoria ? ` · ${d.categoria}` : "";
      return `${cant}${nombre}${cat}`;
    })
    .filter(Boolean);
}

export function conceptoDePedido(o: {
  tipo_solucion?: string | null;
  industria?: string | null;
  rama?: string | null;
  detalle_json?: unknown;
  fecha?: string | null;
}): string {
  const tipo = (o.tipo_solucion ?? "").trim();
  if (tipo) return tipo;

  const items = itemsDePedido(o.detalle_json).map((s) => s.replace(/^\d+×\s*/, "").split(" · ")[0]);
  if (items.length) {
    const primeros = items.slice(0, 2).join(", ");
    return items.length > 2 ? `${primeros} +${items.length - 2} más` : primeros;
  }

  if (o.industria) return `Solución para ${o.industria}`;
  return o.rama === "distribution" ? "Pedido de imprenta" : "Pedido de software";
}

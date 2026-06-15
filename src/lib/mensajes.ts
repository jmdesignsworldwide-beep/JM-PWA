import { money } from "@/lib/format";
import type { AgendaEvent } from "@/lib/data/agenda";

/** Mensaje de WhatsApp ya redactado para un evento de cobro/entrega. */
export function mensajeEvento(e: AgendaEvent): string {
  const nombre = e.cliente?.nombre ?? "";
  if (e.tipo === "cobro") {
    const monto = e.monto != null ? money(e.monto, e.moneda ?? "DOP") : "su saldo";
    return `Hola ${nombre} 👋, le recuerdo amablemente el pago de ${monto} de su proyecto. ¡Gracias!`;
  }
  if (e.tipo === "entrega") {
    return `Hola ${nombre} 👋, le confirmo que la entrega de su proyecto está programada. ¡Cualquier cosa me avisa!`;
  }
  return `Hola ${nombre} 👋`;
}

/** Link wa.me con el teléfono del cliente del evento y el mensaje redactado. */
export function waLink(e: AgendaEvent): string | null {
  const num = (e.cliente?.whatsapp ?? e.cliente?.telefono ?? "").replace(/\D/g, "");
  if (!num) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(mensajeEvento(e))}`;
}

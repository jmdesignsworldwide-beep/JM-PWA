import type { EventTipo } from "@/lib/data/agenda";

export const EVENT_TIPOS: Record<EventTipo, { label: string; color: string }> = {
  inicio: { label: "Inicio", color: "var(--electric)" },
  entrega: { label: "Entrega", color: "var(--brand-purple)" },
  cobro: { label: "Cobro", color: "var(--success)" },
  acuerdo: { label: "Acuerdo", color: "var(--teal)" },
  personal: { label: "Personal", color: "var(--muted-foreground)" },
};

export const EVENT_TIPO_LIST = Object.entries(EVENT_TIPOS).map(([id, v]) => ({
  id: id as EventTipo,
  ...v,
}));

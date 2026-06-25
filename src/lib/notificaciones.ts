/** Tipos de notificación que el owner controla (claves de columnas en app_settings). */
export const NOTIF_KEYS = [
  "notif_eventos_push", "notif_eventos_email",
  "notif_cobros_push", "notif_cobros_email",
  "notif_entregas_push", "notif_entregas_email",
  "notif_tareas_push", "notif_tareas_email",
  "notif_influencers_push", "notif_influencers_email",
  "notif_resumen_push", "notif_resumen_email",
] as const;

export type NotifPrefs = Record<(typeof NOTIF_KEYS)[number], boolean> & {
  resumen_hora: string;
  dias_aviso_entrega: number;
  dias_aviso_cobro: number;
};

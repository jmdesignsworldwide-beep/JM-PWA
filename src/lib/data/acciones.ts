import { createClient } from "@/lib/supabase/server";
import { rdToday, addDays } from "@/lib/fecha";
import { money } from "@/lib/format";

export type SuggestedAction = {
  id: string;
  tipo: "cobro" | "contrato" | "lead" | "proyecto" | "recurrente";
  prioridad: number; // mayor = más urgente
  titulo: string;
  detalle: string;
  clientId?: string;
  nombre?: string;
  phone?: string | null;
  waText: string;
};

type Cli = { id: string; nombre: string; apellido: string | null; whatsapp: string | null; telefono: string | null };

/** Acciones sugeridas de HOY, calculadas en vivo desde datos reales. */
export async function getSuggestedActions(): Promise<SuggestedAction[]> {
  const supabase = await createClient();
  const hoy = rdToday();
  const acc: SuggestedAction[] = [];

  // Mapa de clientes para nombre/teléfono
  const { data: clientsData } = await supabase
    .from("clients").select("id, nombre, apellido, whatsapp, telefono");
  const cmap = new Map<string, Cli>((clientsData ?? []).map((c) => [c.id, c as Cli]));
  const phoneOf = (id?: string | null) => { const c = id ? cmap.get(id) : null; return c?.whatsapp ?? c?.telefono ?? null; };
  const nameOf = (id?: string | null) => { const c = id ? cmap.get(id) : null; return c ? `${c.nombre} ${c.apellido ?? ""}`.trim() : ""; };

  // 1) Cobros atrasados / próximos (2 días)
  const { data: cobros } = await supabase
    .from("calendar_events").select("id, titulo, fecha, monto, moneda, client_id")
    .eq("tipo", "cobro").eq("completado", false).lte("fecha", addDays(hoy, 2)).order("fecha");
  for (const e of (cobros ?? []) as { id: string; fecha: string; monto: number | null; moneda: string | null; client_id: string | null }[]) {
    const vencido = e.fecha < hoy;
    const nombre = nameOf(e.client_id);
    const monto = e.monto != null ? money(e.monto, e.moneda ?? "DOP") : "su saldo";
    acc.push({
      id: `cobro-${e.id}`, tipo: "cobro", prioridad: vencido ? 100 : 80,
      titulo: vencido ? `Cobro vencido: ${nombre}` : `Cobro próximo: ${nombre}`,
      detalle: `${monto} · ${e.fecha}`,
      clientId: e.client_id ?? undefined, nombre, phone: phoneOf(e.client_id),
      waText: `Hola ${nombre} 👋, le recuerdo amablemente el pago de ${monto} de su proyecto. ¡Gracias!`,
    });
  }

  // 2) Contratos enviados sin firmar (+3 días)
  const { data: contratos } = await supabase
    .from("contracts").select("id, client_id, fecha_envio")
    .eq("estado", "enviado").lt("fecha_envio", `${addDays(hoy, -3)}T23:59:59`);
  for (const c of (contratos ?? []) as { id: string; client_id: string; fecha_envio: string | null }[]) {
    const nombre = nameOf(c.client_id);
    const dias = c.fecha_envio ? Math.floor((Date.now() - new Date(c.fecha_envio).getTime()) / 86400000) : 0;
    acc.push({
      id: `contrato-${c.id}`, tipo: "contrato", prioridad: 70,
      titulo: `Contrato sin firmar: ${nombre}`,
      detalle: `Enviado hace ${dias} días`,
      clientId: c.client_id, nombre, phone: phoneOf(c.client_id),
      waText: `Hola ${nombre} 👋, ¿pudo revisar el contrato que le envié? Quedo atento para arrancar su proyecto. 🙌`,
    });
  }

  // 3) Leads estancados (+5 días sin avanzar)
  const { data: leads } = await supabase
    .from("clients").select("id, updated_at").eq("es_lead", true).lt("updated_at", `${addDays(hoy, -5)}T23:59:59`);
  for (const l of (leads ?? []) as { id: string; updated_at: string }[]) {
    const nombre = nameOf(l.id);
    const dias = Math.floor((Date.now() - new Date(l.updated_at).getTime()) / 86400000);
    acc.push({
      id: `lead-${l.id}`, tipo: "lead", prioridad: 50,
      titulo: `Prospecto estancado: ${nombre}`,
      detalle: `Sin avanzar hace ${dias} días`,
      clientId: l.id, nombre, phone: phoneOf(l.id),
      waText: `Hola ${nombre} 👋, ¿seguimos con su proyecto? Me encantaría ayudarle a arrancar. ¿Le parece si conversamos?`,
    });
  }

  // 4) Proyectos sin actividad (+10 días)
  const { data: projs } = await supabase
    .from("projects").select("id, nombre, client_id, updated_at").eq("estado", "en_progreso").lt("updated_at", `${addDays(hoy, -10)}T23:59:59`);
  for (const p of (projs ?? []) as { id: string; nombre: string | null; client_id: string; updated_at: string }[]) {
    const dias = Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000);
    acc.push({
      id: `proyecto-${p.id}`, tipo: "proyecto", prioridad: 40,
      titulo: `Proyecto sin actividad: ${p.nombre ?? "Proyecto"}`,
      detalle: `Sin actualizar hace ${dias} días`,
      clientId: p.client_id, nombre: nameOf(p.client_id), phone: phoneOf(p.client_id),
      waText: `Hola ${nameOf(p.client_id)} 👋, le comparto una actualización de su proyecto. ¿Hablamos?`,
    });
  }

  // 5) Recurrentes por facturar
  const { data: rec } = await supabase
    .from("recurring_plans").select("id, tipo, client_id, monto, moneda, proxima_factura").eq("activo", true).lte("proxima_factura", hoy);
  for (const r of (rec ?? []) as { id: string; tipo: string | null; client_id: string; monto: number; moneda: string; proxima_factura: string }[]) {
    acc.push({
      id: `recurrente-${r.id}`, tipo: "recurrente", prioridad: 60,
      titulo: `Facturar recurrente: ${nameOf(r.client_id)}`,
      detalle: `Plan ${r.tipo} · ${money(r.monto, r.moneda)} · vence ${r.proxima_factura}`,
      clientId: r.client_id, nombre: nameOf(r.client_id), phone: phoneOf(r.client_id),
      waText: `Hola ${nameOf(r.client_id)} 👋, le comparto la factura de su plan ${r.tipo}. ¡Gracias por su confianza!`,
    });
  }

  return acc.sort((a, b) => b.prioridad - a.prioridad);
}

"use server";

import { EMPRESA } from "@/lib/empresa";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { notifyClient } from "@/lib/notify";

type ProjectEstado = "pendiente" | "en_progreso" | "entregado" | "pagado" | "cancelado";

function refresh(clientId: string) {
  revalidatePath(`/clientes/${clientId}`);
  revalidatePath("/portal");
}

/** Cambia el estado del proyecto (lo ve el cliente en su línea de tiempo). */
export async function updateProjectEstado(projectId: string, estado: ProjectEstado, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("projects").update({ estado }).eq("id", projectId);
  if (error) return { error: error.message };
  refresh(clientId);
  return { ok: true };
}

/** Agrega un hito (paso) a la línea de tiempo del proyecto. */
export async function addMilestone(
  projectId: string,
  clientId: string,
  input: { nombre: string; descripcion?: string | null; fecha?: string | null },
) {
  const supabase = await createClient();
  const { count } = await supabase
    .from("project_milestones").select("id", { count: "exact", head: true }).eq("project_id", projectId);
  const { error } = await supabase.from("project_milestones").insert({
    project_id: projectId,
    nombre: input.nombre.trim(),
    descripcion: input.descripcion?.trim() || null,
    fecha: input.fecha || null,
    orden: count ?? 0,
    visible_cliente: true,
  });
  if (error) return { error: error.message };
  refresh(clientId);
  return { ok: true };
}

/** Marca/desmarca un hito como completado. Al completar, opcionalmente avisa al cliente. */
export async function toggleMilestoneComplete(
  milestoneId: string,
  clientId: string,
  completado: boolean,
  notificar: boolean,
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("project_milestones")
    .update({ completado, completado_en: completado ? new Date().toISOString() : null })
    .eq("id", milestoneId)
    .select("nombre")
    .maybeSingle();
  if (error) return { error: error.message };

  let notified: { email: boolean; push: number } | null = null;
  if (completado && notificar) {
    notified = await notifyClient({
      clientId,
      title: "¡Buenas noticias! Tu proyecto avanzó 🎉",
      body: `Completamos un hito: ${data?.nombre ?? "un avance"}. Entra a tu portal para verlo.`,
      url: "/portal",
    });
  }
  refresh(clientId);
  return { ok: true, notified };
}

/** Cambia la visibilidad de un hito para el cliente. */
export async function toggleMilestoneVisible(milestoneId: string, clientId: string, visible: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_milestones").update({ visible_cliente: visible }).eq("id", milestoneId);
  if (error) return { error: error.message };
  refresh(clientId);
  return { ok: true };
}

export async function deleteMilestone(milestoneId: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_milestones").delete().eq("id", milestoneId);
  if (error) return { error: error.message };
  refresh(clientId);
  return { ok: true };
}

/** Publica una actualización en el feed del cliente. Opcionalmente lo notifica. */
export async function publishUpdate(
  projectId: string | null,
  clientId: string,
  input: { titulo: string; contenido?: string | null; notificar: boolean },
) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_updates").insert({
    project_id: projectId,
    client_id: clientId,
    titulo: input.titulo.trim(),
    contenido: input.contenido?.trim() || null,
    visible_cliente: true,
  });
  if (error) return { error: error.message };

  let notified: { email: boolean; push: number } | null = null;
  if (input.notificar) {
    notified = await notifyClient({
      clientId,
      title: `Novedad de tu proyecto con ${EMPRESA.nombre}`,
      body: input.titulo.trim(),
      url: "/portal",
    });
  }
  refresh(clientId);
  return { ok: true, notified };
}

export async function deleteUpdate(updateId: string, clientId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("project_updates").delete().eq("id", updateId);
  if (error) return { error: error.message };
  refresh(clientId);
  return { ok: true };
}

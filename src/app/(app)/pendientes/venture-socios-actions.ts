"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type DocTipo = "contrato" | "legalizacion" | "plan" | "cotizacion" | "otro";

/** Auto-pendiente "Subir contrato de [socio]" mientras el socio no tenga contrato. */
async function syncContratoTodo(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ventureId: string, socioId: string, socioNombre: string, tieneContrato: boolean,
) {
  const key = `contrato-socio:${socioId}`;
  if (tieneContrato) {
    await supabase.from("personal_todos").delete().eq("venture_id", ventureId).eq("auto_key", key);
    return;
  }
  const { data: existe } = await supabase
    .from("personal_todos").select("id").eq("venture_id", ventureId).eq("auto_key", key).maybeSingle();
  if (!existe) {
    await supabase.from("personal_todos").insert(
      { texto: `Subir contrato de ${socioNombre}`, venture_id: ventureId, origen: "auto", auto_key: key } as never,
    );
  }
}

export async function addSocio(ventureId: string, input: { nombre: string; porcentaje: number; contrato_path?: string | null; notas?: string | null }) {
  if (!input.nombre?.trim()) return { error: "El nombre del socio es obligatorio." };
  const supabase = await createClient();
  const { data, error } = await supabase.from("venture_socios").insert({
    venture_id: ventureId,
    nombre: input.nombre.trim(),
    porcentaje: Number.isFinite(input.porcentaje) ? input.porcentaje : 0,
    contrato_path: input.contrato_path || null,
    notas: input.notas?.trim() || null,
  } as never).select("id").single();
  if (error) return { error: error.message };
  await syncContratoTodo(supabase, ventureId, (data as { id: string }).id, input.nombre.trim(), !!input.contrato_path);
  revalidatePath(`/proyectos/${ventureId}`);
  revalidatePath("/pendientes");
  return { ok: true };
}

export async function updateSocio(id: string, ventureId: string, input: { nombre: string; porcentaje: number; contrato_path?: string | null; notas?: string | null }) {
  if (!input.nombre?.trim()) return { error: "El nombre del socio es obligatorio." };
  const supabase = await createClient();
  const { error } = await supabase.from("venture_socios").update({
    nombre: input.nombre.trim(),
    porcentaje: Number.isFinite(input.porcentaje) ? input.porcentaje : 0,
    contrato_path: input.contrato_path || null,
    notas: input.notas?.trim() || null,
  } as never).eq("id", id);
  if (error) return { error: error.message };
  await syncContratoTodo(supabase, ventureId, id, input.nombre.trim(), !!input.contrato_path);
  revalidatePath(`/proyectos/${ventureId}`);
  revalidatePath("/pendientes");
  return { ok: true };
}

export async function deleteSocio(id: string, ventureId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("venture_socios").delete().eq("id", id);
  if (error) return { error: error.message };
  await supabase.from("personal_todos").delete().eq("venture_id", ventureId).eq("auto_key", `contrato-socio:${id}`);
  revalidatePath(`/proyectos/${ventureId}`);
  revalidatePath("/pendientes");
  return { ok: true };
}

export async function addDoc(ventureId: string, input: { tipo: DocTipo; nombre?: string | null; file_path: string }) {
  if (!input.file_path) return { error: "Falta el archivo." };
  const supabase = await createClient();
  const { error } = await supabase.from("venture_docs").insert({
    venture_id: ventureId, tipo: input.tipo, nombre: input.nombre?.trim() || null, file_path: input.file_path,
  } as never);
  if (error) return { error: error.message };
  // Si es el documento de legalización, marca el proyecto como legalizado.
  if (input.tipo === "legalizacion") {
    await supabase.from("ventures").update({ legalizado: true } as never).eq("id", ventureId);
  }
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}

export async function deleteDoc(id: string, ventureId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("venture_docs").delete().eq("id", id);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}

/** URL firmada (1h) para abrir un PDF del bucket privado `ventures`. */
export async function ventureFileUrl(path: string) {
  const supabase = await createClient();
  const clean = path.startsWith("ventures/") ? path.slice("ventures/".length) : path;
  const { data } = await supabase.storage.from("ventures").createSignedUrl(clean, 60 * 60);
  return { url: data?.signedUrl ?? null };
}

export async function setLegalizado(ventureId: string, legalizado: boolean) {
  const supabase = await createClient();
  const { error } = await supabase.from("ventures").update({ legalizado } as never).eq("id", ventureId);
  if (error) return { error: error.message };
  revalidatePath(`/proyectos/${ventureId}`);
  return { ok: true };
}

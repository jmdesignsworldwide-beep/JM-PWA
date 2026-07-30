"use server";

import { createClient } from "@/lib/supabase/server";
import { getVentureById, getVentureRedes, getVentureSocios, getVentureDocs, getVentureIdeas } from "@/lib/data/ventures";
import { getVentureTodos } from "@/lib/data/todos";
import { IDEA_TIPOS, type IdeaCampo } from "@/lib/ventures";

const RED_LABEL: Record<string, string> = { instagram: "Instagram", facebook: "Facebook", tiktok: "TikTok", whatsapp: "WhatsApp", web: "Página web" };
const DOC_LABEL: Record<string, string> = { contrato: "Contrato", legalizacion: "Legalización", plan: "Plan", cotizacion: "Cotización", otro: "Otro" };

function slug(s: string) {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "proyecto";
}
function extOf(path: string) { const e = path.split(".").pop(); return e && e.length <= 5 ? `.${e}` : ""; }

/**
 * Arma el brief del proyecto (Markdown) + un .zip con todos los adjuntos
 * (logo, referencias, contratos, PDFs). Devuelve el zip en base64 para
 * descargarlo. Pensado para pegárselo a Claude Code y arrancar el proyecto.
 */
export async function exportVenture(ventureId: string) {
  const supabase = await createClient();
  const v = await getVentureById(ventureId);
  if (!v) return { error: "Proyecto no encontrado." };

  const [redes, socios, docs, ideas, todos, refsRes] = await Promise.all([
    getVentureRedes(ventureId),
    getVentureSocios(ventureId),
    getVentureDocs(ventureId),
    getVentureIdeas(ventureId),
    getVentureTodos(ventureId),
    supabase.from("venture_referencias").select("*").eq("venture_id", ventureId).order("created_at", { ascending: true }),
  ]);
  const refs = (refsRes.data ?? []) as { image_path: string; nota: string | null }[];
  const perfil = (v.perfil_json ?? {}) as Record<string, string>;

  // ---- Brief en Markdown ----
  const L: string[] = [];
  L.push(`# ${v.nombre}`, "");
  L.push(`- Estado: ${v.registrado ? "Registrado" : "Sin registrar"} · ${v.legalizado ? "Legalizado" : "Sin legalizar"}`);
  if (v.correo) L.push(`- Correo: ${v.correo}`);
  if (v.tipo) L.push(`- Tipo: ${v.tipo === "online" ? "Online" : "Físico"}`);
  L.push("");
  if (v.descripcion) L.push("## Descripción", v.descripcion, "");

  // Encuesta (perfil_json)
  const perfilLines: string[] = [];
  const addP = (label: string, key: string) => { if (perfil[key]) perfilLines.push(`- ${label}: ${perfil[key]}`); };
  if (v.tipo === "online") { addP("Alcance/mercado", "mercado"); addP("Metas", "metas"); }
  else if (v.tipo === "fisico") { addP("Ciudad", "ciudad"); addP("Sucursales", "sucursales"); addP("Tamaño del local", "tamano"); addP("Colores/temática", "colores"); addP("Metas", "metas"); }
  if (perfilLines.length) L.push("## Plan / mercado", ...perfilLines, "");

  // Redes
  if (redes.length) {
    L.push("## Redes");
    for (const r of redes) L.push(`- ${RED_LABEL[r.tipo] ?? r.tipo}: ${r.hecha ? (r.url || "(sin link)") : "PENDIENTE por crear"}`);
    L.push("");
  }

  // Socios
  if (socios.length) {
    L.push("## Socios");
    for (const s of socios) L.push(`- ${s.nombre} — ${Number(s.porcentaje)}% — contrato: ${s.contrato_path ? "sí (adjunto)" : "PENDIENTE"}`);
    L.push("");
  }

  // Ideas
  if (ideas.length) {
    L.push("## Ideas");
    for (const idea of ideas) {
      const tLabel = IDEA_TIPOS.find((t) => t.id === idea.tipo)?.label;
      L.push(`### ${idea.titulo}${tLabel ? ` (${tLabel})` : ""}`);
      const campos = (Array.isArray(idea.campos_json) ? idea.campos_json : []) as IdeaCampo[];
      for (const c of campos) if (c.label?.trim() || c.valor?.trim()) L.push(`- **${c.label || "Campo"}:** ${c.valor || "—"}`);
      L.push("");
    }
  }

  // Documentos
  if (docs.length) {
    L.push("## Documentos (adjuntos)");
    for (const d of docs) L.push(`- ${DOC_LABEL[d.tipo] ?? d.tipo}: ${d.nombre || "documento"}`);
    L.push("");
  }

  // Referencias
  if (refs.length) {
    L.push("## Referencias visuales (adjuntas)");
    for (const r of refs) L.push(`- ${r.nota || "(sin nota)"}`);
    L.push("");
  }

  // Pendientes
  if (todos.length) {
    L.push("## Pendientes");
    for (const t of todos) L.push(`- [${t.hecho ? "x" : " "}] ${t.texto}`);
    L.push("");
  }

  const md = L.join("\n");

  // ---- ZIP con brief + adjuntos ----
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  zip.file("brief.md", md);

  async function addFile(path: string | null, dest: string) {
    if (!path) return;
    const clean = path.startsWith("ventures/") ? path.slice("ventures/".length) : path;
    const { data } = await supabase.storage.from("ventures").download(clean);
    if (data) zip.file(dest, Buffer.from(await data.arrayBuffer()));
  }

  await addFile(v.logo_path, `logo${extOf(v.logo_path ?? "")}`);
  let i = 1;
  for (const s of socios) { if (s.contrato_path) { await addFile(s.contrato_path, `contratos/${slug(s.nombre)}-contrato${extOf(s.contrato_path)}`); } }
  for (const d of docs) { await addFile(d.file_path, `documentos/${DOC_LABEL[d.tipo] ?? d.tipo}-${slug(d.nombre || "doc")}${extOf(d.file_path)}`); }
  for (const r of refs) { await addFile(r.image_path, `referencias/ref-${i++}${extOf(r.image_path)}`); }

  const base64 = await zip.generateAsync({ type: "base64" });
  return { filename: `${slug(v.nombre)}-brief.zip`, base64 };
}

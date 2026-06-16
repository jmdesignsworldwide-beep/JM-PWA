import { createClient } from "@/lib/supabase/client";

/**
 * Sube un archivo a un bucket privado de Storage y devuelve su path.
 * Úsalo desde componentes de cliente. Devuelve null si falla.
 */
export async function uploadFile(bucket: string, file: File): Promise<string | null> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) return null;
  return `${bucket}/${path}`;
}

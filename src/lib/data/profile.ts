import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  rol: "owner" | "colaborador" | "cliente";
  client_id: string | null;
  nombre: string | null;
};

/** Perfil del usuario autenticado (rol + client_id si es cliente). */
export async function getMyProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("users_profiles")
    .select("id, rol, client_id, nombre")
    .eq("id", user.id)
    .maybeSingle();

  return (data as Profile) ?? null;
}

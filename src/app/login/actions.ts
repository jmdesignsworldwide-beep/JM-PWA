"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Login del back-office por USERNAME o CORREO (owner/colaborador/equipo).
 * Si es username, resuelve el correo de auth con la service_role y firma la
 * sesión en el servidor. Error genérico para no filtrar qué cuentas existen.
 */
export async function staffLogin(identifier: string, password: string) {
  const id = identifier.trim().toLowerCase();
  if (!id || !password) return { error: "Escribe tu usuario o correo y tu clave." };

  let email: string | null = null;
  if (id.includes("@")) {
    email = id;
  } else {
    const admin = createAdminClient();
    const { data } = await admin
      .from("users_profiles")
      .select("correo")
      .in("rol", ["owner", "colaborador", "equipo"])
      .eq("username", id)
      .limit(1)
      .maybeSingle();
    email = data?.correo ?? null;
  }
  if (!email) return { error: "Usuario o clave incorrectos." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: "Usuario o clave incorrectos." };
  return { ok: true };
}

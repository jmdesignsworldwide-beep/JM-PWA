import { createClient } from "@supabase/supabase-js";

/**
 * Cliente admin (service_role) — SOLO para el servidor. Salta RLS.
 * Úsalo únicamente en acciones protegidas por rol (ej. crear acceso de cliente).
 * NUNCA lo importes en componentes de cliente.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

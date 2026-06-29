import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer } from "@/components/animations/motion";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { NotificationSettings } from "@/components/settings/notification-settings";
import { PushSubscribe } from "@/components/settings/push-subscribe";
import { InstallCard } from "@/components/pwa/install-card";
import { NOTIF_KEYS, type NotifPrefs } from "@/lib/notificaciones";
import { UsuariosSettings } from "@/components/settings/usuarios-settings";
import { VisibilitySettings } from "@/components/settings/visibility-settings";
import { BrandsSettings } from "@/components/settings/brands-settings";
import { CategoriesSettings } from "@/components/settings/categories-settings";
import { TemplatesSettings } from "@/components/settings/templates-settings";
import { ThemeSettings } from "@/components/settings/theme-settings";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const [
    { data: settings },
    { data: owners },
    { data: brands },
    { data: categories },
    { data: templates },
    { count: pushDevices },
  ] = await Promise.all([
    supabase.from("app_settings").select("*").eq("id", "global").maybeSingle(),
    supabase.from("users_profiles").select("id, nombre, correo, username").eq("rol", "owner").order("created_at"),
    supabase.from("brands").select("id, nombre, activo, rnc, telefono, direccion, logo_url").order("created_at"),
    supabase.from("categories").select("id, nombre, tipo").order("nombre"),
    supabase.from("message_templates").select("id, tipo, nombre, contenido").order("tipo"),
    user ? supabase.from("push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id) : Promise.resolve({ count: 0 }),
  ]);

  const vapidPub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const resendKey = process.env.RESEND_API_KEY;
  const notifStatus = {
    resumenHora: ((settings?.resumen_hora as string) ?? "07:00"),
    ultimoEnvio: (settings?.resumen_ultimo_envio as string | null) ?? null,
    pushDevices: pushDevices ?? 0,
    cronSecret: !!process.env.CRON_SECRET,
    resendOk: !!resendKey && !resendKey.startsWith("tu-"),
    vapidOk: !!vapidPub && !vapidPub.startsWith("tu-") && !!process.env.VAPID_PRIVATE_KEY,
  };

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Usuarios, marcas, plantillas, categorías, tema, recordatorios y notificaciones."
      />
      <StaggerContainer className="space-y-4">
        <UsuariosSettings owners={(owners ?? []) as { id: string; nombre: string | null; correo: string | null; username: string | null }[]} currentUserId={user?.id ?? ""} />

        <VisibilitySettings hidden={(settings?.modulos_ocultos as string[] | null) ?? []} />

        <BrandsSettings brands={(brands ?? []) as { id: string; nombre: string; activo: boolean; rnc: string | null; telefono: string | null; direccion: string | null; logo_url: string | null }[]} />

        <CategoriesSettings categories={(categories ?? []) as { id: string; nombre: string; tipo: string }[]} />

        <TemplatesSettings templates={(templates ?? []) as { id: string; tipo: string; nombre: string; contenido: string | null }[]} />

        <ThemeSettings />

        <AppearanceSettings />

        <NotificationSettings settings={buildNotifPrefs(settings)} status={notifStatus} />

        <InstallCard />

        <PushSubscribe />
      </StaggerContainer>
    </>
  );
}

/** Arma las preferencias de notificación con defaults (todo ON) si faltan. */
function buildNotifPrefs(settings: Record<string, unknown> | null): NotifPrefs {
  const s = (settings ?? {}) as Record<string, unknown>;
  const prefs = {
    resumen_hora: (s.resumen_hora as string) ?? "07:00",
    dias_aviso_entrega: (s.dias_aviso_entrega as number) ?? 1,
    dias_aviso_cobro: (s.dias_aviso_cobro as number) ?? 1,
  } as NotifPrefs;
  for (const k of NOTIF_KEYS) prefs[k] = (s[k] as boolean) ?? true;
  return prefs;
}

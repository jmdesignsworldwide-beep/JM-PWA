import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer } from "@/components/animations/motion";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { PushSubscribe } from "@/components/settings/push-subscribe";
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
  ] = await Promise.all([
    supabase.from("app_settings").select("resumen_hora, dias_aviso_entrega, dias_aviso_cobro, modulos_ocultos").eq("id", "global").maybeSingle(),
    supabase.from("users_profiles").select("id, nombre, correo, username").eq("rol", "owner").order("created_at"),
    supabase.from("brands").select("id, nombre, activo, rnc, telefono, direccion, logo_url").order("created_at"),
    supabase.from("categories").select("id, nombre, tipo").order("nombre"),
    supabase.from("message_templates").select("id, tipo, nombre, contenido").order("tipo"),
  ]);

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

        <ReminderSettings
          settings={settings ?? { resumen_hora: "07:00", dias_aviso_entrega: 1, dias_aviso_cobro: 1 }}
        />

        <PushSubscribe />
      </StaggerContainer>
    </>
  );
}

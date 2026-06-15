import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, AnimatedCard } from "@/components/animations/motion";
import { AppearanceSettings } from "@/components/settings/appearance-settings";
import { ReminderSettings } from "@/components/settings/reminder-settings";
import { PushSubscribe } from "@/components/settings/push-subscribe";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Configuración" };

export default async function ConfiguracionPage() {
  const supabase = await createClient();
  const { data: settings } = await supabase
    .from("app_settings")
    .select("resumen_hora, dias_aviso_entrega, dias_aviso_cobro")
    .eq("id", "global")
    .maybeSingle();

  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Apariencia, recordatorios, notificaciones y datos de empresa."
      />
      <StaggerContainer className="space-y-4">
        <AppearanceSettings />

        <ReminderSettings
          settings={
            settings ?? { resumen_hora: "07:00", dias_aviso_entrega: 1, dias_aviso_cobro: 1 }
          }
        />

        <PushSubscribe />

        <AnimatedCard className="flex flex-col items-center justify-center gap-3 px-6 py-12 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-electric">
            <Construction className="size-7" />
          </div>
          <h2 className="text-lg font-medium">Más opciones en construcción</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Usuarios/roles, marcas, tokens de tema, datos de empresa y
            plantillas se completan en la <strong>Fase 10</strong>.
          </p>
        </AnimatedCard>
      </StaggerContainer>
    </>
  );
}

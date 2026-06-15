import { Construction } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StaggerContainer, AnimatedCard } from "@/components/animations/motion";
import { AppearanceSettings } from "@/components/settings/appearance-settings";

export const metadata = { title: "Configuración" };

export default function ConfiguracionPage() {
  return (
    <>
      <PageHeader
        title="Configuración"
        subtitle="Usuarios/roles, marcas, tokens de tema, datos de empresa y plantillas."
      />
      <StaggerContainer className="space-y-4">
        <AppearanceSettings />

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

import { Construction } from "lucide-react";
import { PageHeader } from "./page-header";
import { StaggerContainer, AnimatedCard } from "@/components/animations/motion";

/** Placeholder reutilizable para módulos que se construyen en fases siguientes. */
export function ModulePlaceholder({
  title,
  subtitle,
  phase,
}: {
  title: string;
  subtitle: string;
  phase: string;
}) {
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <StaggerContainer>
        <AnimatedCard className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <div className="flex size-14 items-center justify-center rounded-2xl bg-accent text-electric">
            <Construction className="size-7" />
          </div>
          <h2 className="text-lg font-medium">Módulo en construcción</h2>
          <p className="max-w-md text-sm text-muted-foreground">
            Este módulo se construye en la <strong>{phase}</strong>. La
            fundación (login, tema, sidebar, animaciones y PWA) ya está lista.
          </p>
        </AnimatedCard>
      </StaggerContainer>
    </>
  );
}

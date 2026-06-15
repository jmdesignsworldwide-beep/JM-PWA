import { ModulePlaceholder } from "@/components/layout/module-placeholder";

export const metadata = { title: "Historial / Auditoría" };

export default function HistorialPage() {
  return (
    <ModulePlaceholder
      title="Historial / Auditoría"
      subtitle="Registro inmutable de todo cambio/borrado (audit log)."
      phase="Fase 10"
    />
  );
}

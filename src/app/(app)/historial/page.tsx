import { PageHeader } from "@/components/layout/page-header";
import { HistorialView } from "@/components/historial/historial-view";
import { getAuditLog, getAuditTablas } from "@/lib/data/auditoria";

export const metadata = { title: "Historial / Auditoría" };

export default async function HistorialPage({
  searchParams,
}: {
  searchParams: Promise<{ accion?: string; tabla?: string; desde?: string; hasta?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const [rows, tablas] = await Promise.all([
    getAuditLog({ accion: sp.accion, tabla: sp.tabla, desde: sp.desde, hasta: sp.hasta, q: sp.q }),
    getAuditTablas(),
  ]);

  return (
    <>
      <PageHeader title="Historial / Auditoría" subtitle="Registro inmutable de todo lo que pasa en el sistema." />
      <HistorialView rows={rows} tablas={tablas} />
    </>
  );
}

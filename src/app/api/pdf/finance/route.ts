import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getBalance, getExpensesByCategory, getProjectMargins } from "@/lib/data/finanzas";
import { buildFinanceReportPdf } from "@/lib/pdf-report";
import { rdToday } from "@/lib/fecha";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("No autorizado", { status: 401 });

  const [balance, porCategoria, margenes] = await Promise.all([
    getBalance(), getExpensesByCategory(), getProjectMargins(),
  ]);

  const bytes = await buildFinanceReportPdf({
    brand: "JM Designs Worldwide",
    periodo: `Al ${rdToday()}`,
    ingresos: balance.ingresos,
    gastos: balance.gastos,
    neto: balance.neto,
    porCategoria,
    margenes: margenes.map((m) => ({ nombre: m.nombre, ganancia: m.ganancia, moneda: m.moneda })),
  });

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="reporte-financiero-${rdToday()}.pdf"`,
    },
  });
}

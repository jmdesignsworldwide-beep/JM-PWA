import { PageHeader } from "@/components/layout/page-header";
import { FinanzasView } from "@/components/finanzas/finanzas-view";
import { DailyExpensePrompt } from "@/components/finanzas/daily-expense-prompt";
import {
  getProjectMargins, getMovimientos, getRecurringPlans, getMRR,
} from "@/lib/data/finanzas";
import { getClients, getBrands } from "@/lib/data/clients";
import { createClient } from "@/lib/supabase/server";
import { rdToday } from "@/lib/fecha";

export const metadata = { title: "Finanzas" };

export default async function FinanzasPage() {
  const supabase = await createClient();
  const [
    movimientos, margins, plans, mrr, clients, brands,
    cats, projs, dailyLog,
  ] = await Promise.all([
    getMovimientos(), getProjectMargins(), getRecurringPlans(), getMRR(), getClients(), getBrands(),
    supabase.from("categories").select("nombre, tipo"),
    supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(100),
    supabase.from("daily_expense_log").select("fecha").eq("fecha", rdToday()).maybeSingle(),
  ]);
  const { incomes, expenses } = movimientos;

  const categorias = (cats.data ?? []) as { nombre: string; tipo: string }[];
  const categoriasIngreso = categorias.filter((c) => c.tipo === "ingreso").map((c) => c.nombre);
  const categoriasGasto = categorias.filter((c) => c.tipo === "gasto").map((c) => c.nombre);
  const projects = ((projs.data ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));
  const clientOpts = clients.map((c) => ({ id: c.id, nombre: `${c.nombre} ${c.apellido ?? ""}`.trim() }));
  const clientMap = Object.fromEntries(clientOpts.map((c) => [c.id, c.nombre]));

  return (
    <>
      <PageHeader title="Finanzas" subtitle="Tu dinero de verdad: ingresos, gastos, margen real y recurrentes." />
      <div className="mb-5">
        <DailyExpensePrompt registradoHoy={!!dailyLog.data} categorias={categoriasGasto} projects={projects} brands={brands} />
      </div>
      <FinanzasView
        margins={margins}
        incomes={incomes} expenses={expenses} plans={plans} mrr={mrr}
        categoriasIngreso={categoriasIngreso} categoriasGasto={categoriasGasto}
        clients={clientOpts} projects={projects} brands={brands}
        clientMap={clientMap} registradoHoy={!!dailyLog.data}
      />
    </>
  );
}

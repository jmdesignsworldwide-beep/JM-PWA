import { PageHeader } from "@/components/layout/page-header";
import { FinanzasView } from "@/components/finanzas/finanzas-view";
import {
  getProjectMargins, getMovimientos, getRecurringPlans, getMRR,
} from "@/lib/data/finanzas";
import { getClients, getBrands } from "@/lib/data/clients";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Finanzas" };

export default async function FinanzasPage() {
  const supabase = await createClient();
  const [
    movimientos, margins, plans, recur, clients, brands,
    cats, projs,
  ] = await Promise.all([
    getMovimientos(), getProjectMargins(), getRecurringPlans(), getMRR(), getClients(), getBrands(),
    supabase.from("categories").select("nombre, tipo, es_personal"),
    supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(100),
  ]);
  const { incomes, expenses } = movimientos;

  const categorias = (cats.data ?? []) as { nombre: string; tipo: string; es_personal: boolean }[];
  const categoriasIngreso = categorias.filter((c) => c.tipo === "ingreso").map((c) => c.nombre);
  const categoriasGasto = categorias.filter((c) => c.tipo === "gasto" && !c.es_personal).map((c) => c.nombre);
  const categoriasGastoPersonal = categorias.filter((c) => c.tipo === "gasto" && c.es_personal).map((c) => c.nombre);
  const projects = ((projs.data ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));
  const clientOpts = clients.map((c) => ({ id: c.id, nombre: `${c.nombre} ${c.apellido ?? ""}`.trim() }));
  const clientMap = Object.fromEntries(clientOpts.map((c) => [c.id, c.nombre]));

  return (
    <>
      <PageHeader title="Finanzas" subtitle="Tu dinero de verdad: ingresos, gastos, margen real y recurrentes." />
      <FinanzasView
        margins={margins}
        incomes={incomes} expenses={expenses} plans={plans} mrr={recur.mrr} mreGasto={recur.mreGasto}
        categoriasIngreso={categoriasIngreso} categoriasGasto={categoriasGasto} categoriasGastoPersonal={categoriasGastoPersonal}
        clients={clientOpts} projects={projects} brands={brands}
        clientMap={clientMap}
      />
    </>
  );
}

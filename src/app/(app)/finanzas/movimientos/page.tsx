import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { MovimientosView } from "@/components/finanzas/movimientos-view";
import { getMovimientos } from "@/lib/data/finanzas";
import { getClients, getBrands } from "@/lib/data/clients";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Movimientos" };

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ tipo?: string }>;
}) {
  const { tipo } = await searchParams;
  const initialTipo = tipo === "ingreso" || tipo === "gasto" ? tipo : "todo";

  const supabase = await createClient();
  const [{ incomes, expenses }, clients, brands, cats, projs] = await Promise.all([
    getMovimientos(),
    getClients(),
    getBrands(),
    supabase.from("categories").select("nombre, tipo"),
    supabase.from("projects").select("id, nombre").order("created_at", { ascending: false }).limit(200),
  ]);

  const categorias = (cats.data ?? []) as { nombre: string; tipo: string }[];
  const categoriasIngreso = categorias.filter((c) => c.tipo === "ingreso").map((c) => c.nombre);
  const categoriasGasto = categorias.filter((c) => c.tipo === "gasto").map((c) => c.nombre);
  const clientOpts = clients.map((c) => ({ id: c.id, nombre: `${c.nombre} ${c.apellido ?? ""}`.trim() }));
  const projects = ((projs.data ?? []) as { id: string; nombre: string | null }[]).map((p) => ({ id: p.id, nombre: p.nombre ?? "Proyecto" }));

  return (
    <div className="space-y-4">
      <Link href="/finanzas" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground">
        <ArrowLeft className="size-4" /> Finanzas
      </Link>
      <PageHeader title="Movimientos" subtitle="Busca, filtra y ordena todos tus ingresos y gastos. El total de lo filtrado va arriba." />
      <MovimientosView
        incomes={incomes} expenses={expenses}
        clients={clientOpts} brands={brands} projects={projects}
        categoriasIngreso={categoriasIngreso} categoriasGasto={categoriasGasto}
        initialTipo={initialTipo}
      />
    </div>
  );
}

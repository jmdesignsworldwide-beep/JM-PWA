"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Wallet } from "lucide-react";
import { logNoExpense } from "@/app/(app)/finanzas/actions";
import { AddExpenseDialog } from "./add-expense-dialog";
import { Button } from "@/components/ui/button";

type Opt = { id: string; nombre: string };

export function DailyExpensePrompt({
  registradoHoy, categorias, projects, brands,
}: {
  registradoHoy: boolean; categorias: string[]; projects: Opt[]; brands: Opt[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [done, setDone] = useState(registradoHoy);

  if (done) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-success/30 bg-success/10 px-4 py-3 text-sm text-success">
        <Check className="size-4" /> Día registrado. ¡Buen control! 💪
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] px-4 py-3">
      <Wallet className="size-5 text-warning" />
      <p className="flex-1 text-sm font-medium">¿Qué gastaste hoy?</p>
      <AddExpenseDialog
        categorias={categorias} projects={projects} brands={brands}
        trigger={<Button variant="gradient" size="sm">Registrar gasto</Button>}
      />
      <Button variant="outline" size="sm" disabled={pending}
        onClick={() => startTransition(async () => { await logNoExpense(); setDone(true); router.refresh(); })}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} No gasté nada hoy
      </Button>
    </div>
  );
}

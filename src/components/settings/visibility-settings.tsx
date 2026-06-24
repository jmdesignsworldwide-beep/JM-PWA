"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { NAV_ITEMS } from "@/lib/nav";
import { updateHiddenModules } from "@/app/(app)/configuracion/actions";
import { AnimatedCard } from "@/components/animations/motion";
import { Switch } from "@/components/ui/switch";

// Dashboard y Configuración nunca se ocultan.
const FIJOS = ["/", "/configuracion"];

export function VisibilitySettings({ hidden }: { hidden: string[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hiddenSet, setHiddenSet] = useState<Set<string>>(new Set(hidden));
  const items = NAV_ITEMS.filter((i) => !FIJOS.includes(i.href));

  function toggle(href: string, visible: boolean) {
    const next = new Set(hiddenSet);
    if (visible) next.delete(href); else next.add(href);
    setHiddenSet(next);
    startTransition(async () => {
      await updateHiddenModules([...next]);
      router.refresh();
    });
  }

  return (
    <AnimatedCard className="p-6">
      <h2 className="flex items-center gap-2 font-semibold">
        <Eye className="size-4 text-electric" /> Accesos y visibilidad
        {pending && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Elige qué módulos aparecen en tu menú. Ocultar un módulo no borra nada y no afecta los datos —
        como owner sigues viendo todo. (Inicio y Configuración siempre visibles. Los empleados solo ven su espacio <span className="font-medium text-foreground">/trabajo</span>.)
      </p>

      <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
        {items.map((item) => {
          const Icon = item.icon;
          const visible = !hiddenSet.has(item.href);
          return (
            <li key={item.href} className="flex items-center gap-3 px-3 py-2.5">
              <Icon className={visible ? "size-4 text-electric" : "size-4 text-muted-foreground"} />
              <span className={visible ? "flex-1 text-sm" : "flex-1 text-sm text-muted-foreground"}>{item.label}</span>
              <span className="text-xs text-muted-foreground">{visible ? "Visible" : "Oculto"}</span>
              <Switch checked={visible} onCheckedChange={(v) => toggle(item.href, v)} />
            </li>
          );
        })}
      </ul>
    </AnimatedCard>
  );
}

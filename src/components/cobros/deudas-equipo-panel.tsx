"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";
import type { MemberSaldo } from "@/lib/data/equipo";
import { money } from "@/lib/format";
import { PaymentDialog } from "@/components/equipo/payment-dialog";

/**
 * "¿A quién le debo?" — el dinero que le debes al equipo, alimentado por las
 * tareas HECHAS con monto asignado (menos lo ya pagado). Vive en Cobros (es
 * dinero). Registrar el pago desde aquí.
 */
export function DeudasEquipoPanel({ debts }: { debts: MemberSaldo[] }) {
  if (debts.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border px-6 py-8 text-center text-sm text-muted-foreground">
        No le debes a nadie ahora. 🎉 (Las tareas hechas con pago acordado aparecen aquí.)
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {debts.map((m) => {
        const wa = (m.whatsapp ?? m.telefono ?? "").replace(/\D/g, "");
        return (
          <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
            <Link href={`/equipo/${m.id}`} className="font-medium hover:text-electric">{m.nombre}</Link>
            <span className="text-xs text-muted-foreground">pagado {money(m.pagado, "DOP")} de {money(m.acordado, "DOP")}</span>
            <span className="ml-auto font-semibold text-destructive">Debes {money(m.saldo, "DOP")}</span>
            {wa && (
              <a
                href={`https://wa.me/${wa}?text=${encodeURIComponent(`Hola ${m.nombre}, coordinemos tu pago de ${money(m.saldo, "DOP")}.`)}`}
                target="_blank" rel="noopener noreferrer" title="WhatsApp" className="text-success"
              >
                <MessageCircle className="size-4" />
              </a>
            )}
            <PaymentDialog memberId={m.id} saldo={m.saldo} />
          </div>
        );
      })}
    </div>
  );
}

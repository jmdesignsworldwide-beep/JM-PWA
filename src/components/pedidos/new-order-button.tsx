import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Botón "Nuevo pedido": lleva al formulario, donde se elige/crea cliente y marca. */
export function NewOrderButton() {
  return (
    <Link href="/pedidos/nuevo">
      <Button variant="gradient"><Plus className="size-4" /> Nuevo pedido</Button>
    </Link>
  );
}

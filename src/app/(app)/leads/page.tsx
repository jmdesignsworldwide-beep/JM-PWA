import { redirect } from "next/navigation";

/**
 * Prospectos y Clientes se fusionaron en una sola sección. La ruta vieja
 * `/leads` redirige a la lista unificada, ya filtrada a prospectos.
 */
export default function LeadsPage() {
  redirect("/clientes?estado=lead");
}

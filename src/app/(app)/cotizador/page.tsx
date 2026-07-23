import { redirect } from "next/navigation";

// El Cotizador se retiró del sistema. Se conserva la tabla `quotes` y la
// exportación PDF; la ruta redirige limpiamente para no dejar enlaces muertos.
export default function CotizadorRedirect() {
  redirect("/pedidos");
}

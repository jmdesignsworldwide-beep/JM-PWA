# JM Control Center — reglas del proyecto

**Regla de oro:** Lee [`00-MASTER-SPEC.md`](./00-MASTER-SPEC.md) (la fuente única
de la verdad) antes de empezar cualquier fase. Mantén consistencia total con lo
ya construido y **no re-teclees datos**: todo fluye desde la fuente única
(cliente → pedido → contrato → factura → calendario → cobro).

- Construcción por fases en orden (01 → 10). No saltes fases.
- UI en español (RD). Monedas DOP + USD. Zona horaria America/Santo_Domingo.
- Tema oscuro premium por defecto con tokens CSS (re-temables). Animaciones
  llamativas al entrar, sutiles al usar. Respeta `prefers-reduced-motion`.
- Stack: Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 ·
  Supabase (`@supabase/ssr`) · Framer Motion · estilo shadcn/ui.

<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

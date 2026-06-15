# JM CONTROL CENTER — MASTER SPEC (Fuente de la Verdad)
### Sistema integral "monster" para JM Designs Worldwide
**Construido con:** Claude Code · Next.js (App Router) + TypeScript + Tailwind + Supabase (Postgres/Auth/Storage/RLS) + shadcn/ui + Framer Motion + Resend + Anthropic API + Vercel
**Idioma UI:** Español (RD) · **Moneda:** DOP + USD

> Nota de implementación: el proyecto se inicializó con el stack más reciente
> disponible (Next.js 16 + React 19 + Tailwind v4). El spec original mencionaba
> Next.js 14; se mantiene la misma arquitectura App Router.

---

## CÓMO USAR ESTE PAQUETE CON CLAUDE CODE

Este documento es la **fuente única de la verdad**. NO se lo pegas entero a Claude Code de golpe.
En su lugar, le das los archivos de fase EN ORDEN (01, 02, 03...). Cada fase referencia este master spec.

**Regla de oro para Claude Code:** "Lee `00-MASTER-SPEC.md` antes de cada fase. Mantén consistencia con lo ya construido. No re-teclees datos: usa la fuente única."

---

## VISIÓN: POR QUÉ ES UN "MONSTER SYSTEM"

No solo almacena el negocio — **lo hace correr solo**: vende, recuerda, predice y cierra ciclos.
Tres ideas rectoras:
1. **Fuente única de datos:** se teclea una vez, fluye hacia abajo (cliente → pedido → contrato → factura → calendario → cobro).
2. **El sistema actúa solo:** auto-follow-ups, auto-facturación al firmar, recordatorios push, insights.
3. **Premium de verdad:** nivel visual 21st.dev / motionsites.ai, con portal de cliente que hace ver a JM como una empresa 10x.

---

## IDENTIDAD VISUAL Y ANIMACIONES

**Tema:** oscuro premium por defecto (#0A0A0F / #111118), claro opcional. Acentos azul eléctrico + púrpura/teal. Tokens CSS configurables (revendible). shadcn/ui + lucide-react. Glassmorphism sutil. Responsive total.

**Filosofía de movimiento:** llamativo al entrar, sutil al usar.
- **Entrada:** fade + slide-up escalonado (stagger), KPIs con count-up, login/dashboard cinematográficos (escala+fade, spring), transiciones entre páginas.
- **Uso:** hover con elevación + glow sutil (scale 1.02), micro-feedback en botones, indicador deslizante en sidebar, skeletons shimmer (no spinners), toasts deslizantes, drag&drop fluido, modales fade+scale.
- **Fondos animados:** mesh/aurora gradient en movimiento lento (azul/púrpura/teal), glow/blur en movimiento detrás de elementos clave, partículas/grid sutil en login, glassmorphism. Desactivables en Config + respetar `prefers-reduced-motion`.

**Librerías:** Framer Motion para animaciones; CSS animado para fondos; Tailwind para todo lo demás.

**ESTÁNDAR DE ANIMACIONES ESTILO 21st.dev (híbrido — aplica a TODAS las fases):**
- **Pantallas de uso diario** (tablas, formularios, fichas, dashboards internos): efectos hechos a mano con Framer Motion + Tailwind. Limpios, rápidos, sutiles. Sin dependencias extra.
- **Momentos "wow"** (login, hero del dashboard, landing del portal de cliente): se permiten componentes estilo 21st.dev / Aceternity / Motion Primitives para máximo impacto.
- **Regla de compatibilidad:** antes de instalar CUALQUIER librería de animación, verificar compatibilidad 100% con React 19 + Tailwind v4. Si no es compatible, replicar el efecto a mano con Framer Motion. **Nunca romper el build por un efecto visual.**
- **Componentes de efecto reutilizables** (crear una vez, usar en todas las fases): `<AuroraBackground>` (gradiente/mesh animado), `<MagneticCard>` (hover magnético + glow), `<BlurInText>` (texto blur-in/reveal), `<Spotlight>` (seguir-cursor), `<ShimmerBorder>` (bordes brillantes animados), `<SpringTransition>` (transiciones de página con spring).
- Todos respetan `prefers-reduced-motion`. Fondos animados desactivables en Configuración.

> Estado (Fase 1): los seis componentes ya existen en `src/components/animations/`
> (hechos a mano con Framer Motion, sin dependencias extra) y el interruptor de
> fondos animados vive en Configuración (`SettingsProvider`). Aplicados en login
> y dashboard.

---

## ARQUITECTURA GLOBAL

- **Login obligatorio** (Supabase Auth, correo+contraseña). Rutas protegidas, recuperación de contraseña, sesión persistente.
- **Roles:** Owner (todo), Colaborador (limitado/config), y **Cliente** (acceso solo a su portal — ver Fase 7).
- **Multi-marca:** JM Designs, KitJoy Studio, JM Distribution. Filtro global por marca.
- **Buscador global (lupa):** busca en leads, clientes, pedidos, influencers, finanzas. Resultados agrupados.
- **PWA instalable** (manifest, service worker, botón instalar, offline básico) + **Web Push con llaves VAPID**.
- **WhatsApp-first:** todo se comparte con `https://wa.me/NUMERO?text=...` + botón "Enviar". Sin API de WhatsApp.
- Zona horaria America/Santo_Domingo. Montos siempre con su moneda (DOP/USD).

---

## EL FLUJO CENTRAL (CICLO DE VIDA DEL CLIENTE)

```
LEAD → [pipeline ventas] → PEDIDO → CONTRATO (plantilla, editable) → APROBADO/FIRMADO
   → [DISPARO AUTOMÁTICO] → FACTURA + FECHAS EN CALENDARIO + RECORDATORIOS → COBROS/PAGOS
```

**Disparo automático** (al marcar contrato Aprobado/Firmado, o al firmar el cliente en su portal):
genera factura, coloca entrega + cobros en calendario, activa recordatorios, convierte Lead → Cliente activo.

**Barra de ciclo de vida** en cada cliente: `Lead → Pedido → Contrato → Facturado → En progreso → Entregado → Pagado`.

---

## MÓDULOS (RESUMEN — el detalle va en cada fase)

1. **Leads / Ventas** — pipeline Kanban inbound (Nuevo→Contactado→Cotizado→Contrato enviado→Ganado/Perdido). Separado de Influencers.
2. **Clientes y Proyectos** — clientes activos, fichas, proyectos, abonos/saldo, hitos, adjuntos, margen real.
3. **Pedidos / Contratos / Facturas** — el flujo conectado, sin re-teclear.
4. **Cobros y Entregas** — calendario propio + notificaciones (app/correo/push) + WhatsApp.
5. **Finanzas** — ingresos/gastos DOP+USD, facturas/recibos, registro diario "¿qué gastaste hoy?", reportes, margen por proyecto.
6. **Cotizador (2 ramas + AI)** — JM Designs (software por industria, solo lista) / JM Distribution (imprenta, precio por unidad/tamaño). AI Quote Assistant.
7. **Influencers (CRM)** — pipeline outbound, link IG + preview handle, manager sí/no, WhatsApp/correo sí/no, estados, tareas, plantillas DM, export CSV/PDF para campañas, campaña por correo, tasa de respuesta por agencia.
8. **Calendario general** — añadir/quitar eventos, multi-tipo, multi-marca.
9. **Historial / Auditoría inmutable** — registra TODO borrado/cambio. Nadie lo puede borrar (triggers + RLS solo-insert + revoke).
10. **Configuración** — usuarios/roles, marcas, tokens de tema, datos de empresa, plantillas (contrato/DM/WhatsApp), categorías, recordatorios.

---

## FUNCIONES MONSTER (Tier 1 + Tier 2 — el diferenciador)

**Tier 1:**
- **Portal de Cliente** (Fase 7): login propio del cliente; ve su proyecto (barra de progreso, hitos, pendientes), sus facturas y saldo, y **aprueba/firma el contrato** ahí mismo → dispara la automatización.
- **AI Quote Assistant** (Fase 6): el owner escribe en español natural ("restaurante quiere sistema con inventario y POS") y la AI redacta la cotización, escoge módulos y sugiere rango de precio según deals pasados. Usa Anthropic API.
- **Auto-Follow-Up Engine** (Fase 9): vigila cada lead/proyecto y avisa ("este lead fue cotizado hace 5 días sin contrato — ¿enviar recordatorio?") con mensaje WhatsApp de un toque.
- **Smart Insights Dashboard** (Fase 9): insights reales, no solo números ("cobras 40% más rápido a quien paga depósito", "marzo es tu mes lento", "3 proyectos en riesgo de entrega tardía").

**Tier 2:**
- **Ingresos recurrentes:** planes de mantenimiento/hosting/retainers → facturas y recordatorios mensuales automáticos.
- **Motor de margen gasto→proyecto:** cada gasto etiquetado a proyecto → ganancia real por proyecto y por tipo de cliente.
- **Bóveda de documentos por cliente:** contratos, briefs, brand assets, entregables, versionados.
- **WhatsApp-first en todo:** cotización lista, pago vencido, entrega mañana → todo por WhatsApp.

---

## ESQUEMA DE BASE DE DATOS (todas con id uuid, created_at, updated_at, brand_id, created_by donde aplique)

- **users_profiles** — rol (owner/colaborador/cliente), ligado a auth.users, client_id si es cliente.
- **brands** — marcas.
- **clients** — nombre, apellido, cedula, factura_fiscal bool, rnc, telefono, whatsapp, correo, direccion, info_nota, categoria_servicio (web/software/ambos), industria, es_lead bool, etapa_venta, lo_que_quiere, fuente (de dónde vino), brand_id.
- **orders** — client_id, rama (designs/distribution), detalle_json, total, moneda, estado, fecha. ESPINA DORSAL.
- **order_print_items** — items de pedido imprenta (order_id, producto, categoria, personalizacion, metodo (unidad/tamano), cantidad, ancho, alto, precio_unitario, subtotal, arte_url, diseno_por_jm bool).
- **contracts** — order_id, client_id, contenido (auto-rellenado, editable), estado (borrador/enviado/aprobado_firmado), pdf_url, fecha_aprobacion, firma_cliente (del portal).
- **invoices** — contract_id, client_id, es_fiscal bool, ncf, rnc, items_json, subtotal, itbis, total, moneda, pdf_url, estado_pago (pendiente/parcial/pagado), fecha.
- **projects** — client_id, order_id, nombre, tipo, contrato_url, precio_total, moneda, fecha_inicio, fecha_entrega, contenido_hablado, estado, brand_id.
- **project_payments** — project_id/invoice_id, monto, moneda, fecha, metodo.
- **project_milestones** — project_id, nombre, fecha, porcentaje, visible_cliente bool.
- **project_files** — project_id/client_id, file_url, tipo, version, visible_cliente bool.
- **recurring_plans** — client_id, tipo (mantenimiento/hosting/retainer), monto, moneda, frecuencia, proxima_factura, activo.
- **quotes** — client_id, rama, tipo_solucion, industria, modulos_json/items_json, notas, precio_manual?, ai_generado bool, pdf_url, fecha.
- **print_products** — catálogo imprenta (nombre, categoria, tipo_personalizacion, metodo_cobro, precio_base, moneda).
- **influencers** — nombre, ig_url, ig_handle, tiene_whatsapp, whatsapp, tiene_correo, correo, tiene_manager, empresa, manager_nombre, empresa_whatsapp, empresa_correo, estado, fecha_escrito, fecha_respondio, notas, fecha_acuerdo, brand_id.
- **influencer_tasks** — influencer_id, texto, hecha, fecha_limite.
- **email_campaigns** — asunto, mensaje, destinatarios_json, fecha.
- **incomes** — monto, moneda, fecha, categoria, client_id, project_id, descripcion, comprobante_url, brand_id.
- **expenses** — monto, moneda, fecha, categoria, descripcion, factura_url, project_id, brand_id.
- **daily_expense_log** — fecha, sin_gasto bool, nota.
- **calendar_events** — titulo, tipo (inicio/entrega/cobro/acuerdo/personal), fecha, client_id, project_id, color, brand_id, auto_generado bool.
- **message_templates** — tipo (contrato/dm/whatsapp), nombre, contenido (con variables {nombre}, {total}, etc.).
- **categories** — nombre, tipo (ingreso/gasto).
- **push_subscriptions** — user_id, subscription_json (para Web Push/VAPID).
- **followups** — entidad (lead/proyecto/cobro), entidad_id, motivo, fecha_sugerida, atendido bool (para el auto-follow-up engine).
- **audit_log** — accion, tabla, registro_id, contenido_json, usuario_id, fecha. **SOLO INSERT.**

**Storage buckets:** contratos, facturas, proyectos, cotizaciones, comprobantes, brand_assets, portal_entregables.

**Automatizaciones de base de datos (triggers/funciones Postgres):**
- Trigger de auditoría AFTER INSERT/UPDATE/DELETE en todas las tablas de negocio → escribe en audit_log (con OLD en borrados).
- Función/trigger: al cambiar `contracts.estado` a 'aprobado_firmado' → crear invoice + calendar_events (entrega + cobros) + convertir client.es_lead=false.
- RLS en audit_log: solo INSERT. `REVOKE UPDATE, DELETE ON audit_log`.
- RLS por rol: cliente solo ve sus propios registros (portal).

---

## ORDEN DE FASES (los archivos que siguen)

- **01** — Fundación: proyecto Next.js, Supabase, login, layout, sidebar, tema, animaciones base, PWA shell.
- **02** — Base de datos completa: todas las tablas, RLS, triggers de auditoría, función de disparo automático.
- **03** — Leads/Ventas (pipeline) + ficha de Cliente + barra de ciclo de vida.
- **04** — Pedidos → Contratos → Facturas (el flujo conectado, fuente única).
- **05** — Cobros, Entregas, Calendario + notificaciones (app/correo/push VAPID).
- **06** — Cotizador 2 ramas + AI Quote Assistant (Anthropic API).
- **07** — Portal de Cliente (login cliente, ve proyecto/facturas, firma contrato).
- **08** — Finanzas (ingresos/gastos, registro diario, margen, recurrentes) + Influencers CRM.
- **09** — Inteligencia: Smart Insights Dashboard + Auto-Follow-Up Engine.
- **10** — Pulido: Historial/Auditoría UI, Configuración, bóveda de documentos, animaciones finales, PWA/push completo, deploy.

---
**Fin del master spec. Construir cada fase consultando este documento.**

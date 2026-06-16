# 🧬 ESTADO MAESTRO — JM CONTROL CENTER
### Documento vivo · la VERDAD del proyecto · se actualiza siempre
**Última actualización:** Fase 9 (Inteligencia: Smart Insights + Auto-Follow-Up). Fases 1-8 mergeadas a `main`; Fase 9 en PR. Método migración: PAT. PRs: uno por fase. Falta solo la Fase 10 (Pulido + Deploy).
**Para retomar en un chat nuevo:** pega este documento y di "este es el estado maestro de mi proyecto, sigamos desde aquí".

---

## 🎯 QUÉ ESTAMOS CONSTRUYENDO
**JM Control Center** — un sistema "monster" todo-en-uno para JM Designs Worldwide: controla clientes, leads, pedidos, contratos, facturación, cobros, calendario, finanzas, influencers, y más. Estándar: premium nivel 21st.dev / motionsites.ai. No "que sirva" — que diga "wow, esto es el futuro".

**Herramienta de construcción:** Claude Code (Marien dirige, no programa). Esta socia estratégica arma los prompts y revisa; Marien aprueba cada pieza antes de mergear.

---

## 🛠️ STACK TÉCNICO (CONFIRMADO)
- **Next.js 16 + React 19 + Tailwind v4** (Claude Code actualizó de Next 14; aceptado). App Router.
- **Supabase** (Postgres, Auth, Storage, RLS) — base de datos y autenticación.
- **shadcn/ui** + **Framer Motion** (animaciones) + **lucide-react** (íconos).
- **Resend** (correos) · **Google Gemini** (funciones de IA, free tier) · **Vercel** (deploy + cron).
- **PWA** instalable + **Web Push (VAPID)** para notificaciones al celular.
- Idioma UI: Español (RD). Moneda: DOP + USD. Zona horaria: America/Santo_Domingo.
- **Repo GitHub:** github.com/jmdesignsworldwide-beep/JM-PWA

---

## ⚠️ REGLAS DE TRABAJO (no romper)
1. **Una pieza a la vez**, bien hecha, antes de la siguiente. Construcción por FASES (01–10).
2. **Cada fase = su propio PR.** Claude Code trabaja en rama/PR, prueba, y ESPERA el OK de Marien. NUNCA mergea sin aprobación. Marien prueba en preview/incógnito.
3. **Resúmenes CORTOS** de Claude Code (3-4 líneas: qué hizo + qué probar).
4. **Fuente única de datos:** un dato vive en UN lugar y viaja. Nada duplicado, nada en callejón sin salida (organismo).
5. **Honestidad brutal** de la socia: si algo es mediocre, innecesario, o Marien se sobre-complica → decirlo.
6. **Investigar antes de construir.** Entender causa raíz antes de parchar.
7. **Seguridad:** nunca exponer llaves; service_role solo en Claude Code; respetar roles.
8. **Estándar WOW:** si no da el wow, se itera hasta que sí.

---

## 📦 LAS 10 FASES (mapa del build)
1. **Fundación** — proyecto, login, sidebar, tema, animaciones, PWA shell. ✅ HECHA (PR #1)
2. **Base de datos** — tablas, RLS, auditoría inmutable, disparo automático. ✅ HECHA Y APLICADA EN SUPABASE (26 tablas, money NUMERIC(14,2), audit_log inmutable probado, disparo automático probado)
3. **Leads/Ventas + ficha de Cliente + barra de ciclo de vida.** ✅ HECHA (Kanban drag&drop, ficha con ciclo de vida desde datos reales, búsqueda global, valor_estimado opcional añadido vía PAT)
4. **Pedidos→Contratos→Facturas** (el corazón, sin re-teclear). ✅ HECHA (2 ramas, hilo de conversación, split de pagos auto-agendado, antigüedad de contrato, duplicar pedido, snapshot de precios, PDFs con pdf-lib, disparo automático funcionando)
5. **Cobros/Calendario/Notificaciones** (app/correo/push VAPID). ✅ HECHA Y MERGEADA (centro HOY, flujo de caja, calendarios, campana, WhatsApp redactado, cron+push deploy-ready)
6. **Cotizador (2 ramas) + AI Quote Assistant.** ✅ HECHA Y MERGEADA — IA **Google Gemini** server-side; guardar/PDF/WhatsApp; convertir a pedido.
7. **Portal de Cliente** (entra, ve su proyecto, firma → dispara todo). ✅ HECHA Y MERGEADA — aislamiento A≠B probado con 2 clientes reales; firma dispara automatización.
8. **Finanzas + Influencers CRM.** ✅ HECHA Y MERGEADA — margen real, recurrentes/MRR, "¿qué gastaste hoy?", CRM con Kanban/export/campañas/tasa de respuesta.
9. **Inteligencia** (Smart Insights + Auto-Follow-Up Engine). ✅ HECHA (en PR) — KPIs reales, insights respaldados por datos, resumen IA (Gemini), panel "Acciones sugeridas hoy" con WhatsApp redactado, cron llena `followups`.
10. **Pulido + Deploy.** ⬅️ SIGUIENTE (último)

---

## 🔧 MÉTODO DE MIGRACIÓN CONFIRMADO (PAT temporal — sin terminal)
Cuando una fase necesita cambiar la base de datos: (1) Claude Code pide un PAT temporal, (2) Marien lo genera en Supabase → Account → Access Tokens, (3) Claude Code aplica la migración vía la API de Management (HTTPS), (4) **Marien REVOCA el PAT de inmediato**. Probado y funcionando en Fases 3 y 4. NO usar terminal/CLI. Las migraciones sin cambios de estructura no necesitan PAT. Todas las migraciones quedan versionadas en `supabase/migrations/`.

---

## 🚨 GUARDRAILES DE ARQUITECTA (no perder en fases futuras)
- **Fase 2:** dinero como entero (centavos) o decimal, NUNCA float. (Se usó NUMERIC(14,2).)
- **Fase 2:** auditoría `audit_log` IMPOSIBLE de borrar/editar (probado → falla).
- **Fase 2/4:** disparo automático con PRUEBA: 1 sola vez, solo al firmar, sin duplicar. (Probado end-to-end en base real.)
- **Fase 6 y 9:** IA = **Google Gemini** (SDK `@google/genai`, modelo `gemini-2.5-flash` del free tier). La `GEMINI_API_KEY` SOLO en el servidor (API route), nunca en el cliente.
- **Fase 7:** verificar que cliente A jamás vea datos de cliente B (riesgo de privacidad #1).
- **Animaciones:** verificar compatibilidad con React 19/Tailwind v4 antes de instalar; si no, hacerlo a mano. No romper el build por un efecto.
- **Rendimiento:** efectos pesados (spotlight, fondos animados) solo en momentos wow (login/dashboard/portal), NO en tablas grandes.

---

## ⚠️ PENDIENTE FISCAL (anotado, no inventado)
En `invoices` quedó `ncf = NULL`. El ITBIS sí se calcula (18% opcional si fiscal, especificado en Fase 4). La generación de NCF/e-CF se hará en el módulo fiscal cuando se conecte el RNC / NIDO. NO inventar reglas fiscales dominicanas.

---

## 🎨 PARA EL PULIDO FINAL (Fase 10 — anotado para no perder)
- Editor de contrato rich-text (negritas, logo, imágenes) — ahora es texto plano.
- Correo por Resend (compartir contrato/factura) — se integra en Fase 5.
- Tuning visual general nivel 21st.dev.

---

## 🧩 DECISIONES TOMADAS (registro)
- Plataforma: **Claude Code** (se descartó Rocket.new).
- Stack actualizado a Next 16 / React 19 / Tailwind v4 (aceptado).
- Cotizador 2 ramas: JM Designs (software, lista) + JM Distribution (imprenta, precio por unidad/tamaño).
- Dos pipelines SEPARADOS: Leads/Ventas (inbound) e Influencers (outbound).
- Flujo central: Lead→Pedido→Contrato→(firma)→Factura+Calendario+Cobros, sin re-teclear.
- Calendario hits SOLO cuando el contrato se firma/aprueba.
- Animaciones híbridas 21st.dev (a mano para uso diario, librerías/efectos para momentos wow).
- Marcas: JM Designs, KitJoy Studio, JM Distribution.
- Migraciones: método PAT temporal (sin CLI).
- IA: **Google Gemini** (free tier) en vez de Anthropic, para no pagar saldo (Fases 6 y 9). SDK `@google/genai`, modelo `gemini-2.5-flash`.

---

## 💡 IDEAS FUTURAS (Tier 3 — para después)
Asignación de tareas a colaboradores, time tracking, sistema de referidos, portal multi-idioma. Conexión fiscal real NCF/e-CF con NIDO. Productizar/revender el sistema (tokens de tema ya configurables).

---

## 📌 NOTA DE PROCESO
- Fases 1–4 se mergearon juntas en el PR #1; de la Fase 5 en adelante: **un PR por fase** (decisión de Marien). Fases 1–8 ya en `main`. Fase 9 en PR.
- **Pendiente de deploy (Fase 10):** poner en Vercel `GEMINI_API_KEY`, `RESEND_API_KEY`/`RESEND_FROM`/`OWNER_EMAIL`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY`/`VAPID_SUBJECT`, `CRON_SECRET`. Push y correo solo cobran vida en producción (HTTPS).
- Supabase aplicado hasta la migración `005`. Fases 6–9 no requirieron cambios de BD.

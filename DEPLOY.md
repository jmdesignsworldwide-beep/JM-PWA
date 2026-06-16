# Despliegue (Vercel) y QA — JM Control Center

## 1. Variables de entorno (Vercel → Settings → Environment Variables)

**Obligatorias:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secreta, solo servidor)

**Recomendada:** `CRON_SECRET` (protege el cron; Vercel la manda sola como Bearer).

**Opcionales:**
- IA: `GEMINI_API_KEY`, `GEMINI_MODEL` (def. `gemini-2.5-flash`)
- Correo: `RESEND_API_KEY`, `RESEND_FROM`, `OWNER_EMAIL`
- Push: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`

> `NEXT_PUBLIC_*` se hornean en build → ponlas antes del deploy (o redeploy sin caché).

## 2. Pasos

1. **GitHub:** la rama de producción debe ser `main` (Repo → Settings → Branches → Default branch = `main`, o Vercel → Settings → Git → Production Branch = `main`).
2. **Vercel:** New Project → importa el repo → Framework **Next.js** (auto), Node 20/22. Pega las env vars. Deploy.
3. **Supabase:** Authentication → URL Configuration → Site URL = tu dominio Vercel; Redirect URLs incluye `https://TU-DOMINIO/reset-password`.
4. **Migraciones:** ya aplicadas en el proyecto Supabase de producción (hasta `20260616020000`). Si fuera un Supabase nuevo, corre en orden los archivos de `supabase/migrations/` + `supabase/seed.sql`.
5. **VAPID:** genera con `npx web-push generate-vapid-keys` → pon las 3 variables. Push solo funciona en HTTPS/producción + PWA instalada.
6. **Cron:** `vercel.json` ya define `/api/cron/daily` a las 11:00 UTC (~7am RD). Con `CRON_SECRET` queda protegido (fail-closed).

## 3. Checklist de QA (recorrer tras el deploy)

- [ ] Login owner entra al back-office; logout funciona.
- [ ] Lead → arrastrar en Kanban → ficha de cliente → barra de ciclo de vida.
- [ ] Pedido (2 ramas) → Generar contrato → Firmar → **se crean factura + cobros en calendario** (disparo automático).
- [ ] Cotizador: arma cotización, PDF, WhatsApp, "Convertir en pedido". IA responde (si hay GEMINI_API_KEY).
- [ ] Cobros: centro HOY, flujo de caja, calendario, marcar hecho, WhatsApp redactado.
- [ ] Finanzas: ingreso/gasto (+comprobante), "¿qué gastaste hoy?", margen por proyecto, recurrentes/MRR, PDF/CSV.
- [ ] Influencers: alta, Kanban, export CSV/PDF, campaña por correo, tasa de respuesta.
- [ ] Equipo: persona, tarea con monto, registrar pago, "¿a quién le debo?". Colaborador entra en `/login` → `/trabajo` y ve solo lo suyo.
- [ ] Portal de cliente: owner genera acceso → cliente entra en `/portal/login`, ve su progreso/facturas/documentos y firma contrato.
- [ ] Dashboard inteligente: KPIs, resumen IA, acciones sugeridas, insights, gráficos.
- [ ] Historial/Auditoría: se ven los eventos, filtros funcionan, intentar borrar falla (inmutable).
- [ ] Notificaciones: correo diario (cron) y push al celular (tras VAPID).
- [ ] PWA: instalable; íconos; offline básico.
- [ ] Aislamiento: cliente A no ve B; colaborador A no ve B (RLS).

## 4. Seguridad (Fase 10)
- Headers (CSP/HSTS/nosniff/frame-ancestors/Referrer/Permissions) en `next.config.ts`.
- Source maps de producción apagados.
- Cron fail-closed (exige `CRON_SECRET`).
- Rate-limit ligero en endpoints de IA (en memoria, falla-abierto).
- Validación `zod` en el endpoint de IA.
- RLS en todas las tablas; secretos solo en servidor.

### Pendientes anotados (no bloquean el lanzamiento)
- Rate-limit con contador en Supabase (hoy es en memoria por instancia) — requiere tabla nueva.
- Datos de empresa (logo/RNC para PDFs) y editor de tokens de tema persistido — requieren migración/almacenamiento.
- Íconos PWA reales (hoy placeholder) — falta el asset del logo JM.
- Gestión de usuarios/roles desde Configuración (hoy por código/owner).
- Fiscal NCF/e-CF (ITBIS ya calcula) — módulo fiscal con RNC/NIDO.

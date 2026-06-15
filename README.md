# JM Control Center

Sistema integral "monster" para **JM Designs Worldwide**: ventas, clientes,
contratos, facturas, finanzas, cotizador con IA, portal de cliente e
inteligencia de negocio. UI en español (RD), monedas DOP + USD.

> 📖 La **fuente de la verdad** del proyecto es [`00-MASTER-SPEC.md`](./00-MASTER-SPEC.md).
> Construcción por fases (01 → 10). **Esto es la Fase 1 (Fundación).**

## Stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS v4** (tokens de tema en CSS, re-temables)
- **Supabase** (Auth · Postgres · Storage · RLS) vía `@supabase/ssr`
- **Framer Motion** (animaciones) · **lucide-react** (íconos) · estilo **shadcn/ui**
- **PWA** (manifest + service worker + instalación)
- Resend (correo) y Anthropic (IA) se integran en fases posteriores.

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el proyecto en Supabase

1. Entra a [supabase.com](https://supabase.com) y crea un proyecto.
2. Ve a **Project Settings → API** y copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon / public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role key** (¡secreta!) → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Configurar variables de entorno

```bash
cp .env.local.example .env.local
```

Pega tus valores de Supabase en `.env.local`. Las demás variables
(Resend, Anthropic, VAPID) se usan en fases posteriores — puedes dejarlas
con sus valores de ejemplo por ahora.

### 4. Crear tu usuario (login)

La autenticación es por correo + contraseña. Como aún no hay registro
público (es un sistema privado), crea tu usuario desde el panel de Supabase:
**Authentication → Users → Add user** (marca "Auto Confirm User").

> Para que el enlace de recuperación de contraseña funcione, en Supabase ve a
> **Authentication → URL Configuration** y agrega
> `http://localhost:3000/reset-password` (y luego tu dominio de Vercel) a las
> *Redirect URLs*.

### 5. Correr en desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). Sin sesión te llevará a
`/login`.

## Scripts

| Comando                         | Descripción                                  |
| ------------------------------- | -------------------------------------------- |
| `npm run dev`                   | Servidor de desarrollo                       |
| `npm run build`                 | Build de producción                          |
| `npm run start`                 | Servir el build                              |
| `npm run lint`                  | ESLint                                        |
| `node scripts/generate-icons.mjs` | Regenerar íconos PWA placeholder           |

## Estructura (Fase 1)

```
src/
  app/
    layout.tsx              # Root: tema, fuentes, PWA, metadata
    login/                  # Login cinematográfico + recuperación
    reset-password/         # Definir nueva contraseña
    (app)/                  # Área autenticada (sidebar + topbar)
      layout.tsx            # Verifica sesión
      page.tsx              # Dashboard (KPIs con count-up)
      leads/ clientes/ ...  # Placeholders de cada módulo
  components/
    ui/                     # Primitivos estilo shadcn (button, input, card…)
    layout/                 # Sidebar, topbar, app-shell, menús
    animations/             # PageTransition, StaggerContainer, AnimatedCard, CountUp, AuroraBackground
    theme/                  # ThemeProvider + toggle (oscuro/claro)
    pwa/                    # Registro de SW + botón instalar
    auth/                   # Formulario de login
    brand/                  # Logo
  lib/
    supabase/               # Clientes browser/server + sesión (proxy)
    nav.ts                  # Ítems del sidebar y marcas
    utils.ts                # cn()
  proxy.ts                  # Protección de rutas (Next 16 "proxy")
public/
  manifest.webmanifest · sw.js · icons/
```

## Próximas fases

Fase 2 (base de datos: tablas, RLS, triggers de auditoría y disparo
automático). Ver el orden completo en `00-MASTER-SPEC.md`.

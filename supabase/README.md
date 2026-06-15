# Base de datos — JM Control Center (Fase 2)

Capa de datos completa: tablas, RLS, auditoría inmutable y disparo automático.

## Flujo recomendado: CLI (push local) ⭐

A partir de ahora, cuando se agregue una migración nueva en `supabase/migrations/`,
Marien la aplica con **un solo comando** desde su computadora. Las llaves nunca
salen de tu máquina.

**Configuración inicial (una sola vez):**

```bash
# 1) Inicia sesión (abre el navegador y guarda el token en tu máquina)
npx supabase login

# 2) Enlaza este repo con tu proyecto (te pedirá la CONTRASEÑA de la base de
#    datos: Supabase -> Project Settings -> Database -> Database password)
npx supabase link --project-ref ljhvpsyqdobcbcrhbwdd

# 3) Como las migraciones de la Fase 2 ya se aplicaron a mano (SQL Editor),
#    marca su historial como "ya aplicado" para que el CLI no las repita:
npx supabase migration repair --status applied 20260615120001 20260615120002
```

**Cada vez que haya una migración nueva (lo de siempre a futuro):**

```bash
git pull                 # trae las migraciones nuevas que dejé en el repo
npx supabase db push     # las aplica a tu base de datos
```

> ¿Por qué no las aplico yo desde la nube? Mi entorno de ejecución es un
> contenedor efímero con el puerto de Postgres (5432/6543) bloqueado, así que
> `db push` no puede conectarse a tu BD desde ahí. Por eso el push lo corres tú
> (1 comando) y tus credenciales nunca se exponen.

---

## Alternativa: SQL Editor (pegar → Run)

Si prefieres no usar el CLI, también puedes pegar los archivos a mano.

### Orden para correr en Supabase (SQL Editor → pegar → Run)

1. **`migrations/20260615120001_schema.sql`** — todas las tablas, funciones, triggers, RLS y grants.
2. **`migrations/20260615120002_storage.sql`** — buckets de Storage y sus políticas.
3. **`seed.sql`** — marcas, categorías, plantillas y tu perfil **owner**.
   - Tu usuario debe existir antes en **Authentication → Users**. Si no, créalo y
     vuelve a correr `seed.sql`.

> Cada archivo es **idempotente**: puedes correrlo más de una vez sin romper nada.

## Pruebas (demuestran los criterios de aceptación)

Pégalas en el SQL Editor. Hacen `ROLLBACK` al final (no dejan datos). Si algo
falla, lanzan `EXCEPTION`; si pasan, verás `PASÓ ✅` en los mensajes (`NOTICE`).

- **`tests/test_audit_immutable.sql`** — intenta borrar y editar `audit_log` →
  ambos deben fallar (historial imposible de alterar).
- **`tests/test_auto_fire.sql`** — firma un contrato y comprueba que se crean
  **1 factura + 1 proyecto + 2 eventos** y el lead pasa a cliente; al firmar de
  nuevo **no se duplica** nada.

## Notas de diseño

- **Dinero:** `NUMERIC(14,2)` (decimal exacto de Postgres). **Nunca float.**
- **Auditoría inmutable:** trigger `BEFORE UPDATE/DELETE` en `audit_log` que
  lanza excepción para todos + `REVOKE UPDATE, DELETE` a `authenticated`/`anon`.
  Solo un superusuario que desactive triggers podría saltarlo.
- **Disparo automático:** trigger en `contracts`; al pasar a `aprobado_firmado`
  crea factura + eventos + proyecto y convierte el lead. Es **idempotente**
  (si ya hay factura para ese contrato, no repite).
- **PENDIENTE fiscal (no inventado):** en la factura, `ncf` queda `NULL` e
  `itbis = 0`. La generación de **NCF/e-CF** y el cálculo de **ITBIS** se harán
  en el módulo fiscal cuando conectemos el RNC / sistema NIDO.

## Regenerar tipos TypeScript

`src/lib/database.types.ts` está escrito a mano y al día con el esquema. Para
regenerarlo desde Supabase (requiere `supabase login`):

```bash
npx supabase gen types typescript --project-id ljhvpsyqdobcbcrhbwdd > src/lib/database.types.ts
```

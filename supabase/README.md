# Base de datos — JM Control Center (Fase 2)

Capa de datos completa: tablas, RLS, auditoría inmutable y disparo automático.

## Orden para correr en Supabase (SQL Editor → pegar → Run)

1. **`migrations/001_schema.sql`** — todas las tablas, funciones, triggers, RLS y grants.
2. **`migrations/002_storage.sql`** — buckets de Storage y sus políticas.
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

-- ============================================================================
-- JM CONTROL CENTER — seed.sql
-- Datos iniciales mínimos. Correr DESPUÉS de 001_schema.sql.
-- Es idempotente (se puede correr varias veces).
-- ============================================================================

-- Marcas
insert into public.brands (nombre) values
  ('JM Designs'),
  ('KitJoy Studio'),
  ('JM Distribution')
on conflict (nombre) do nothing;

-- Categorías de ingresos/gastos
insert into public.categories (nombre, tipo) values
  ('Ventas',                 'ingreso'),
  ('Servicios',              'ingreso'),
  ('Mantenimiento/Hosting',  'ingreso'),
  ('Imprenta',               'ingreso'),
  ('Software y herramientas','gasto'),
  ('Publicidad',             'gasto'),
  ('Materiales/Imprenta',    'gasto'),
  ('Operativo',              'gasto'),
  ('Impuestos',              'gasto')
on conflict (nombre, tipo) do nothing;

-- Plantillas de mensaje de ejemplo (variables tipo {nombre}, {total})
insert into public.message_templates (tipo, nombre, contenido) values
  ('contrato', 'Contrato base',
   'CONTRATO DE SERVICIOS\n\nEntre JM Designs Worldwide y {nombre}.\nProyecto: {proyecto}\nMonto: {total} {moneda}\nFecha de entrega estimada: {fecha_entrega}\n\n[Cláusulas editables...]'),
  ('whatsapp', 'Cotización lista',
   'Hola {nombre} 👋, te comparto la cotización de tu proyecto: {total} {moneda}. ¿La revisamos?'),
  ('whatsapp', 'Pago vencido',
   'Hola {nombre}, te recuerdo el pago pendiente de {total} {moneda} de tu proyecto. ¡Gracias!'),
  ('dm', 'Primer contacto influencer',
   '¡Hola {nombre}! Somos JM Designs. Nos encanta tu contenido y queremos proponerte una colaboración. ¿Te cuento? 🚀')
on conflict (tipo, nombre) do nothing;

-- Perfil OWNER para tu usuario (debe existir ya en Authentication -> Users).
-- Liga por correo; si tu usuario aún no existe, crea el usuario primero y
-- vuelve a correr este bloque.
insert into public.users_profiles (id, rol, nombre, correo)
select u.id, 'owner', 'Marien', u.email
from auth.users u
where u.email = 'jm.designs.worldwide@gmail.com'
on conflict (id) do update set rol = 'owner';

-- FIN seed.sql

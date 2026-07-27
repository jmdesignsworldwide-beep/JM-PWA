-- ============================================================================
-- JM CONTROL CENTER — Semillas de catálogo para KitJoy Studio
-- KitJoy no tenía ítems en catalog_items (por eso el catálogo salía vacío al
-- crear un pedido). Se cargan sus atajos rápidos. Editables/borrables desde la
-- app. Idempotente: no inserta si la marca ya tiene ítems.
-- ============================================================================
insert into public.catalog_items (brand_id, nombre, categoria, unidad, orden)
select b.id, x.nombre, x.categoria, x.unidad, x.orden
from public.brands b
cross join (values
  ('Papelería',              'KitJoy', 'unidad',   1),
  ('Invitaciones digitales', 'KitJoy', 'unidad',   2),
  ('Toppers',                'KitJoy', 'unidad',   3),
  ('Cosas de cumpleaños',    'KitJoy', 'unidad',   4),
  ('Decoración de globos',   'KitJoy', 'servicio', 5),
  ('Manualidades',           'KitJoy', 'unidad',   6)
) as x(nombre, categoria, unidad, orden)
where b.nombre ilike '%kitjoy%'
  and not exists (select 1 from public.catalog_items c where c.brand_id = b.id);
-- FIN

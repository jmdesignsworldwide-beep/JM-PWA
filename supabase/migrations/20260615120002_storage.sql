-- ============================================================================
-- JM CONTROL CENTER — 002_storage.sql
-- Buckets de Storage + políticas de acceso.
-- Correr DESPUÉS de 001_schema.sql en el SQL Editor de Supabase.
-- ============================================================================

-- Buckets (privados por defecto). 'portal_entregables' es lo único que el
-- cliente puede leer (solo lo suyo); el resto es solo-staff.
insert into storage.buckets (id, name, public)
values
  ('contratos',          'contratos',          false),
  ('facturas',           'facturas',           false),
  ('proyectos',          'proyectos',          false),
  ('cotizaciones',       'cotizaciones',       false),
  ('comprobantes',       'comprobantes',       false),
  ('brand_assets',       'brand_assets',       false),
  ('portal_entregables', 'portal_entregables', false)
on conflict (id) do nothing;

-- Solo-staff: lectura/escritura completa en los buckets internos.
do $$
declare
  b text;
  staff_buckets text[] := array[
    'contratos','facturas','proyectos','cotizaciones','comprobantes','brand_assets'
  ];
begin
  foreach b in array staff_buckets loop
    execute format($p$
      drop policy if exists "staff_%1$s" on storage.objects;
      create policy "staff_%1$s" on storage.objects for all to authenticated
        using (bucket_id = %1$L and public.is_staff())
        with check (bucket_id = %1$L and public.is_staff());
    $p$, b);
  end loop;
end $$;

-- portal_entregables: staff escribe/lee todo; cliente SOLO lee lo suyo.
-- Convención de ruta: portal_entregables/<client_id>/archivo.ext
drop policy if exists "staff_portal_entregables" on storage.objects;
create policy "staff_portal_entregables" on storage.objects for all to authenticated
  using (bucket_id = 'portal_entregables' and public.is_staff())
  with check (bucket_id = 'portal_entregables' and public.is_staff());

drop policy if exists "client_read_portal_entregables" on storage.objects;
create policy "client_read_portal_entregables" on storage.objects for select to authenticated
  using (
    bucket_id = 'portal_entregables'
    and (storage.foldername(name))[1] = public.my_client_id()::text
  );

-- FIN 002_storage.sql

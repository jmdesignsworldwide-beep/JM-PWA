-- ============================================================================
-- JM CONTROL CENTER — Fix: pgcrypto en el search_path de las RPC de seguridad
-- Las funciones SECURITY DEFINER del PIN/cifrado usan gen_salt/crypt/pgp_sym_*
-- (pgcrypto). En Supabase pgcrypto vive en el esquema `extensions`, así que con
-- `search_path = public` fijo no las encuentra ("function gen_salt(unknown) does
-- not exist"). Se añade `extensions` al search_path. No cambia la lógica.
-- ============================================================================

alter function public.set_system_pin(uuid, text)                       set search_path = public, extensions;
alter function public.reveal_protected(uuid, text, uuid, text)         set search_path = public, extensions;
alter function public.save_contact_bank(uuid, uuid, text, text, text, text, text, text) set search_path = public, extensions;
alter function public.reveal_contact_bank(uuid, uuid, text)            set search_path = public, extensions;

-- FIN

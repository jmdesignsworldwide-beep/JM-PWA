-- ============================================================================
-- JM CONTROL CENTER — 20260616020000_equipo_login.sql  (Fase 9.5b)
-- Login propio para colaboradores: rol 'equipo' (NO staff). Ve SOLO sus tareas
-- y sus pagos; nunca clientes, finanzas, leads, otros colaboradores ni back-office.
-- ============================================================================

-- Correo para crear la cuenta del colaborador.
alter table public.team_members add column if not exists correo text;

-- Liga el perfil de auth a un miembro del equipo + nuevo rol 'equipo'.
alter table public.users_profiles add column if not exists team_member_id uuid
  references public.team_members(id) on delete set null;

alter table public.users_profiles drop constraint if exists users_profiles_rol_check;
alter table public.users_profiles add constraint users_profiles_rol_check
  check (rol in ('owner','colaborador','cliente','equipo'));

-- Helper: id del miembro del equipo del usuario actual (SECURITY DEFINER).
create or replace function public.my_team_member_id()
returns uuid language sql stable security definer set search_path = public as $$
  select team_member_id from public.users_profiles where id = auth.uid();
$$;

-- RLS para rol 'equipo': SOLO lectura de lo suyo.
drop policy if exists equipo_read_self_member on public.team_members;
create policy equipo_read_self_member on public.team_members for select to authenticated
  using (id = public.my_team_member_id());

drop policy if exists equipo_read_tasks on public.tasks;
create policy equipo_read_tasks on public.tasks for select to authenticated
  using (team_member_id = public.my_team_member_id());

drop policy if exists equipo_read_payments on public.team_payments;
create policy equipo_read_payments on public.team_payments for select to authenticated
  using (team_member_id = public.my_team_member_id());

-- El colaborador puede cambiar SOLO el estado de SUS tareas (no el monto).
-- Vía función SECURITY DEFINER que valida la propiedad; sin policy de UPDATE.
create or replace function public.worker_update_task_estado(p_task uuid, p_estado text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_estado not in ('pendiente','en_progreso','hecha') then
    raise exception 'estado inválido';
  end if;
  update public.tasks set estado = p_estado
   where id = p_task and team_member_id = public.my_team_member_id();
  if not found then raise exception 'no autorizado'; end if;
end $$;

grant execute on function public.worker_update_task_estado(uuid, text) to authenticated;

-- FIN 20260616020000_equipo_login.sql

alter table public.penya_miembros drop constraint if exists penya_miembros_invitacion_id_fkey;
alter table public.penya_miembros add constraint penya_miembros_invitacion_id_fkey foreign key (invitacion_id) references public.penya_invitaciones(id) on delete set null;

create or replace function private.es_admin_penyera()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select lower(coalesce(auth.jwt()->>'email','')) in (
    'gomezandersonalex@gmail.com',
    'alexgomezanderson14@gmail.com'
  );
$$;
revoke all on function private.es_admin_penyera() from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.es_admin_penyera() to authenticated;

drop policy if exists "Users see own membership or approved peña roster" on public.penya_miembros;
create policy "Users see own membership or approved peña roster"
on public.penya_miembros for select to authenticated
using (
  user_id = (select auth.uid())
  or (select private.es_admin_penyera())
  or (select private.es_miembro_aprobado_penya(penya_id))
);

create or replace function public.revisar_solicitud_penya(p_miembro_id uuid, p_aprobar boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target public.penya_miembros%rowtype;
  v_has_approved_member boolean;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_target from public.penya_miembros where id = p_miembro_id for update;
  if not found then raise exception 'La solicitud no existe.'; end if;
  select exists(select 1 from public.penya_miembros m where m.penya_id = v_target.penya_id and m.estado = 'aprobado')
    into v_has_approved_member;
  if not private.es_admin_penyera() then
    if not v_has_approved_member then raise exception 'El primer miembro de cada peña debe aprobarlo el administrador de PENYERA.'; end if;
    if not exists(select 1 from public.penya_miembros m where m.penya_id = v_target.penya_id and m.user_id = v_user and m.estado = 'aprobado') then
      raise exception 'Solo un miembro aprobado de esta peña puede revisar solicitudes.';
    end if;
  end if;
  if v_target.estado <> 'pendiente' then raise exception 'Esta solicitud ya ha sido revisada.'; end if;
  update public.penya_miembros set estado = case when p_aprobar then 'aprobado' else 'rechazado' end,
    revisado_en = now(), revisado_por = v_user where id = p_miembro_id;
  return jsonb_build_object('estado',case when p_aprobar then 'aprobado' else 'rechazado' end,'penya_id',v_target.penya_id);
end;
$$;

create or replace function public.crear_invitacion_penya(p_penya_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_token uuid;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  if not private.es_admin_penyera()
     and not exists(select 1 from public.penya_miembros m where m.penya_id = p_penya_id and m.user_id = v_user and m.estado = 'aprobado') then
    raise exception 'Solo el administrador de PENYERA o un miembro aprobado puede crear invitaciones.';
  end if;
  insert into public.penya_invitaciones(penya_id,creado_por) values(p_penya_id,v_user) returning token into v_token;
  return jsonb_build_object('token',v_token,'penya_id',p_penya_id,'caduca_en',now()+interval '30 days');
end;
$$;
revoke all on function public.revisar_solicitud_penya(uuid,boolean) from public, anon;
revoke all on function public.crear_invitacion_penya(uuid) from public, anon;
grant execute on function public.revisar_solicitud_penya(uuid,boolean) to authenticated;
grant execute on function public.crear_invitacion_penya(uuid) to authenticated;

revoke all on function public.penya_member_profile_snapshot() from public, anon, authenticated;

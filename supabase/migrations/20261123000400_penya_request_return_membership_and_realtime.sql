create or replace function public.solicitar_pertenecer_penya(p_penya_id uuid, p_token uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_membership public.penya_miembros%rowtype;
  v_invite public.penya_invitaciones%rowtype;
  v_penya public.penyes%rowtype;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para solicitar pertenecer a una peña.';
  end if;

  select * into v_penya
  from public.penyes
  where id = p_penya_id and estado = 'aprobada';
  if not found then
    raise exception 'Esta peña no está disponible.';
  end if;

  if p_token is not null then
    select * into v_invite
    from public.penya_invitaciones
    where token = p_token and penya_id = p_penya_id and activa = true and caduca_en > now();
    if not found then
      raise exception 'Este enlace de invitación no es válido o ha caducado.';
    end if;
  end if;

  select * into v_membership
  from public.penya_miembros
  where user_id = v_user;

  if found then
    if v_membership.penya_id <> p_penya_id then
      raise exception 'Tu cuenta ya tiene una solicitud o pertenece a otra peña.';
    end if;
    if v_membership.estado = 'aprobado' then
      return jsonb_build_object(
        'id', v_membership.id,
        'penya_id', v_membership.penya_id,
        'user_id', v_membership.user_id,
        'display_name', v_membership.display_name,
        'avatar_url', v_membership.avatar_url,
        'joined_at', v_membership.joined_at,
        'estado', v_membership.estado,
        'solicitado_en', v_membership.solicitado_en,
        'revisado_en', v_membership.revisado_en,
        'message', 'Ya formas parte de esta peña.'
      );
    end if;

    update public.penya_miembros
    set estado = 'pendiente',
        solicitado_en = now(),
        revisado_en = null,
        revisado_por = null,
        invitacion_id = case when p_token is null then invitacion_id else v_invite.id end
    where id = v_membership.id
    returning * into v_membership;
  else
    insert into public.penya_miembros(penya_id, user_id, invitacion_id)
    values (p_penya_id, v_user, case when p_token is null then null else v_invite.id end)
    returning * into v_membership;
  end if;

  return jsonb_build_object(
    'id', v_membership.id,
    'penya_id', v_membership.penya_id,
    'user_id', v_membership.user_id,
    'display_name', v_membership.display_name,
    'avatar_url', v_membership.avatar_url,
    'joined_at', v_membership.joined_at,
    'estado', v_membership.estado,
    'solicitado_en', v_membership.solicitado_en,
    'revisado_en', v_membership.revisado_en,
    'message', 'Solicitud enviada. Está pendiente de aprobación.'
  );
end;
$function$;

do $publication$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = 'penya_miembros'
     ) then
    alter publication supabase_realtime add table public.penya_miembros;
  end if;
end;
$publication$;

grant execute on function public.solicitar_pertenecer_penya(uuid, uuid) to authenticated;
revoke execute on function public.solicitar_pertenecer_penya(uuid, uuid) from anon, public;
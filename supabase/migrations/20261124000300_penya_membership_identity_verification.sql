-- Datos de identidad y comprobación para solicitudes de pertenencia.
-- Email y datos declarados permanecen en penya_miembros, protegidos por su RLS.
alter table public.penya_miembros
  add column if not exists email text,
  add column if not exists nombre_completo text,
  add column if not exists referencia_verificacion text;

-- El snapshot obtiene el email real desde Auth y usa el nombre del perfil como respaldo.
create or replace function public.penya_member_profile_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  profile jsonb;
  account_email text;
begin
  select u.raw_user_meta_data, u.email
    into profile, account_email
  from auth.users u
  where u.id = new.user_id;

  new.email := account_email;
  new.display_name := coalesce(
    nullif(btrim(profile->>'full_name'), ''),
    nullif(btrim(profile->>'name'), ''),
    nullif(btrim(profile->>'display_name'), ''),
    nullif(btrim(profile->>'username'), ''),
    nullif(split_part(coalesce(account_email, ''), '@', 1), ''),
    'Nombre no indicado'
  );
  new.avatar_url := coalesce(
    nullif(profile->>'avatar_url', ''),
    nullif(profile->>'picture', '')
  );
  return new;
end;
$function$;

drop trigger if exists penya_member_profile_snapshot on public.penya_miembros;
create trigger penya_member_profile_snapshot
before insert or update of user_id on public.penya_miembros
for each row execute function public.penya_member_profile_snapshot();

-- Actualiza también las solicitudes que ya existían antes de guardar estos datos.
update public.penya_miembros
set user_id = user_id;

-- La función nueva exige nombre completo y una referencia para que la peña
-- pueda comprobar la identidad. La dirección de email nunca se acepta del cliente:
-- se toma de auth.users mediante el trigger SECURITY DEFINER.
create or replace function public.solicitar_pertenecer_penya_con_datos(
  p_penya_id uuid,
  p_token uuid,
  p_nombre_completo text,
  p_referencia_verificacion text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_user uuid := auth.uid();
  v_nombre text := btrim(coalesce(p_nombre_completo, ''));
  v_referencia text := btrim(coalesce(p_referencia_verificacion, ''));
  v_result jsonb;
begin
  if v_user is null then
    raise exception 'Debes iniciar sesión para solicitar pertenecer a una peña.';
  end if;
  if char_length(v_nombre) < 3 or char_length(v_nombre) > 120 then
    raise exception 'Introduce tu nombre y apellidos (entre 3 y 120 caracteres).';
  end if;
  if char_length(v_referencia) < 8 or char_length(v_referencia) > 500 then
    raise exception 'Añade una referencia que permita a la peña identificarte (entre 8 y 500 caracteres).';
  end if;

  -- Reutiliza las comprobaciones existentes de peña, invitación y pertenencia única.
  v_result := public.solicitar_pertenecer_penya(p_penya_id, p_token);

  update public.penya_miembros
  set display_name = v_nombre,
      nombre_completo = v_nombre,
      referencia_verificacion = v_referencia
  where user_id = v_user
    and penya_id = p_penya_id;

  if not found then
    raise exception 'No se ha podido guardar la información de tu solicitud.';
  end if;

  return coalesce(v_result, '{}'::jsonb) ||
    jsonb_build_object(
      'display_name', v_nombre,
      'nombre_completo', v_nombre,
      'referencia_verificacion', v_referencia
    );
end;
$function$;

revoke all on function public.penya_member_profile_snapshot() from public, anon, authenticated;
revoke all on function public.solicitar_pertenecer_penya_con_datos(uuid,uuid,text,text) from public, anon;
grant execute on function public.solicitar_pertenecer_penya_con_datos(uuid,uuid,text,text) to authenticated;

notify pgrst, 'reload schema';

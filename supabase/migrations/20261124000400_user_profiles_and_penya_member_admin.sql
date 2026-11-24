-- Perfil personal de cada cuenta y herramientas seguras para administrar miembros.
create table if not exists public.perfiles_usuario (
  user_id uuid primary key references auth.users(id) on delete cascade,
  nombre_completo text not null default '',
  nombre_visible text not null default '',
  avatar_url text,
  telefono text,
  localidad text,
  referencia_festera text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint perfiles_usuario_nombre_completo_length check (char_length(nombre_completo) <= 120),
  constraint perfiles_usuario_nombre_visible_length check (char_length(nombre_visible) <= 60),
  constraint perfiles_usuario_telefono_length check (char_length(coalesce(telefono,'')) <= 30),
  constraint perfiles_usuario_localidad_length check (char_length(coalesce(localidad,'')) <= 100),
  constraint perfiles_usuario_referencia_length check (char_length(coalesce(referencia_festera,'')) <= 300)
);

alter table public.perfiles_usuario enable row level security;
grant select, insert, update on public.perfiles_usuario to authenticated;

drop policy if exists "Users read own profile or site admin" on public.perfiles_usuario;
create policy "Users read own profile or site admin"
on public.perfiles_usuario for select to authenticated
using (user_id = (select auth.uid()) or (select private.es_admin_penyera()));

drop policy if exists "Users insert own profile" on public.perfiles_usuario;
create policy "Users insert own profile"
on public.perfiles_usuario for insert to authenticated
with check (user_id = (select auth.uid()));

drop policy if exists "Users update own profile" on public.perfiles_usuario;
create policy "Users update own profile"
on public.perfiles_usuario for update to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- Los avatares son públicos para poder mostrarlos en las fichas, pero solo
-- el propietario autenticado puede subir, sustituir o borrar su archivo.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-avatars', 'profile-avatars', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public can view profile avatars" on storage.objects;
create policy "Public can view profile avatars"
on storage.objects for select
using (bucket_id = 'profile-avatars');

drop policy if exists "Users upload own profile avatar" on storage.objects;
create policy "Users upload own profile avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users update own profile avatar" on storage.objects;
create policy "Users update own profile avatar"
on storage.objects for update to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop policy if exists "Users delete own profile avatar" on storage.objects;
create policy "Users delete own profile avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'profile-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create or replace function public.admin_actualizar_miembro_penya(
  p_miembro_id uuid,
  p_nombre_completo text,
  p_nombre_visible text,
  p_referencia_verificacion text,
  p_telefono text,
  p_localidad text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_member public.penya_miembros%rowtype;
  v_full_name text := btrim(coalesce(p_nombre_completo,''));
  v_display_name text := btrim(coalesce(p_nombre_visible,''));
  v_reference text := btrim(coalesce(p_referencia_verificacion,''));
  v_phone text := btrim(coalesce(p_telefono,''));
  v_city text := btrim(coalesce(p_localidad,''));
begin
  if auth.uid() is null or not private.es_admin_penyera() then
    raise exception 'Solo el administrador de PENYERA puede editar miembros.';
  end if;
  if char_length(v_full_name) < 3 or char_length(v_full_name) > 120 then
    raise exception 'El nombre completo debe tener entre 3 y 120 caracteres.';
  end if;
  if char_length(v_display_name) > 60 or char_length(v_reference) > 500 or char_length(v_phone) > 30 or char_length(v_city) > 100 then
    raise exception 'Alguno de los datos supera la longitud permitida.';
  end if;

  select * into v_member
  from public.penya_miembros
  where id = p_miembro_id
  for update;
  if not found then raise exception 'No se ha encontrado el miembro.'; end if;

  insert into public.perfiles_usuario(user_id,nombre_completo,nombre_visible,referencia_festera,telefono,localidad,updated_at)
  values(v_member.user_id,v_full_name,v_display_name,v_reference,v_phone,v_city,now())
  on conflict(user_id) do update
    set nombre_completo = excluded.nombre_completo,
        nombre_visible = excluded.nombre_visible,
        referencia_festera = excluded.referencia_festera,
        telefono = excluded.telefono,
        localidad = excluded.localidad,
        updated_at = now();

  update public.penya_miembros
  set nombre_completo = v_full_name,
      display_name = coalesce(nullif(v_display_name,''),v_full_name),
      referencia_verificacion = nullif(v_reference,'')
  where id = p_miembro_id;

  return jsonb_build_object('id',p_miembro_id,'user_id',v_member.user_id,'updated',true);
end;
$function$;

create or replace function public.admin_eliminar_miembro_penya(p_miembro_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_member public.penya_miembros%rowtype;
begin
  if auth.uid() is null or not private.es_admin_penyera() then
    raise exception 'Solo el administrador de PENYERA puede retirar miembros.';
  end if;
  select * into v_member
  from public.penya_miembros
  where id = p_miembro_id
  for update;
  if not found then raise exception 'No se ha encontrado el miembro.'; end if;

  delete from public.penya_miembros where id = p_miembro_id;
  return jsonb_build_object('id',p_miembro_id,'user_id',v_member.user_id,'penya_id',v_member.penya_id,'removed',true);
end;
$function$;

revoke all on function public.admin_actualizar_miembro_penya(uuid,text,text,text,text,text) from public, anon;
revoke all on function public.admin_eliminar_miembro_penya(uuid) from public, anon;
grant execute on function public.admin_actualizar_miembro_penya(uuid,text,text,text,text,text) to authenticated;
grant execute on function public.admin_eliminar_miembro_penya(uuid) to authenticated;

notify pgrst, 'reload schema';

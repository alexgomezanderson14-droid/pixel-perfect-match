-- Repara la tabla y RPC de invitaciones a peñas en instalaciones existentes.
create table if not exists public.penya_invitaciones (
  id uuid primary key default gen_random_uuid(),
  penya_id uuid not null references public.penyes(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  creado_por uuid not null references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now(),
  caduca_en timestamptz not null default (now() + interval '30 days'),
  activa boolean not null default true
);
create index if not exists idx_penya_invitaciones_penya
  on public.penya_invitaciones(penya_id, activa, caduca_en);
alter table public.penya_invitaciones enable row level security;
revoke all on public.penya_invitaciones from anon, authenticated;
alter table public.penya_miembros add column if not exists invitacion_id uuid;
do $$
begin
  if not exists (select 1 from pg_constraint where conname='penya_miembros_invitacion_id_fkey' and conrelid='public.penya_miembros'::regclass) then
    alter table public.penya_miembros add constraint penya_miembros_invitacion_id_fkey
      foreign key (invitacion_id) references public.penya_invitaciones(id) on delete set null;
  end if;
end $$;
-- La función de autorización se define aquí para que la migración sea autónoma
-- y no dependa de una función privada creada manualmente en otra instalación.
create schema if not exists private;
create or replace function private.es_admin_penyera()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select lower(btrim(coalesce(auth.jwt() ->> 'email', ''))) = 'alexgomezanderson14@gmail.com';
$function$;
revoke all on function private.es_admin_penyera() from public, anon, authenticated;

create or replace function public.crear_invitacion_penya(p_penya_id uuid)
returns jsonb language plpgsql security definer set search_path = ''
as $function$
declare v_user uuid := auth.uid(); v_token uuid;
begin
  if v_user is null then raise exception 'Debes iniciar sesión para crear una invitación.'; end if;
  if not exists(select 1 from public.penyes p where p.id=p_penya_id and p.estado='aprobada') then
    raise exception 'La peña no existe o no está disponible.';
  end if;
  if not private.es_admin_penyera()
     and not exists(select 1 from public.penya_miembros m where m.penya_id=p_penya_id and m.user_id=v_user and m.estado='aprobado') then
    raise exception 'Solo el administrador de PENYERA o un miembro aprobado puede crear invitaciones.';
  end if;
  insert into public.penya_invitaciones(penya_id,creado_por) values(p_penya_id,v_user) returning token into v_token;
  return jsonb_build_object('token',v_token,'penya_id',p_penya_id,'caduca_en',now()+interval '30 days');
end;
$function$;
revoke all on function public.crear_invitacion_penya(uuid) from public, anon;
grant execute on function public.crear_invitacion_penya(uuid) to authenticated;
notify pgrst, 'reload schema';

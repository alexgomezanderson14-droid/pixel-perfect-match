create schema if not exists private;

alter table public.penya_miembros
  add column if not exists estado text not null default 'pendiente',
  add column if not exists solicitado_en timestamptz not null default now(),
  add column if not exists revisado_en timestamptz,
  add column if not exists revisado_por uuid references auth.users(id) on delete set null,
  add column if not exists invitacion_id uuid;

alter table public.penya_miembros drop constraint if exists penya_miembros_estado_check;
alter table public.penya_miembros add constraint penya_miembros_estado_check
  check (estado in ('pendiente','aprobado','rechazado'));

create table if not exists public.penya_invitaciones (
  id uuid primary key default gen_random_uuid(),
  penya_id uuid not null references public.penyes(id) on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  creado_por uuid not null references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now(),
  caduca_en timestamptz not null default (now() + interval '30 days'),
  activa boolean not null default true
);
create index if not exists idx_penya_invitaciones_penya on public.penya_invitaciones(penya_id, activa, caduca_en);
alter table public.penya_miembros drop constraint if exists penya_miembros_invitacion_id_fkey;
alter table public.penya_miembros add constraint penya_miembros_invitacion_id_fkey
  foreign key (invitacion_id) references public.penya_invitaciones(id) on delete set null;

alter table public.penya_miembros enable row level security;
alter table public.penya_invitaciones enable row level security;

create or replace function private.es_miembro_aprobado_penya(p_penya_id uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.penya_miembros m
    where m.penya_id = p_penya_id and m.user_id = auth.uid() and m.estado = 'aprobado'
  );
$$;
revoke all on function private.es_miembro_aprobado_penya(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.es_miembro_aprobado_penya(uuid) to authenticated;

drop policy if exists "Members can view own membership and penya admins can view roster" on public.penya_miembros;
drop policy if exists "Users can join one approved peña" on public.penya_miembros;
drop policy if exists "Users can leave own peña and admins can remove members" on public.penya_miembros;
drop policy if exists "Users see own membership or approved peña roster" on public.penya_miembros;
drop policy if exists "Users can leave own peña" on public.penya_miembros;

create policy "Users see own membership or approved peña roster"
on public.penya_miembros for select to authenticated
using (
  user_id = (select auth.uid())
  or (select auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
  or (select private.es_miembro_aprobado_penya(penya_id))
);
create policy "Users can leave own peña"
on public.penya_miembros for delete to authenticated
using (user_id = (select auth.uid()));

create or replace function public.solicitar_pertenecer_penya(p_penya_id uuid, p_token uuid default null)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_membership public.penya_miembros%rowtype;
  v_invite public.penya_invitaciones%rowtype;
  v_penya public.penyes%rowtype;
begin
  if v_user is null then raise exception 'Debes iniciar sesión para solicitar pertenecer a una peña.'; end if;
  select * into v_penya from public.penyes where id = p_penya_id and estado = 'aprobada';
  if not found then raise exception 'Esta peña no está disponible.'; end if;
  if p_token is not null then
    select * into v_invite from public.penya_invitaciones
    where token = p_token and penya_id = p_penya_id and activa = true and caduca_en > now();
    if not found then raise exception 'Este enlace de invitación no es válido o ha caducado.'; end if;
  end if;
  select * into v_membership from public.penya_miembros where user_id = v_user;
  if found then
    if v_membership.penya_id <> p_penya_id then raise exception 'Tu cuenta ya tiene una solicitud o pertenece a otra peña.'; end if;
    if v_membership.estado = 'aprobado' then
      return jsonb_build_object('estado','aprobado','penya_id',p_penya_id,'message','Ya formas parte de esta peña.');
    end if;
    update public.penya_miembros set estado = 'pendiente', solicitado_en = now(), revisado_en = null, revisado_por = null,
      invitacion_id = case when p_token is null then invitacion_id else v_invite.id end
      where id = v_membership.id returning * into v_membership;
  else
    insert into public.penya_miembros(penya_id,user_id,invitacion_id)
    values(p_penya_id,v_user,case when p_token is null then null else v_invite.id end)
    returning * into v_membership;
  end if;
  return jsonb_build_object('estado',v_membership.estado,'penya_id',p_penya_id,'message','Solicitud enviada. Está pendiente de aprobación.');
end;
$$;

create or replace function public.revisar_solicitud_penya(p_miembro_id uuid, p_aprobar boolean)
returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_target public.penya_miembros%rowtype;
  v_is_web_admin boolean;
  v_has_approved_member boolean;
begin
  if v_user is null then raise exception 'Debes iniciar sesión.'; end if;
  select * into v_target from public.penya_miembros where id = p_miembro_id for update;
  if not found then raise exception 'La solicitud no existe.'; end if;
  v_is_web_admin := lower(coalesce(auth.jwt()->>'email','')) = 'gomezandersonalex@gmail.com';
  select exists(select 1 from public.penya_miembros m where m.penya_id = v_target.penya_id and m.estado = 'aprobado')
    into v_has_approved_member;
  if not v_is_web_admin then
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
  if lower(coalesce(auth.jwt()->>'email','')) <> 'gomezandersonalex@gmail.com'
     and not exists(select 1 from public.penya_miembros m where m.penya_id = p_penya_id and m.user_id = v_user and m.estado = 'aprobado') then
    raise exception 'Solo el administrador de PENYERA o un miembro aprobado puede crear invitaciones.';
  end if;
  insert into public.penya_invitaciones(penya_id,creado_por) values(p_penya_id,v_user) returning token into v_token;
  return jsonb_build_object('token',v_token,'penya_id',p_penya_id,'caduca_en',now()+interval '30 days');
end;
$$;

revoke all on function public.solicitar_pertenecer_penya(uuid,uuid) from public, anon;
revoke all on function public.revisar_solicitud_penya(uuid,boolean) from public, anon;
revoke all on function public.crear_invitacion_penya(uuid) from public, anon;
grant execute on function public.solicitar_pertenecer_penya(uuid,uuid) to authenticated;
grant execute on function public.revisar_solicitud_penya(uuid,boolean) to authenticated;
grant execute on function public.crear_invitacion_penya(uuid) to authenticated;
grant select, delete on public.penya_miembros to authenticated;
revoke all on public.penya_invitaciones from anon, authenticated;

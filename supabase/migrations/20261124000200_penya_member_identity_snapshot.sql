-- Snapshot del nombre, correo y avatar del solicitante.
-- La columna email está protegida por las mismas políticas RLS que el roster.
alter table public.penya_miembros
  add column if not exists email text;

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

-- Recalcula los snapshots de las solicitudes ya existentes con los datos de Auth.
update public.penya_miembros
set user_id = user_id;

-- La función se utiliza solo desde el trigger y no se expone como RPC.
revoke all on function public.penya_member_profile_snapshot() from public, anon, authenticated;

notify pgrst, 'reload schema';

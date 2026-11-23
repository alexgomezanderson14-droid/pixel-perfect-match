alter table public.penyes
  add column if not exists miembros_actuales integer null;

alter table public.penyes
  drop constraint if exists penyes_miembros_actuales_nonnegative;

alter table public.penyes
  add constraint penyes_miembros_actuales_nonnegative
  check (miembros_actuales is null or miembros_actuales >= 0);

create table if not exists public.penya_miembros (
  id uuid primary key default gen_random_uuid(),
  penya_id uuid not null references public.penyes(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text not null default 'Usuario',
  avatar_url text,
  joined_at timestamptz not null default now()
);

create index if not exists idx_penya_miembros_penya
  on public.penya_miembros(penya_id, joined_at desc);

create or replace function public.penya_member_profile_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare profile jsonb;
begin
  select raw_user_meta_data into profile
  from auth.users
  where id = new.user_id;

  new.display_name := coalesce(
    nullif(trim(profile->>'full_name'), ''),
    nullif(trim(profile->>'name'), ''),
    nullif(trim(profile->>'display_name'), ''),
    'Usuario'
  );
  new.avatar_url := coalesce(profile->>'avatar_url', profile->>'picture');
  return new;
end;
$$;

drop trigger if exists penya_member_profile_snapshot on public.penya_miembros;
create trigger penya_member_profile_snapshot
before insert or update on public.penya_miembros
for each row execute function public.penya_member_profile_snapshot();

alter table public.penya_miembros enable row level security;

drop policy if exists "Members can view own membership and penya admins can view roster" on public.penya_miembros;
create policy "Members can view own membership and penya admins can view roster"
on public.penya_miembros for select to authenticated
using (
  user_id = auth.uid()
  or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
  or coalesce(auth.jwt()->'app_metadata'->'penya_admin_ids', '[]'::jsonb) ? penya_id::text
  or coalesce(auth.jwt()->'app_metadata'->>'penya_admin_id', '') = penya_id::text
  or (auth.jwt()->'app_metadata'->'penya_roles'->>penya_id::text) = 'admin'
);

drop policy if exists "Users can join one approved peña" on public.penya_miembros;
create policy "Users can join one approved peña"
on public.penya_miembros for insert to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.penyes p
    where p.id = penya_miembros.penya_id and p.estado = 'aprobada'
  )
);

drop policy if exists "Users can leave own peña and admins can remove members" on public.penya_miembros;
create policy "Users can leave own peña and admins can remove members"
on public.penya_miembros for delete to authenticated
using (
  user_id = auth.uid()
  or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
  or coalesce(auth.jwt()->'app_metadata'->'penya_admin_ids', '[]'::jsonb) ? penya_id::text
  or coalesce(auth.jwt()->'app_metadata'->>'penya_admin_id', '') = penya_id::text
  or (auth.jwt()->'app_metadata'->'penya_roles'->>penya_id::text) = 'admin'
);

grant select, insert, delete on public.penya_miembros to authenticated;

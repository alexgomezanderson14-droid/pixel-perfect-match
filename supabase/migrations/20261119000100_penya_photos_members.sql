-- Per-penya photo gallery. Members can add photos only to the peña
-- selected in their authenticated user metadata; profile-wide settings remain admin-only.
create table if not exists public.penya_fotos (
  id uuid primary key default gen_random_uuid(),
  penya_id uuid not null references public.penyes(id) on delete cascade,
  url text not null,
  destacada boolean not null default false,
  visible boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_penya_fotos_penya on public.penya_fotos(penya_id, created_at desc);

alter table public.penya_fotos enable row level security;

drop policy if exists "Public can read photos of approved penyes" on public.penya_fotos;
create policy "Public can read photos of approved penyes"
  on public.penya_fotos for select to anon, authenticated
  using (exists (
    select 1 from public.penyes p
    where p.id = penya_id and p.estado = 'aprobada'
  ));

drop policy if exists "Penya members can add photos" on public.penya_fotos;
create policy "Penya members can add photos"
  on public.penya_fotos for insert to authenticated
  with check (
    (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
    or coalesce(auth.jwt()->'app_metadata'->'penya_ids', '[]'::jsonb) ? penya_id::text
    or coalesce(auth.jwt()->'app_metadata'->'penya_memberships', '[]'::jsonb) ? penya_id::text
    or coalesce(auth.jwt()->'app_metadata'->'penya_admin_ids', '[]'::jsonb) ? penya_id::text
  );

drop policy if exists "Penya members can update photos" on public.penya_fotos;
create policy "Penya members can update photos"
  on public.penya_fotos for update to authenticated
  using (
    (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
    or (auth.jwt()->'user_metadata'->>'penya_id') = penya_id::text
    or coalesce(auth.jwt()->'user_metadata'->'penya_ids', '[]'::jsonb) ? penya_id::text
    or coalesce(auth.jwt()->'app_metadata'->'penya_memberships', '[]'::jsonb) ? penya_id::text
    or coalesce(auth.jwt()->'app_metadata'->'penya_admin_ids', '[]'::jsonb) ? penya_id::text
  )
  with check (
    (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
    or (auth.jwt()->'user_metadata'->>'penya_id') = penya_id::text
    or coalesce(auth.jwt()->'user_metadata'->'penya_ids', '[]'::jsonb) ? penya_id::text
    or coalesce(auth.jwt()->'app_metadata'->'penya_memberships', '[]'::jsonb) ? penya_id::text
    or coalesce(auth.jwt()->'app_metadata'->'penya_admin_ids', '[]'::jsonb) ? penya_id::text
  );

drop policy if exists "Penya members can delete photos" on public.penya_fotos;
create policy "Penya members can delete photos"
  on public.penya_fotos for delete to authenticated
  using (
    (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
    or (auth.jwt()->'user_metadata'->>'penya_id') = penya_id::text
    or coalesce(auth.jwt()->'user_metadata'->'penya_ids', '[]'::jsonb) ? penya_id::text
    or coalesce(auth.jwt()->'app_metadata'->'penya_memberships', '[]'::jsonb) ? penya_id::text
    or coalesce(auth.jwt()->'app_metadata'->'penya_admin_ids', '[]'::jsonb) ? penya_id::text
  );

grant select on public.penya_fotos to anon, authenticated;
grant insert, update, delete on public.penya_fotos to authenticated;
notify pgrst, 'reload schema';

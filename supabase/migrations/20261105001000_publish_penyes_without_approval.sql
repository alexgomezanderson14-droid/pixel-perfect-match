-- Publish peñas immediately; no manual approval workflow is required.
-- Safe to run repeatedly in the Supabase SQL Editor.

alter table public.penyes
  add column if not exists estado text not null default 'aprobada',
  add column if not exists direccion text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists foto_url text,
  add column if not exists tipo_musica text not null default 'Variada',
  add column if not exists informacion text not null default '',
  add column if not exists instagram text not null default '',
  add column if not exists tiene_evento boolean not null default false;

alter table public.penyes alter column estado set default 'aprobada';

-- Existing peñas and new registrations are visible without a review step.
drop policy if exists "Public can read approved penyes" on public.penyes;
drop policy if exists "Public can read all penyes" on public.penyes;
create policy "Public can read all penyes"
  on public.penyes for select to anon, authenticated
  using (true);

drop policy if exists "Anyone can submit a pending penya" on public.penyes;
drop policy if exists "Anyone can submit a penya" on public.penyes;
create policy "Anyone can submit a penya"
  on public.penyes for insert to anon, authenticated
  with check (true);

grant select, insert on public.penyes to anon, authenticated;

notify pgrst, 'reload schema';

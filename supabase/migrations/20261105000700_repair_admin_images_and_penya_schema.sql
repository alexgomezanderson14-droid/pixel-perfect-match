-- Repair the live Supabase schema for the current festival website.
-- Safe to run more than once. Run this in the Supabase SQL Editor.

alter table public.penyes
  add column if not exists direccion text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists foto_url text,
  add column if not exists tipo_musica text not null default 'Variada',
  add column if not exists acepta_visitas boolean not null default false,
  add column if not exists informacion text not null default '',
  add column if not exists estado text not null default 'aprobada',
  add column if not exists instagram text not null default '',
  add column if not exists email text;

alter table public.penyes
  alter column acepta_visitas type boolean
  using (case when lower(coalesce(acepta_visitas::text, 'false')) in ('true', 't', '1', 'si', 'sí', 'yes') then true else false end),
  alter column acepta_visitas set default false,
  alter column acepta_visitas set not null;

alter table public.penyes drop constraint if exists penyes_estado_check;
alter table public.penyes add constraint penyes_estado_check
  check (estado in ('pendiente', 'aprobada', 'rechazada'));

create table if not exists public.actos (
  id uuid primary key default gen_random_uuid(), dia date not null, hora text not null default '',
  titulo text not null, descripcion text not null default '', tipo text not null default 'actuacion',
  lugar text not null default '', lat double precision, lng double precision,
  publicado boolean not null default false, created_at timestamptz not null default now()
);
alter table public.actos add column if not exists lat double precision, add column if not exists lng double precision;

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  penya_id uuid references public.penyes(id) on delete set null,
  titulo text not null, descripcion text not null default '', dia date not null,
  hora text not null default '', lugar text not null default '', lat double precision, lng double precision,
  publicado boolean not null default false, created_at timestamptz not null default now()
);
alter table public.eventos add column if not exists lat double precision, add column if not exists lng double precision;

create table if not exists public.site_content (
  clave text primary key, valor text not null default '', updated_at timestamptz not null default now()
);

alter table public.penyes enable row level security;
alter table public.actos enable row level security;
alter table public.eventos enable row level security;
alter table public.site_content enable row level security;

drop policy if exists "Public can read approved penyes" on public.penyes;
create policy "Public can read approved penyes" on public.penyes for select to anon, authenticated
  using (estado = 'aprobada' or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');
drop policy if exists "Anyone can submit a pending penya" on public.penyes;
create policy "Anyone can submit a pending penya" on public.penyes for insert to anon, authenticated
  with check (estado = 'pendiente');
drop policy if exists "Admin can manage penyes" on public.penyes;
create policy "Admin can manage penyes" on public.penyes for all to authenticated
  using ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com')
  with check ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

drop policy if exists "Public can read published actos" on public.actos;
create policy "Public can read published actos" on public.actos for select to anon, authenticated
  using (publicado = true or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');
drop policy if exists "Admin can manage actos" on public.actos;
create policy "Admin can manage actos" on public.actos for all to authenticated
  using ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com')
  with check ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

drop policy if exists "Public can read published eventos" on public.eventos;
create policy "Public can read published eventos" on public.eventos for select to anon, authenticated
  using (publicado = true or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');
drop policy if exists "Admin can manage eventos" on public.eventos;
create policy "Admin can manage eventos" on public.eventos for all to authenticated
  using ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com')
  with check ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');
drop policy if exists "Public can submit pending penya events" on public.eventos;
create policy "Public can submit pending penya events" on public.eventos for insert to anon, authenticated
  with check (publicado = false and penya_id is not null and exists (
    select 1 from public.penyes p where p.id = penya_id and p.estado = 'aprobada'
  ));

drop policy if exists "Public can read site content" on public.site_content;
create policy "Public can read site content" on public.site_content for select to anon, authenticated using (true);
drop policy if exists "Admin can manage site content" on public.site_content;
create policy "Admin can manage site content" on public.site_content for all to authenticated
  using ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com')
  with check ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

grant select, insert on public.penyes to anon, authenticated;
grant update, delete on public.penyes to authenticated;
grant select, insert, update, delete on public.actos, public.eventos, public.site_content to anon, authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('penyes', 'penyes', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

drop policy if exists "Public can view festival images" on storage.objects;
create policy "Public can view festival images" on storage.objects for select to anon, authenticated
  using (bucket_id = 'penyes');
drop policy if exists "Public can upload festival images" on storage.objects;
create policy "Public can upload festival images" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'penyes' and (
    lower(name) like '%.jpg' or lower(name) like '%.jpeg' or lower(name) like '%.png' or lower(name) like '%.webp'
  ));
drop policy if exists "Admin can update festival images" on storage.objects;
create policy "Admin can update festival images" on storage.objects for update to authenticated
  using (bucket_id = 'penyes' and (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com')
  with check (bucket_id = 'penyes' and (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');
drop policy if exists "Admin can delete festival images" on storage.objects;
create policy "Admin can delete festival images" on storage.objects for delete to authenticated
  using (bucket_id = 'penyes' and (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

notify pgrst, 'reload schema';

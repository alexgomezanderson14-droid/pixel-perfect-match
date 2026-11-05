-- Ensure the public peña form fields and storage policies match the current frontend.
alter table public.penyes
  add column if not exists direccion text,
  add column if not exists acepta_visitas boolean not null default false,
  add column if not exists tipo_musica text not null default 'Variada',
  add column if not exists informacion text not null default '',
  add column if not exists estado text not null default 'aprobada',
  add column if not exists foto_url text,
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.penyes
  alter column acepta_visitas type boolean
  using (case when lower(coalesce(acepta_visitas::text, 'false')) in ('true','t','1','si','sí','yes') then true else false end),
  alter column acepta_visitas set default false,
  alter column acepta_visitas set not null;

alter table public.penyes drop constraint if exists penyes_estado_check;
alter table public.penyes add constraint penyes_estado_check check (estado in ('pendiente','aprobada','rechazada'));

drop policy if exists "Anyone can submit a pending penya" on public.penyes;
create policy "Anyone can submit a pending penya" on public.penyes for insert to anon, authenticated with check (estado = 'pendiente');
grant select, insert on public.penyes to anon, authenticated;
grant update, delete on public.penyes to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('penyes', 'penyes', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view festival images" on storage.objects;
create policy "Public can view festival images" on storage.objects for select to anon, authenticated using (bucket_id = 'penyes');
drop policy if exists "Public can upload festival images" on storage.objects;
create policy "Public can upload festival images" on storage.objects for insert to anon, authenticated
with check (bucket_id = 'penyes' and (lower(name) like '%.jpg' or lower(name) like '%.jpeg' or lower(name) like '%.png' or lower(name) like '%.webp'));

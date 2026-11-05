-- Public contact details for peñas, safe event submissions and image storage.
alter table public.penyes
  add column if not exists instagram text not null default '',
  add column if not exists email text;

alter table public.eventos
  add column if not exists lat double precision,
  add column if not exists lng double precision;

-- Peñas may suggest events from their public card. Suggestions stay hidden until an admin approves them.
drop policy if exists "Public can submit pending penya events" on public.eventos;
create policy "Public can submit pending penya events"
  on public.eventos for insert to anon, authenticated
  with check (
    publicado = false
    and penya_id is not null
    and exists (
      select 1 from public.penyes p
      where p.id = penya_id and p.estado = 'aprobada'
    )
  );

-- The app stores both peña photos and the editable homepage cover in this bucket.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('penyes', 'penyes', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "Public can view festival images" on storage.objects;
create policy "Public can view festival images"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'penyes');

drop policy if exists "Public can upload festival images" on storage.objects;
create policy "Public can upload festival images"
  on storage.objects for insert to anon, authenticated
  with check (
    bucket_id = 'penyes'
    and (
      lower(name) like '%.jpg'
      or lower(name) like '%.jpeg'
      or lower(name) like '%.png'
      or lower(name) like '%.webp'
    )
  );

drop policy if exists "Admin can update festival images" on storage.objects;
create policy "Admin can update festival images"
  on storage.objects for update to authenticated
  using (bucket_id = 'penyes' and (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com')
  with check (bucket_id = 'penyes' and (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

drop policy if exists "Admin can delete festival images" on storage.objects;
create policy "Admin can delete festival images"
  on storage.objects for delete to authenticated
  using (bucket_id = 'penyes' and (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

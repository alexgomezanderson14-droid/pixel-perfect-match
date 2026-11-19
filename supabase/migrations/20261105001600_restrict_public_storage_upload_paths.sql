-- Restrict direct Supabase Storage uploads to the same public/admin folders
-- enforced by the Cloudflare Worker. The previous public policy allowed anyone
-- to upload into admin-only paths such as penyes/perfiles and penyes/tarjetas.

drop policy if exists "Public can upload festival images" on storage.objects;
drop policy if exists "Public can upload peña and event submissions" on storage.objects;
create policy "Public can upload peña and event submissions"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'penyes'
    and (
      name ~ '^penyes/[^/]+\.(jpg|jpeg|png|webp)$'
      or name ~ '^eventos/[^/]+\.(jpg|jpeg|png|webp)$'
    )
  );

drop policy if exists "Admin can upload festival images" on storage.objects;
create policy "Admin can upload festival images"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'penyes'
    and (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
    and (
      name ~ '^actuaciones/[^/]+\.(jpg|jpeg|png|webp)$'
      or name ~ '^noticias/[^/]+\.(jpg|jpeg|png|webp)$'
      or name ~ '^site/[^/]+\.(jpg|jpeg|png|webp)$'
      or name ~ '^penyes/(perfiles|tarjetas)/[a-zA-Z0-9_-]{1,100}/[^/]+\.(jpg|jpeg|png|webp)$'
    )
  );

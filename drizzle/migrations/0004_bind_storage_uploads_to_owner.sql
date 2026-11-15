DROP POLICY IF EXISTS "Admin can upload festival images" ON storage.objects;
CREATE POLICY "Admin can upload festival images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'penyes' AND (auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com'
  AND owner_id = (select auth.uid()::text)
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','webp']));
DROP POLICY IF EXISTS "Public can upload penya and event photos" ON storage.objects;
CREATE POLICY "Public can upload penya and event photos" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'penyes'
  AND owner_id IS NOT DISTINCT FROM (select auth.uid()::text)
  AND name ~ '^(penyes|eventos)/[0-9a-f-]{36}\.(jpg|png|webp)$');
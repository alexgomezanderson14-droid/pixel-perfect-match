DROP POLICY IF EXISTS "Fotos penyes lectura" ON storage.objects;
DROP POLICY IF EXISTS "Public can view festival images" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload penya and event photos" ON storage.objects;
CREATE POLICY "Admin can list festival images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'penyes' AND (auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com' AND owner_id = (select auth.uid()::text));
DROP POLICY IF EXISTS "Public can read site content" ON public.site_content;
CREATE POLICY "Public can read public site content" ON public.site_content FOR SELECT TO anon, authenticated
USING (clave NOT LIKE 'private\_%' OR (auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com');
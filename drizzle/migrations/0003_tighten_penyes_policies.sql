DROP POLICY IF EXISTS "Alta pública" ON public.penyes;
DROP POLICY IF EXISTS "Lectura pública" ON public.penyes;
CREATE POLICY "Public can submit pending penyes" ON public.penyes FOR INSERT TO anon, authenticated
WITH CHECK (estado = 'pendiente' AND tiene_evento = false AND char_length(nombre) BETWEEN 2 AND 80
  AND (foto_url IS NULL OR foto_url ~ '^penyes/[0-9a-f-]{36}\.(jpg|png|webp)$'));
CREATE POLICY "Public can read approved penyes" ON public.penyes FOR SELECT TO anon, authenticated
USING (estado = 'aprobada' OR (auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com');

DROP POLICY IF EXISTS "Fotos penyes subida" ON storage.objects;
DROP POLICY IF EXISTS "Public can upload festival images" ON storage.objects;
CREATE POLICY "Public can upload penya and event photos" ON storage.objects FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'penyes' AND name ~ '^(penyes|eventos)/[0-9a-f-]{36}\.(jpg|png|webp)$');
CREATE POLICY "Admin can upload festival images" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'penyes' AND (auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com'
  AND lower(storage.extension(name)) = ANY (ARRAY['jpg','jpeg','png','webp']));
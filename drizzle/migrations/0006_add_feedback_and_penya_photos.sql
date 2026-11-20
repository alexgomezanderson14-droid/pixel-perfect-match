CREATE TABLE public.site_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL DEFAULT 'sugerencia' CHECK (tipo IN ('error','sugerencia')),
  titulo text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  descripcion text NOT NULL DEFAULT '' CHECK (char_length(descripcion) <= 5000),
  email text CHECK (email IS NULL OR char_length(email) <= 255),
  pagina text CHECK (pagina IS NULL OR char_length(pagina) <= 1000),
  estado text NOT NULL DEFAULT 'pendiente',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT INSERT ON public.site_feedback TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_feedback TO authenticated;
GRANT ALL ON public.site_feedback TO service_role;
ALTER TABLE public.site_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can send pending feedback" ON public.site_feedback FOR INSERT TO anon, authenticated WITH CHECK (estado = 'pendiente');
CREATE POLICY "Admin manages feedback" ON public.site_feedback FOR ALL TO authenticated USING ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com') WITH CHECK ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

CREATE TABLE public.penya_fotos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  penya_id uuid NOT NULL,
  url text NOT NULL,
  descripcion text NOT NULL DEFAULT '',
  destacada boolean NOT NULL DEFAULT false,
  visible boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.penya_fotos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.penya_fotos TO authenticated;
GRANT ALL ON public.penya_fotos TO service_role;
ALTER TABLE public.penya_fotos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visible photos are public" ON public.penya_fotos FOR SELECT TO anon, authenticated USING (visible = true);
CREATE POLICY "Admin manages photos" ON public.penya_fotos FOR ALL TO authenticated USING ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com') WITH CHECK ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

ALTER TABLE public.actos ADD COLUMN IF NOT EXISTS penya_id uuid;
CREATE TABLE public.penyes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL CHECK (char_length(nombre) BETWEEN 2 AND 80),
  direccion text CHECK (direccion IS NULL OR char_length(direccion) <= 200),
  lat double precision NOT NULL CHECK (lat BETWEEN 38.4 AND 38.8),
  lng double precision NOT NULL CHECK (lng BETWEEN -0.3 AND 0.1),
  foto_url text NOT NULL CHECK (char_length(foto_url) <= 500),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.penyes TO anon, authenticated;
GRANT ALL ON public.penyes TO service_role;
ALTER TABLE public.penyes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Lectura pública" ON public.penyes FOR SELECT USING (true);
CREATE POLICY "Alta pública" ON public.penyes FOR INSERT WITH CHECK (true);
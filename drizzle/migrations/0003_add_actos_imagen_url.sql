alter table public.actos add column if not exists imagen_url text;
notify pgrst, 'reload schema';

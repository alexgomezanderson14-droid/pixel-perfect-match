-- Repair every column used by the public peña registration form.
-- Safe to run repeatedly in Supabase SQL Editor.

alter table public.penyes
  add column if not exists direccion text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists foto_url text,
  add column if not exists tipo_musica text not null default 'Variada',
  add column if not exists informacion text not null default '',
  add column if not exists instagram text not null default '',
  add column if not exists tiene_evento boolean not null default false,
  add column if not exists estado text not null default 'aprobada';

alter table public.penyes alter column tipo_musica set default 'Variada';
alter table public.penyes alter column informacion set default '';
alter table public.penyes alter column instagram set default '';
alter table public.penyes alter column tiene_evento set default false;
alter table public.penyes alter column estado set default 'aprobada';

-- Force PostgREST to refresh its cached table definition.
notify pgrst, 'reload schema';

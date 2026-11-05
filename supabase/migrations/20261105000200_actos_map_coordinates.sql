-- Add optional map coordinates to programme items.
alter table public.actos
  add column if not exists lat double precision,
  add column if not exists lng double precision;

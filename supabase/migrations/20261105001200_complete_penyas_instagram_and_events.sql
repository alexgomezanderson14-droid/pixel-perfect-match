-- One-step repair for public peña registration, Instagram and peña-submitted events.
-- Run this file once in Supabase SQL Editor. It is safe to run repeatedly.

alter table public.penyes
  add column if not exists direccion text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists foto_url text,
  add column if not exists tipo_musica text not null default 'Variada',
  add column if not exists instagram text not null default '',
  add column if not exists tiene_evento boolean not null default false,
  add column if not exists estado text not null default 'aprobada';

alter table public.penyes
  alter column tipo_musica set default 'Variada',
  alter column instagram set default '',
  alter column tiene_evento set default false,
  alter column estado set default 'aprobada';

create table if not exists public.eventos (
  id uuid primary key default gen_random_uuid(),
  penya_id uuid references public.penyes(id) on delete set null,
  titulo text not null,
  descripcion text not null default '',
  dia date not null,
  hora text not null default '',
  lugar text not null default '',
  imagen_url text,
  lat double precision,
  lng double precision,
  publicado boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.eventos
  add column if not exists penya_id uuid references public.penyes(id) on delete set null,
  add column if not exists titulo text not null default '',
  add column if not exists descripcion text not null default '',
  add column if not exists dia date,
  add column if not exists hora text not null default '',
  add column if not exists lugar text not null default '',
  add column if not exists imagen_url text,
  add column if not exists lat double precision,
  add column if not exists lng double precision,
  add column if not exists publicado boolean not null default false;

alter table public.penyes enable row level security;
alter table public.eventos enable row level security;

-- New peñas are immediately visible; Instagram is optional but saved when supplied.
drop policy if exists "Anyone can submit a pending penya" on public.penyes;
drop policy if exists "Public can submit a penya" on public.penyes;
create policy "Public can submit a penya"
  on public.penyes for insert to anon, authenticated
  with check (true);

drop policy if exists "Public can read approved penyes" on public.penyes;
create policy "Public can read approved penyes"
  on public.penyes for select to anon, authenticated
  using (estado = 'aprobada' or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

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

drop policy if exists "Public can read published eventos" on public.eventos;
create policy "Public can read published eventos"
  on public.eventos for select to anon, authenticated
  using (publicado = true or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

drop policy if exists "Admin can manage eventos" on public.eventos;
create policy "Admin can manage eventos"
  on public.eventos for all to authenticated
  using ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com')
  with check ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');

grant select, insert on public.penyes to anon, authenticated;
grant update (tiene_evento) on public.penyes to anon, authenticated;
grant select, insert, update, delete on public.eventos to anon, authenticated;

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

notify pgrst, 'reload schema';

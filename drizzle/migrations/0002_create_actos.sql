create table if not exists public.actos (
  id uuid primary key default gen_random_uuid(), dia date not null, hora text not null default '',
  titulo text not null, descripcion text not null default '', tipo text not null default 'actuacion',
  lugar text not null default '', lat double precision, lng double precision,
  publicado boolean not null default false, created_at timestamptz not null default now()
);
grant select on public.actos to anon;
grant select, insert, update, delete on public.actos to authenticated;
grant all on public.actos to service_role;
alter table public.actos enable row level security;
drop policy if exists "Public can read published actos" on public.actos;
create policy "Public can read published actos" on public.actos for select to anon, authenticated
  using (publicado = true or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');
drop policy if exists "Admin can manage actos" on public.actos;
create policy "Admin can manage actos" on public.actos for all to authenticated
  using ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com')
  with check ((auth.jwt()->>'email') = 'gomezandersonalex@gmail.com');
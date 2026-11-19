-- Sugerencias e informes de errores: escritura pública limitada y lectura/gestión solo de administración.
drop function if exists public.submit_site_feedback(text,text,text,text,text);
create table if not exists public.site_feedback (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('sugerencia','error')),
  titulo text not null check (char_length(btrim(titulo)) between 3 and 100),
  descripcion text not null check (char_length(btrim(descripcion)) between 10 and 2000),
  email text null check (email is null or char_length(email) <= 254),
  pagina text null check (pagina is null or char_length(pagina) <= 500),
  estado text not null default 'pendiente' check (estado in ('pendiente','revisada','respondida')),
  respuesta text null check (respuesta is null or char_length(respuesta) <= 2000),
  created_at timestamptz not null default now(),
  responded_at timestamptz null
);
alter table public.site_feedback enable row level security;
grant insert on public.site_feedback to anon, authenticated;
grant select, update, delete on public.site_feedback to authenticated;
drop policy if exists "Public can submit feedback" on public.site_feedback;
create policy "Public can submit feedback" on public.site_feedback
for insert to anon, authenticated
with check (estado = 'pendiente' and respuesta is null and responded_at is null);
drop policy if exists "Only site admin can read feedback" on public.site_feedback;
create policy "Only site admin can read feedback" on public.site_feedback
for select to authenticated
using ((select auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com');
drop policy if exists "Only site admin can update feedback" on public.site_feedback;
create policy "Only site admin can update feedback" on public.site_feedback
for update to authenticated
using ((select auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com')
with check ((select auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com');
drop policy if exists "Only site admin can delete feedback" on public.site_feedback;
create policy "Only site admin can delete feedback" on public.site_feedback
for delete to authenticated
using ((select auth.jwt() ->> 'email') = 'gomezandersonalex@gmail.com');

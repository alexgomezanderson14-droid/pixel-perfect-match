-- Restore safe public registration and visibility rules for peñas.
-- This migration is intentionally idempotent and repairs databases where
-- 20261105001000_publish_penyes_without_approval.sql was already applied.

alter table public.penyes
  add column if not exists estado text not null default 'aprobada';

-- Public visitors may only see approved peñas. The main administrator can
-- still see pending/rejected submissions to moderate them in /admin.
drop policy if exists "Public can read all penyes" on public.penyes;
drop policy if exists "Public can read approved penyes" on public.penyes;
create policy "Public can read approved penyes"
  on public.penyes
  for select
  to anon, authenticated
  using (
    estado = 'aprobada'
    or (auth.jwt()->>'email') = 'gomezandersonalex@gmail.com'
  );

-- A public form can create a pending submission only. It cannot self-approve
-- or create a published record by bypassing the frontend.
drop policy if exists "Anyone can submit pending penya" on public.penyes;
drop policy if exists "Anyone can submit a pending penya" on public.penyes;
drop policy if exists "Anyone can submit a penya" on public.penyes;
create policy "Anyone can submit a pending penya"
  on public.penyes
  for insert
  to anon, authenticated
  with check (
    estado = 'pendiente'
    and char_length(trim(nombre)) between 2 and 80
  );

-- Both anonymous visitors and signed-in users can update only the convenience
-- event flag on an already approved peña. All other columns remain protected.
drop policy if exists "Public can update penya event flag" on public.penyes;
create policy "Public can update penya event flag"
  on public.penyes
  for update
  to anon, authenticated
  using (estado = 'aprobada')
  with check (estado = 'aprobada');

grant select, insert on public.penyes to anon, authenticated;
grant update (tiene_evento) on public.penyes to anon, authenticated;
notify pgrst, 'reload schema';

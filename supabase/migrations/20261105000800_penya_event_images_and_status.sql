-- Remove the obsolete accepts-visits field and support a public yes/no event status per peña.
-- Event suggestions include an image and remain unpublished until admin approval.
alter table public.penyes
  add column if not exists tiene_evento boolean not null default false,
  drop column if exists acepta_visitas;

alter table public.eventos
  add column if not exists imagen_url text;

-- A public peña card may update only the event-status flag. Column-level privilege
-- prevents anonymous visitors from changing the peña's name, location or approval state.
drop policy if exists "Public can update penya event flag" on public.penyes;
create policy "Public can update penya event flag"
  on public.penyes for update to anon
  using (estado = 'aprobada')
  with check (estado = 'aprobada');

grant update (tiene_evento) on public.penyes to anon;

-- Reuse the public penyes bucket for event artwork.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('penyes', 'penyes', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = true,
    file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg','image/png','image/webp'];

notify pgrst, 'reload schema';

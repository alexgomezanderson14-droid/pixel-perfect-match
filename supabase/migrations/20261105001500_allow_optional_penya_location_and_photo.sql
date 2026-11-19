-- Public peña registration allows optional photos and coordinates.
-- Earlier base schema versions marked these columns NOT NULL even though the
-- current registration form intentionally allows them to be omitted.

alter table public.penyes
  alter column lat drop not null,
  alter column lng drop not null,
  alter column foto_url drop not null;

notify pgrst, 'reload schema';

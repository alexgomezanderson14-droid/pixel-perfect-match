-- Enforce the per-penya principal/secondary administrator hierarchy.
-- Keep the oldest active principal if historical data contains duplicates;
-- downgrade the remaining principal rows to secondary administrators.
UPDATE penya_miembros AS current_member
SET rol = 'admin'
WHERE current_member.rol = 'admin_principal'
  AND current_member.estado = 'activo'
  AND EXISTS (
    SELECT 1
    FROM penya_miembros AS earlier_member
    WHERE earlier_member.penya_id = current_member.penya_id
      AND earlier_member.rol = 'admin_principal'
      AND earlier_member.estado = 'activo'
      AND (
        earlier_member.created_at < current_member.created_at
        OR (
          earlier_member.created_at = current_member.created_at
          AND earlier_member.usuario_id < current_member.usuario_id
        )
      )
  );

CREATE UNIQUE INDEX IF NOT EXISTS uq_penya_admin_principal_activo
  ON penya_miembros(penya_id)
  WHERE rol = 'admin_principal' AND estado = 'activo';

CREATE TRIGGER IF NOT EXISTS trg_penya_invite_principal_guard_insert
BEFORE INSERT ON penya_invitaciones
WHEN NEW.rol = 'admin_principal' AND NEW.aceptada_en IS NULL AND NEW.revocada_en IS NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM penya_miembros
    WHERE penya_id = NEW.penya_id AND rol = 'admin_principal' AND estado = 'activo'
  ) THEN RAISE(ABORT, 'La peña ya tiene un administrador principal activo') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM penya_invitaciones
    WHERE penya_id = NEW.penya_id AND rol = 'admin_principal'
      AND aceptada_en IS NULL AND revocada_en IS NULL AND expira_en > CURRENT_TIMESTAMP
  ) THEN RAISE(ABORT, 'Ya existe una invitación pendiente para administrador principal') END;
END;

CREATE TRIGGER IF NOT EXISTS trg_penya_invite_principal_guard_update
BEFORE UPDATE OF penya_id, rol, aceptada_en, revocada_en, expira_en ON penya_invitaciones
WHEN NEW.rol = 'admin_principal' AND NEW.aceptada_en IS NULL AND NEW.revocada_en IS NULL
BEGIN
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM penya_miembros
    WHERE penya_id = NEW.penya_id AND rol = 'admin_principal' AND estado = 'activo'
  ) THEN RAISE(ABORT, 'La peña ya tiene un administrador principal activo') END;
  SELECT CASE WHEN EXISTS (
    SELECT 1 FROM penya_invitaciones
    WHERE penya_id = NEW.penya_id AND id <> NEW.id AND rol = 'admin_principal'
      AND aceptada_en IS NULL AND revocada_en IS NULL AND expira_en > CURRENT_TIMESTAMP
  ) THEN RAISE(ABORT, 'Ya existe una invitación pendiente para administrador principal') END;
END;

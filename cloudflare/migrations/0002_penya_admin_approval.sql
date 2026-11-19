-- Identity and approval workflow for per-penya administrators.
-- Passwords are managed by the external authentication provider; never store plaintext passwords in D1.
ALTER TABLE usuarios ADD COLUMN nombre TEXT NOT NULL DEFAULT '';
ALTER TABLE usuarios ADD COLUMN apellidos TEXT NOT NULL DEFAULT '';
ALTER TABLE usuarios ADD COLUMN auth_subject TEXT UNIQUE;
ALTER TABLE usuarios ADD COLUMN solicitud_estado TEXT NOT NULL DEFAULT 'aprobada'
  CHECK (solicitud_estado IN ('pendiente','aprobada','rechazada'));

CREATE TABLE IF NOT EXISTS penya_solicitudes_admin (
  id TEXT PRIMARY KEY,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  penya_id TEXT NOT NULL REFERENCES penyes(id) ON DELETE CASCADE,
  nombre_declarado TEXT NOT NULL,
  apellidos_declarados TEXT NOT NULL,
  email TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente','aprobada','rechazada','revocada')),
  revisado_por TEXT REFERENCES usuarios(id),
  revisado_en TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(usuario_id, penya_id)
);
CREATE INDEX IF NOT EXISTS idx_penya_solicitudes_estado
  ON penya_solicitudes_admin(estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_penya_solicitudes_penya
  ON penya_solicitudes_admin(penya_id, estado);

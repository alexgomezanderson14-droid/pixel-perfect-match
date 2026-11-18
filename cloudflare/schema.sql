-- Proposed Cloudflare D1 schema for festalfàs.
-- This is a migration target, NOT deployed. Export and verify the old database before applying it.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS penyes (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  direccion TEXT,
  lat REAL,
  lng REAL,
  foto_url TEXT,
  tipo_musica TEXT NOT NULL DEFAULT 'Variada',
  informacion TEXT NOT NULL DEFAULT '',
  instagram TEXT,
  email TEXT,
  tiene_evento INTEGER NOT NULL DEFAULT 0 CHECK (tiene_evento IN (0,1)),
  estado TEXT NOT NULL DEFAULT 'aprobada' CHECK (estado IN ('pendiente','aprobada','rechazada')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS actos (
  id TEXT PRIMARY KEY,
  dia TEXT NOT NULL,
  hora TEXT NOT NULL DEFAULT '',
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'actuacion' CHECK (tipo IN ('actuacion','evento')),
  lugar TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  imagen_url TEXT,
  publicado INTEGER NOT NULL DEFAULT 0 CHECK (publicado IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_actos_publicado_dia ON actos(publicado, dia, hora);

CREATE TABLE IF NOT EXISTS eventos (
  id TEXT PRIMARY KEY,
  penya_id TEXT REFERENCES penyes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL DEFAULT '',
  dia TEXT NOT NULL,
  hora TEXT NOT NULL DEFAULT '',
  lugar TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  imagen_url TEXT,
  publicado INTEGER NOT NULL DEFAULT 0 CHECK (publicado IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_eventos_publicado_dia ON eventos(publicado, dia, hora);
CREATE INDEX IF NOT EXISTS idx_eventos_penya ON eventos(penya_id);

-- Existing site_content key/value data (avisos_json, mapa_puntos_json, theme and homepage settings)
-- is retained during the first migration for compatibility, then can be normalized gradually.
CREATE TABLE IF NOT EXISTS site_content (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- News currently stored in site_content.noticias_json can be migrated row-by-row into this table.
CREATE TABLE IF NOT EXISTS noticias (
  id TEXT PRIMARY KEY,
  titulo TEXT NOT NULL,
  resumen TEXT NOT NULL DEFAULT '',
  contenido TEXT NOT NULL DEFAULT '',
  tipo TEXT NOT NULL DEFAULT 'oficial',
  autor TEXT NOT NULL DEFAULT '',
  fecha TEXT NOT NULL,
  imagen_url TEXT,
  publicado INTEGER NOT NULL DEFAULT 1 CHECK (publicado IN (0,1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_noticias_publicadas_fecha ON noticias(publicado, fecha DESC);

-- A stable anonymous visitor key must be issued/signed by the Worker; never trust arbitrary client IDs.
CREATE TABLE IF NOT EXISTS noticia_likes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  noticia_id TEXT NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
  visitor_key_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(noticia_id, visitor_key_hash)
);
CREATE INDEX IF NOT EXISTS idx_noticia_likes_noticia ON noticia_likes(noticia_id);

CREATE TABLE IF NOT EXISTS noticia_comentarios (
  id TEXT PRIMARY KEY,
  noticia_id TEXT NOT NULL REFERENCES noticias(id) ON DELETE CASCADE,
  parent_id TEXT REFERENCES noticia_comentarios(id) ON DELETE CASCADE,
  nombre_publico TEXT NOT NULL,
  contenido TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','publicado','rechazado')),
  visitor_key_hash TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_noticia_comentarios_publicos ON noticia_comentarios(noticia_id, estado, created_at);

-- Future peñistas area: role boundaries are per peña, not global client-side flags.
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  nombre_publico TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo','bloqueado')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS penya_miembros (
  penya_id TEXT NOT NULL REFERENCES penyes(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'miembro' CHECK (rol IN ('miembro','responsable','admin','admin_principal')),
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','activo','rechazado')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (penya_id, usuario_id)
);
CREATE INDEX IF NOT EXISTS idx_penya_miembros_usuario ON penya_miembros(usuario_id);

CREATE TABLE IF NOT EXISTS avisos_internos (
  id TEXT PRIMARY KEY,
  penya_id TEXT NOT NULL REFERENCES penyes(id) ON DELETE CASCADE,
  autor_id TEXT NOT NULL REFERENCES usuarios(id),
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- Invitations for peña administrators. Tokens are stored only as hashes.
-- The Worker must validate the token, expiry, invitation email and caller identity
-- before creating/updating a penya_miembros row.
CREATE TABLE IF NOT EXISTS penya_invitaciones (
  id TEXT PRIMARY KEY,
  penya_id TEXT NOT NULL REFERENCES penyes(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin','admin_principal')),
  token_hash TEXT NOT NULL UNIQUE,
  invitado_por TEXT NOT NULL REFERENCES usuarios(id),
  expira_en TEXT NOT NULL,
  aceptada_en TEXT,
  revocada_en TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_penya_invitaciones_penya ON penya_invitaciones(penya_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_penya_invitaciones_email ON penya_invitaciones(email, expira_en);

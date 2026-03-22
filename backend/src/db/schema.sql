-- ==========================================
-- RIDERS SOCIAL CLUB — Schema PostgreSQL
-- ==========================================

CREATE TABLE IF NOT EXISTS users (
  id           SERIAL PRIMARY KEY,
  email        VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  username     VARCHAR(50) UNIQUE NOT NULL,
  bio          TEXT,
  avatar_url   VARCHAR(500),
  whatsapp     VARCHAR(30),
  telegram     VARCHAR(100),
  created_at   TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS motos (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  apodo      VARCHAR(100),
  modelo     VARCHAR(100),
  foto_url   VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS clubs (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(150) NOT NULL,
  slogan      VARCHAR(255),
  bandera_url VARCHAR(500),
  escudo_url  VARCHAR(500),
  provincia   VARCHAR(100),
  tipo        VARCHAR(10) DEFAULT 'publico' CHECK (tipo IN ('publico', 'privado')),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS club_members (
  id         SERIAL PRIMARY KEY,
  club_id    INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  rol        VARCHAR(20) DEFAULT 'miembro' CHECK (rol IN ('fundador', 'organizador', 'colaborador', 'miembro')),
  estado     VARCHAR(10) DEFAULT 'activo' CHECK (estado IN ('activo', 'pendiente')),
  joined_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE(club_id, user_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE CASCADE,
  club_id     INTEGER REFERENCES clubs(id) ON DELETE SET NULL,
  tipo        VARCHAR(10) DEFAULT 'general' CHECK (tipo IN ('general', 'club')),
  contenido   TEXT,
  imagen_url  VARCHAR(500),
  video_url   VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id               SERIAL PRIMARY KEY,
  club_id          INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  titulo           VARCHAR(200) NOT NULL,
  descripcion      TEXT,
  fecha_salida     TIMESTAMP NOT NULL,
  punto_encuentro  VARCHAR(255),
  destino          VARCHAR(255),
  paradas          TEXT,
  ruta_url         VARCHAR(500),
  estado           VARCHAR(10) DEFAULT 'abierto' CHECK (estado IN ('abierto', 'cerrado')),
  created_at       TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS routes (
  id          SERIAL PRIMARY KEY,
  club_id     INTEGER REFERENCES clubs(id) ON DELETE CASCADE,
  nombre      VARCHAR(200),
  descripcion TEXT,
  maps_url    VARCHAR(500),
  created_at  TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS likes (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS comments (
  id         SERIAL PRIMARY KEY,
  post_id    INTEGER REFERENCES posts(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  contenido  TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Migraciones aditivas (seguras de correr varias veces)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routes' AND column_name='user_id') THEN
    ALTER TABLE routes ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='ruta_id') THEN
    ALTER TABLE events ADD COLUMN ruta_id INTEGER REFERENCES routes(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='user_id') THEN
    ALTER TABLE events ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='motos' AND column_name='marca') THEN
    ALTER TABLE motos ADD COLUMN marca VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='pais') THEN
    ALTER TABLE clubs ADD COLUMN pais VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='portada_url') THEN
    ALTER TABLE clubs ADD COLUMN portada_url VARCHAR(500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='pais') THEN
    ALTER TABLE users ADD COLUMN pais VARCHAR(100);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='whatsapp_visibility') THEN
    ALTER TABLE users ADD COLUMN whatsapp_visibility VARCHAR(10) DEFAULT 'publico';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='telegram_visibility') THEN
    ALTER TABLE users ADD COLUMN telegram_visibility VARCHAR(10) DEFAULT 'publico';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='config_rutas') THEN
    ALTER TABLE clubs ADD COLUMN config_rutas VARCHAR(15) DEFAULT 'cualquiera';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='config_salidas') THEN
    ALTER TABLE clubs ADD COLUMN config_salidas VARCHAR(15) DEFAULT 'cualquiera';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='config_ingreso') THEN
    ALTER TABLE clubs ADD COLUMN config_ingreso VARCHAR(15) DEFAULT 'fundador';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clubs' AND column_name='config_roles') THEN
    ALTER TABLE clubs ADD COLUMN config_roles VARCHAR(15) DEFAULT 'fundador';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='es_publico') THEN
    ALTER TABLE events ADD COLUMN es_publico BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='events' AND column_name='post_id') THEN
    ALTER TABLE events ADD COLUMN post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='routes' AND column_name='post_id') THEN
    ALTER TABLE routes ADD COLUMN post_id INTEGER REFERENCES posts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS password_reset_tokens (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  token      VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS event_participants (
  id         SERIAL PRIMARY KEY,
  event_id   INTEGER REFERENCES events(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(event_id, user_id)
);

-- Normalizar es_publico: null → false
UPDATE events SET es_publico = false WHERE es_publico IS NULL;

-- Backfill: crear posts para eventos y rutas que no tienen post_id
DO $$
DECLARE
  ev RECORD;
  rt RECORD;
  new_post_id INTEGER;
  effective_user INTEGER;
BEGIN
  FOR ev IN
    SELECT e.id, e.club_id, e.titulo,
      COALESCE(e.user_id,
        (SELECT cm.user_id FROM club_members cm WHERE cm.club_id = e.club_id AND cm.rol = 'fundador' AND cm.estado = 'activo' LIMIT 1),
        (SELECT cm.user_id FROM club_members cm WHERE cm.club_id = e.club_id AND cm.estado = 'activo' LIMIT 1)
      ) as uid
    FROM events e WHERE e.post_id IS NULL
  LOOP
    IF ev.uid IS NOT NULL THEN
      INSERT INTO posts (user_id, club_id, tipo, contenido)
      VALUES (ev.uid, ev.club_id, 'club', '📅 ' || ev.titulo)
      RETURNING id INTO new_post_id;
      UPDATE events SET post_id = new_post_id WHERE id = ev.id;
    END IF;
  END LOOP;

  FOR rt IN
    SELECT r.id, r.club_id, r.nombre,
      COALESCE(r.user_id,
        (SELECT cm.user_id FROM club_members cm WHERE cm.club_id = r.club_id AND cm.rol = 'fundador' AND cm.estado = 'activo' LIMIT 1),
        (SELECT cm.user_id FROM club_members cm WHERE cm.club_id = r.club_id AND cm.estado = 'activo' LIMIT 1)
      ) as uid
    FROM routes r WHERE r.post_id IS NULL
  LOOP
    IF rt.uid IS NOT NULL THEN
      INSERT INTO posts (user_id, club_id, tipo, contenido)
      VALUES (rt.uid, rt.club_id, 'club', '🗺️ ' || rt.nombre)
      RETURNING id INTO new_post_id;
      UPDATE routes SET post_id = new_post_id WHERE id = rt.id;
    END IF;
  END LOOP;
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_club_id ON posts(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_events_club_id ON events(club_id);

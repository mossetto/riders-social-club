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
END $$;

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_club_id ON posts(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_club_id ON club_members(club_id);
CREATE INDEX IF NOT EXISTS idx_club_members_user_id ON club_members(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_events_club_id ON events(club_id);

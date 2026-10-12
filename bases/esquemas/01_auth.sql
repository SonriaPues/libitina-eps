-- =====================================================================
-- LIBITINA E.P.S. — AUTENTICACIÓN (puerto 8001) · Base: libitina_auth
-- Servidor: general · 3 tablas
-- AJUSTE: perfiles_doctor pasó a Red de Prestadores.
-- =====================================================================
CREATE TYPE tipo_documento AS ENUM ('CC', 'TI', 'RC', 'CE', 'PPT', 'PA');
CREATE TYPE rol_usuario    AS ENUM ('afiliado', 'doctor', 'admin');
CREATE TYPE tipo_token     AS ENUM ('verificacion_email', 'recuperacion_contrasena');

CREATE OR REPLACE FUNCTION fn_set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE usuarios (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo_documento     tipo_documento NOT NULL DEFAULT 'CC',
  numero_documento   VARCHAR(20)    NOT NULL,
  nombres            VARCHAR(80)    NOT NULL,
  apellidos          VARCHAR(80)    NOT NULL,
  email              VARCHAR(150)   NOT NULL,
  password_hash      VARCHAR(255)   NOT NULL,          -- bcrypt
  rol                rol_usuario    NOT NULL DEFAULT 'afiliado',
  activo             BOOLEAN        NOT NULL DEFAULT true,
  email_verificado   BOOLEAN        NOT NULL DEFAULT false,
  intentos_fallidos  SMALLINT       NOT NULL DEFAULT 0,
  bloqueado_hasta    TIMESTAMPTZ,                      -- bloqueo tras 5 intentos fallidos
  ultimo_acceso      TIMESTAMPTZ,
  creado_en          TIMESTAMPTZ    NOT NULL DEFAULT now(),
  actualizado_en     TIMESTAMPTZ    NOT NULL DEFAULT now(),
  CONSTRAINT uq_usuarios_documento UNIQUE (tipo_documento, numero_documento)
);
CREATE UNIQUE INDEX uq_usuarios_email ON usuarios (lower(email));
CREATE INDEX ix_usuarios_rol ON usuarios (rol) WHERE activo;
CREATE TRIGGER trg_usuarios_actualizado BEFORE UPDATE ON usuarios
  FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

-- Se guarda el HASH del token, nunca el token en texto plano.
CREATE TABLE refresh_tokens (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  VARCHAR(128) NOT NULL UNIQUE,   -- SHA-256
  user_agent  VARCHAR(255),
  ip_origen   VARCHAR(45),
  expira_en   TIMESTAMPTZ NOT NULL,
  revocado    BOOLEAN     NOT NULL DEFAULT false,
  creado_en   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_refresh_tokens_usuario ON refresh_tokens (usuario_id) WHERE NOT revocado;

CREATE TABLE tokens_verificacion (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id  UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  token_hash  VARCHAR(128) NOT NULL UNIQUE,
  tipo        tipo_token   NOT NULL,
  usado       BOOLEAN      NOT NULL DEFAULT false,
  expira_en   TIMESTAMPTZ  NOT NULL,
  creado_en   TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- =====================================================================
-- LIBITINA E.P.S. — RED DE PRESTADORES (puerto 8007) · Base: libitina_prestadores
-- Servidor: general · 4 tablas
-- NUEVA BASE: reúne el catálogo de la red, antes repartido en tres servicios:
--   ips              ← venía de Afiliados
--   perfiles_doctor  ← venía de Autenticación
--   puntos_atencion  ← venía de Citas
--   recursos_medicos ← venía de Citas
-- =====================================================================
CREATE TYPE nivel_ips        AS ENUM ('primaria', 'secundaria', 'terciaria');
CREATE TYPE tipo_recurso     AS ENUM ('sala', 'quirofano');
CREATE TYPE tipo_vinculacion AS ENUM ('planta', 'contratista');
CREATE TYPE estado_doctor    AS ENUM ('activo', 'vacaciones', 'inactivo');

CREATE OR REPLACE FUNCTION fn_set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE ips (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nit           VARCHAR(20)  NOT NULL UNIQUE,
  nombre        VARCHAR(150) NOT NULL,
  nivel         nivel_ips    NOT NULL,
  direccion     TEXT,
  ciudad        VARCHAR(80)  NOT NULL,
  departamento  VARCHAR(80)  NOT NULL,
  telefono      VARCHAR(20),
  email         VARCHAR(150),
  horario       VARCHAR(120),
  imagen_url    VARCHAR(255),
  latitud       DECIMAL(9,6),
  longitud      DECIMAL(9,6),
  servicios     JSONB        NOT NULL DEFAULT '[]',
  activa        BOOLEAN      NOT NULL DEFAULT true
);
CREATE INDEX ix_ips_ciudad ON ips (ciudad) WHERE activa;

CREATE TABLE puntos_atencion (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ips_id        UUID REFERENCES ips(id),
  nombre        VARCHAR(150) NOT NULL,
  ciudad        VARCHAR(80)  NOT NULL,
  departamento  VARCHAR(80)  NOT NULL,
  direccion     TEXT NOT NULL,
  telefono      VARCHAR(20),
  horario       JSONB NOT NULL DEFAULT '{}',
  servicios     JSONB NOT NULL DEFAULT '[]',
  latitud       DECIMAL(9,6),
  longitud      DECIMAL(9,6),
  activo        BOOLEAN NOT NULL DEFAULT true
);
CREATE INDEX ix_puntos_ciudad ON puntos_atencion (ciudad) WHERE activo;

CREATE TABLE perfiles_doctor (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id           UUID NOT NULL UNIQUE,   -- ref. lógica → auth.usuarios
  nombre_completo      VARCHAR(160) NOT NULL,  -- copia para mostrar sin llamar a Autenticación
  tarjeta_profesional  VARCHAR(30)  NOT NULL UNIQUE,
  especialidad         VARCHAR(100) NOT NULL,
  subespecialidad      VARCHAR(100),
  universidad          VARCHAR(150) NOT NULL,
  anio_graduacion      SMALLINT     NOT NULL CHECK (anio_graduacion BETWEEN 1950 AND 2100),
  sede_principal_id    UUID REFERENCES puntos_atencion(id),   -- ahora es FK real: viven en la misma base
  tipo_vinculacion     tipo_vinculacion NOT NULL,
  fecha_ingreso        DATE         NOT NULL,
  estado               estado_doctor NOT NULL DEFAULT 'activo',
  creado_en            TIMESTAMPTZ  NOT NULL DEFAULT now(),
  actualizado_en       TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_perfiles_doctor_especialidad ON perfiles_doctor (especialidad);
CREATE TRIGGER trg_perfiles_doctor_actualizado BEFORE UPDATE ON perfiles_doctor
  FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

CREATE TABLE recursos_medicos (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  punto_atencion_id  UUID NOT NULL REFERENCES puntos_atencion(id),
  nombre             VARCHAR(100) NOT NULL,
  tipo               tipo_recurso NOT NULL,
  capacidad          SMALLINT NOT NULL CHECK (capacidad > 0),
  equipamiento       JSONB NOT NULL DEFAULT '[]',
  activo             BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT uq_recurso_nombre UNIQUE (punto_atencion_id, nombre)
);

-- Red inicial (datos de ejemplo). Los id son fijos para que el front los reconozca.
INSERT INTO ips (id, nit, nombre, nivel, direccion, ciudad, departamento, horario, imagen_url, servicios) VALUES
  ('a1b2c3d4-0000-4000-8000-000000000001', '900000001-1', 'Sede Chapinero', 'primaria', 'Calle 57 # 9-30', 'Bogotá', 'Bogotá D. C.', 'Lun a sáb, 6:00 a. m. a 8:00 p. m.', '/images/redips/redips-chapinero.jpg', '["Medicina general","Odontología","Laboratorio"]'),
  ('a1b2c3d4-0000-4000-8000-000000000002', '900000002-2', 'Sede Suba', 'primaria', 'Avenida Suba # 115-40', 'Bogotá', 'Bogotá D. C.', 'Lun a vie, 7:00 a. m. a 7:00 p. m.', '/images/redips/redips-suba.jpg', '["Medicina general","Pediatría","Vacunación"]'),
  ('a1b2c3d4-0000-4000-8000-000000000003', '900000003-3', 'Sede Kennedy', 'secundaria', 'Avenida 1 de Mayo # 73-15', 'Bogotá', 'Bogotá D. C.', 'Todos los días, 24 horas', '/images/redips/redips-kennedy.jpg', '["Medicina general","Urgencias","Laboratorio"]'),
  ('a1b2c3d4-0000-4000-8000-000000000004', '900000004-4', 'Sede Usaquén', 'secundaria', 'Carrera 7 # 127-50', 'Bogotá', 'Bogotá D. C.', 'Lun a vie, 7:00 a. m. a 6:00 p. m.', '/images/redips/redips-usaquen.jpg', '["Especialistas","Odontología"]'),
  ('a1b2c3d4-0000-4000-8000-000000000005', '900000005-5', 'Sede Soacha', 'primaria', 'Autopista Sur # 30-12', 'Soacha', 'Cundinamarca', 'Lun a sáb, 6:00 a. m. a 6:00 p. m.', '/images/redips/redips-soacha.jpg', '["Medicina general","Vacunación","Farmacia"]'),
  ('a1b2c3d4-0000-4000-8000-000000000006', '900000006-6', 'Sede Chía', 'primaria', 'Avenida Pradilla # 5-40', 'Chía', 'Cundinamarca', 'Lun a vie, 7:00 a. m. a 5:00 p. m.', '/images/redips/redips-chia.jpg', '["Medicina general","Farmacia"]');

-- =====================================================================
-- LIBITINA E.P.S. — CITAS MÉDICAS (puerto 8005) · Base: libitina_citas
-- Servidor: general · 6 tablas
-- AJUSTE: puntos_atencion y recursos_medicos pasaron a Red de Prestadores.
-- Citas conserva lo que es agenda: copia de doctores, turnos, reservas y citas.
-- (La extensión btree_gist la crea el script de inicio del servidor.)
-- =====================================================================
CREATE TYPE rol_usuario         AS ENUM ('afiliado', 'doctor', 'admin');
CREATE TYPE tipo_cita           AS ENUM ('consulta_externa', 'control');
CREATE TYPE modalidad_cita      AS ENUM ('presencial', 'domiciliaria');
CREATE TYPE estado_cita         AS ENUM ('pendiente', 'confirmada', 'reagendada', 'cancelada', 'realizada', 'no_asistio');
CREATE TYPE origen_reserva      AS ENUM ('cita', 'solicitud_recurso', 'bloqueo_admin');
CREATE TYPE estado_domiciliaria AS ENUM ('pendiente', 'asignada', 'realizada', 'cancelada');
CREATE TYPE franja_horaria      AS ENUM ('manana', 'tarde');

CREATE OR REPLACE FUNCTION fn_set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- Copia local sincronizada por eventos desde Red de Prestadores (doctor_creado / doctor_actualizado)
CREATE TABLE doctores (
  doctor_id           UUID PRIMARY KEY,         -- mismo id que auth.usuarios
  nombre_completo     VARCHAR(160) NOT NULL,
  especialidad        VARCHAR(100) NOT NULL,
  duracion_cita_min   SMALLINT NOT NULL DEFAULT 20 CHECK (duracion_cita_min BETWEEN 10 AND 120),
  atiende_domicilio   BOOLEAN  NOT NULL DEFAULT false,
  activo              BOOLEAN  NOT NULL DEFAULT true,
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_doctores_especialidad ON doctores (especialidad) WHERE activo;

CREATE TABLE agenda_doctor (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id          UUID NOT NULL REFERENCES doctores(doctor_id),
  dia_semana         SMALLINT NOT NULL CHECK (dia_semana BETWEEN 0 AND 6),
  hora_inicio        TIME NOT NULL,
  hora_fin           TIME NOT NULL,
  punto_atencion_id  UUID NOT NULL,              -- ref. lógica → prestadores.puntos_atencion
  activo             BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT ck_turno CHECK (hora_fin > hora_inicio)
);
CREATE INDEX ix_agenda_doctor ON agenda_doctor (doctor_id, dia_semana) WHERE activo;

CREATE TABLE excepciones_agenda (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id     UUID NOT NULL REFERENCES doctores(doctor_id),
  fecha_inicio  DATE NOT NULL,
  fecha_fin     DATE NOT NULL,
  motivo        VARCHAR(150) NOT NULL,
  CONSTRAINT ck_excepcion CHECK (fecha_fin >= fecha_inicio)
);

-- Impide reservar el mismo recurso en horarios cruzados
CREATE TABLE reservas_recurso (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recurso_id     UUID NOT NULL,          -- ref. lógica → prestadores.recursos_medicos
  inicio         TIMESTAMP NOT NULL,
  fin            TIMESTAMP NOT NULL,
  origen         origen_reserva NOT NULL,
  referencia_id  UUID,
  activa         BOOLEAN NOT NULL DEFAULT true,
  creado_por     UUID NOT NULL,
  creado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_reserva CHECK (fin > inicio),
  CONSTRAINT ex_reserva_sin_cruce EXCLUDE USING gist (recurso_id WITH =, tsrange(inicio, fin) WITH &&) WHERE (activa)
);

CREATE TABLE citas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id         UUID NOT NULL,
  paciente_nombre     VARCHAR(160) NOT NULL,
  paciente_documento  VARCHAR(30)  NOT NULL,
  doctor_id           UUID NOT NULL REFERENCES doctores(doctor_id),
  agendada_por_rol    rol_usuario NOT NULL,
  agendada_por_id     UUID NOT NULL,
  tipo                tipo_cita      NOT NULL DEFAULT 'consulta_externa',
  modalidad           modalidad_cita NOT NULL DEFAULT 'presencial',
  estado              estado_cita    NOT NULL DEFAULT 'pendiente',
  fecha               DATE NOT NULL,
  hora_inicio         TIME NOT NULL,
  hora_fin            TIME NOT NULL,
  punto_atencion_id   UUID,                      -- ref. lógica → prestadores.puntos_atencion
  sala_id             UUID,                      -- ref. lógica → prestadores.recursos_medicos
  motivo              TEXT NOT NULL,
  observaciones       TEXT,
  cita_anterior_id    UUID REFERENCES citas(id),
  cancelada_por       UUID,
  motivo_cancelacion  TEXT,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_horario_cita CHECK (hora_fin > hora_inicio),
  CONSTRAINT ck_lugar CHECK (modalidad = 'domiciliaria' OR punto_atencion_id IS NOT NULL),
  CONSTRAINT ck_cancelacion CHECK (estado <> 'cancelada' OR motivo_cancelacion IS NOT NULL)
);
CREATE UNIQUE INDEX uq_cita_doctor_horario ON citas (doctor_id, fecha, hora_inicio) WHERE estado IN ('pendiente', 'confirmada');
CREATE INDEX ix_citas_afiliado ON citas (afiliado_id, fecha DESC);
CREATE INDEX ix_citas_agenda   ON citas (doctor_id, fecha);
CREATE TRIGGER trg_citas_actualizado BEFORE UPDATE ON citas FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

CREATE TABLE solicitudes_domiciliarias (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id         UUID NOT NULL,
  direccion           TEXT NOT NULL,
  ciudad              VARCHAR(80) NOT NULL,
  telefono_contacto   VARCHAR(20) NOT NULL,
  motivo              TEXT NOT NULL,
  fecha_preferida     DATE NOT NULL,
  franja              franja_horaria NOT NULL,
  estado              estado_domiciliaria NOT NULL DEFAULT 'pendiente',
  doctor_asignado_id  UUID REFERENCES doctores(doctor_id),
  cita_id             UUID REFERENCES citas(id),
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_asignacion CHECK (estado = 'pendiente' OR estado = 'cancelada' OR doctor_asignado_id IS NOT NULL)
);
CREATE INDEX ix_domiciliarias_pendientes ON solicitudes_domiciliarias (fecha_preferida) WHERE estado = 'pendiente';

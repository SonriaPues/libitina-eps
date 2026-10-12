-- =====================================================================
-- LIBITINA E.P.S. — HISTORIA CLÍNICA (puerto 8003) · Base: libitina_historia
-- Servidor: CLÍNICO (separado del resto) · 8 tablas
-- Resolución 1995 de 1999: la historia no se borra y todo acceso se audita.
-- AJUSTE DE SEGURIDAD: los textos clínicos se guardan cifrados (BYTEA) con
-- pgcrypto: pgp_sym_encrypt(texto, clave) / pgp_sym_decrypt(columna, clave).
-- La clave vive en el servicio (variable de entorno), nunca en la base.
-- =====================================================================
CREATE TYPE grupo_sanguineo   AS ENUM ('A', 'B', 'AB', 'O');
CREATE TYPE factor_rh         AS ENUM ('positivo', 'negativo');
CREATE TYPE tipo_antecedente  AS ENUM ('personal', 'familiar', 'quirurgico', 'farmacologico', 'toxicologico', 'ginecobstetrico');
CREATE TYPE tipo_alergia      AS ENUM ('medicamento', 'alimento', 'ambiental', 'otro');
CREATE TYPE severidad         AS ENUM ('leve', 'moderada', 'severa');
CREATE TYPE tipo_discapacidad AS ENUM ('fisica', 'visual', 'auditiva', 'intelectual', 'psicosocial', 'sordoceguera', 'multiple');
CREATE TYPE estado_examen     AS ENUM ('ordenado', 'tomado', 'resultado_disponible', 'anulado');
CREATE TYPE rol_acceso        AS ENUM ('afiliado', 'doctor', 'admin');
CREATE TYPE accion_acceso     AS ENUM ('consulta', 'creacion', 'modificacion', 'exportacion');

CREATE OR REPLACE FUNCTION fn_set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE historias_clinicas (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id         UUID NOT NULL UNIQUE,     -- ref. lógica → afiliados.afiliados
  grupo_sanguineo     grupo_sanguineo,
  factor_rh           factor_rh,
  fecha_apertura      DATE NOT NULL DEFAULT CURRENT_DATE,
  doctor_apertura_id  UUID NOT NULL,            -- ref. lógica → auth.usuarios
  activa              BOOLEAN NOT NULL DEFAULT true,
  creado_en           TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_sangre_completa CHECK ((grupo_sanguineo IS NULL) = (factor_rh IS NULL))
);
CREATE TRIGGER trg_historias_actualizado BEFORE UPDATE ON historias_clinicas
  FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

CREATE TABLE consultas (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id                  UUID NOT NULL REFERENCES historias_clinicas(id),
  cita_id                      UUID,               -- ref. lógica → citas.citas
  doctor_id                    UUID NOT NULL,      -- ref. lógica → auth.usuarios
  fecha                        TIMESTAMPTZ NOT NULL DEFAULT now(),
  motivo_consulta              BYTEA NOT NULL,     -- cifrado
  enfermedad_actual            BYTEA,              -- cifrado
  signos_vitales               JSONB,
  examen_fisico                BYTEA,              -- cifrado
  diagnostico_principal_cie10  VARCHAR(10) NOT NULL,   -- código sin cifrar (estadísticas)
  diagnostico_principal_desc   BYTEA NOT NULL,     -- cifrado
  diagnosticos_secundarios     JSONB NOT NULL DEFAULT '[]',
  tratamiento                  BYTEA NOT NULL,     -- cifrado
  observaciones                BYTEA,              -- cifrado
  proxima_cita                 DATE
);
CREATE INDEX ix_consultas_historia ON consultas (historia_id, fecha DESC);
CREATE INDEX ix_consultas_doctor   ON consultas (doctor_id, fecha DESC);

CREATE TABLE antecedentes (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id        UUID NOT NULL REFERENCES historias_clinicas(id),
  tipo               tipo_antecedente NOT NULL,
  descripcion        BYTEA NOT NULL,     -- cifrado
  fecha_diagnostico  DATE,
  registrado_por     UUID NOT NULL,
  activo             BOOLEAN NOT NULL DEFAULT true,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_antecedentes_historia ON antecedentes (historia_id);

CREATE TABLE alergias (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id     UUID NOT NULL REFERENCES historias_clinicas(id),
  agente          VARCHAR(150) NOT NULL,
  tipo            tipo_alergia NOT NULL,
  severidad       severidad    NOT NULL,
  reaccion        TEXT,
  registrado_por  UUID NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_alergias_historia ON alergias (historia_id) WHERE activo;

CREATE TABLE medicamentos_permanentes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id     UUID NOT NULL REFERENCES historias_clinicas(id),
  medicamento_id  UUID,                         -- ref. lógica → afiliados.medicamentos
  nombre          VARCHAR(150) NOT NULL,
  dosis           VARCHAR(60)  NOT NULL,
  frecuencia      VARCHAR(60)  NOT NULL,
  via             VARCHAR(30)  NOT NULL,
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE,
  prescrito_por   UUID NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT ck_fechas_medicamento CHECK (fecha_fin IS NULL OR fecha_fin >= fecha_inicio)
);
CREATE INDEX ix_med_perm_historia ON medicamentos_permanentes (historia_id) WHERE activo;

CREATE TABLE discapacidades (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id     UUID NOT NULL REFERENCES historias_clinicas(id),
  tipo            tipo_discapacidad NOT NULL,
  descripcion     TEXT,
  certificada     BOOLEAN NOT NULL DEFAULT false,
  registrado_por  UUID NOT NULL,
  activo          BOOLEAN NOT NULL DEFAULT true,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE examenes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id      UUID NOT NULL REFERENCES historias_clinicas(id),
  consulta_id      UUID REFERENCES consultas(id),
  cups_code        VARCHAR(20),
  nombre           VARCHAR(150) NOT NULL,
  estado           estado_examen NOT NULL DEFAULT 'ordenado',
  fecha_orden      DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_resultado  DATE,
  resultado        BYTEA,                           -- cifrado
  archivo_url      TEXT,
  ordenado_por     UUID NOT NULL,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_resultado CHECK (estado <> 'resultado_disponible' OR fecha_resultado IS NOT NULL)
);
CREATE INDEX ix_examenes_historia ON examenes (historia_id, fecha_orden DESC);

CREATE TABLE log_accesos_historia (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id    UUID NOT NULL REFERENCES historias_clinicas(id),
  usuario_id     UUID NOT NULL,
  rol            rol_acceso    NOT NULL,
  accion         accion_acceso NOT NULL,
  recurso        VARCHAR(40),
  fecha          TIMESTAMPTZ   NOT NULL DEFAULT now(),
  ip_origen      VARCHAR(45)   NOT NULL,
  justificacion  TEXT          NOT NULL
);
CREATE INDEX ix_log_historia ON log_accesos_historia (historia_id, fecha DESC);

CREATE OR REPLACE FUNCTION fn_log_inmutable() RETURNS trigger AS $$
BEGIN RAISE EXCEPTION 'log_accesos_historia es inmutable (Res. 1995 de 1999)'; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER trg_log_inmutable BEFORE UPDATE OR DELETE ON log_accesos_historia
  FOR EACH ROW EXECUTE FUNCTION fn_log_inmutable();

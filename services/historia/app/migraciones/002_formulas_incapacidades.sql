-- Historia Clínica · 002
-- Fórmulas médicas e incapacidades expedidas en una consulta. El contenido clínico va cifrado
-- (pgcrypto, con la clave del servicio); el código de verificación permite comprobar en la página
-- pública que el documento es auténtico, sin revelar medicamentos ni diagnósticos.
CREATE TABLE IF NOT EXISTS formulas_medicas (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id          UUID NOT NULL REFERENCES historias_clinicas(id),
  consulta_id          UUID NOT NULL REFERENCES consultas(id),
  cita_id              UUID NOT NULL,          -- ref. lógica → citas.citas
  afiliado_id          UUID NOT NULL,          -- ref. lógica → afiliados.afiliados
  paciente_nombre      VARCHAR(160) NOT NULL,
  paciente_documento   VARCHAR(30)  NOT NULL,
  doctor_id            UUID NOT NULL,
  doctor_nombre        VARCHAR(160),
  especialidad         VARCHAR(100),
  medicamentos         BYTEA NOT NULL,         -- JSON cifrado
  indicaciones         BYTEA,                  -- cifrado
  codigo_verificacion  VARCHAR(9) NOT NULL UNIQUE,
  vigente_hasta        DATE NOT NULL,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_formula_consulta ON formulas_medicas (consulta_id);
CREATE INDEX IF NOT EXISTS ix_formulas_afiliado ON formulas_medicas (afiliado_id, creado_en DESC);

CREATE TABLE IF NOT EXISTS incapacidades (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historia_id          UUID NOT NULL REFERENCES historias_clinicas(id),
  consulta_id          UUID NOT NULL REFERENCES consultas(id),
  cita_id              UUID NOT NULL,
  afiliado_id          UUID NOT NULL,
  paciente_nombre      VARCHAR(160) NOT NULL,
  paciente_documento   VARCHAR(30)  NOT NULL,
  doctor_id            UUID NOT NULL,
  doctor_nombre        VARCHAR(160),
  especialidad         VARCHAR(100),
  tipo                 VARCHAR(30) NOT NULL DEFAULT 'enfermedad_general'
                       CHECK (tipo IN ('enfermedad_general', 'accidente_comun', 'accidente_laboral', 'enfermedad_laboral')),
  fecha_inicio         DATE NOT NULL,
  dias                 SMALLINT NOT NULL CHECK (dias BETWEEN 1 AND 30),
  fecha_fin            DATE NOT NULL,
  diagnostico          BYTEA NOT NULL,         -- "I10 · Hipertensión esencial", cifrado
  observaciones        BYTEA,                  -- cifrado
  codigo_verificacion  VARCHAR(9) NOT NULL UNIQUE,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_incapacidad_consulta ON incapacidades (consulta_id);
CREATE INDEX IF NOT EXISTS ix_incapacidades_afiliado ON incapacidades (afiliado_id, creado_en DESC);

-- =====================================================================
-- LIBITINA E.P.S. — AFILIADOS (puerto 8002) · Base: libitina_afiliados
-- Servidor: general · 7 tablas
-- AJUSTES: ips pasó a Red de Prestadores (ips_id es referencia lógica);
-- estados 'pendiente' y 'rechazado' para el flujo de aprobación; columnas del
-- Formulario Único de Afiliación (zona, etnia, discapacidad, tipo de cotizante);
-- tarifas 2026 por régimen.
-- =====================================================================
CREATE TYPE tipo_documento     AS ENUM ('CC', 'TI', 'RC', 'CE', 'PPT', 'PA');
CREATE TYPE sexo               AS ENUM ('masculino', 'femenino', 'otro');
CREATE TYPE tipo_afiliado      AS ENUM ('cotizante', 'beneficiario');
CREATE TYPE tipo_cotizante     AS ENUM ('dependiente', 'independiente', 'pensionado');
CREATE TYPE parentesco         AS ENUM ('conyuge', 'companero_permanente', 'hijo', 'padre', 'madre', 'otro');
CREATE TYPE estado_afiliado    AS ENUM ('pendiente', 'rechazado', 'activo', 'inactivo', 'suspendido', 'retirado', 'fallecido');
CREATE TYPE categoria_ibc      AS ENUM ('A', 'B', 'C');   -- A: < 2 SMLMV · B: 2 a 5 · C: > 5
CREATE TYPE zona_residencia    AS ENUM ('urbana', 'rural');
-- Categorías del DANE. 'no_responde': dato sensible, nunca obligatorio (Ley 1581 de 2012).
CREATE TYPE pertenencia_etnica AS ENUM ('ninguna', 'indigena', 'rom', 'raizal', 'palenquero', 'negro_afrocolombiano', 'no_responde');
CREATE TYPE tipo_discapacidad  AS ENUM ('fisica', 'visual', 'auditiva', 'intelectual', 'psicosocial', 'sordoceguera', 'multiple');

CREATE OR REPLACE FUNCTION fn_set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

CREATE TABLE regimenes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo       VARCHAR(20)  NOT NULL UNIQUE,   -- 'contributivo' | 'subsidiado'
  nombre       VARCHAR(60)  NOT NULL,
  descripcion  TEXT
);

-- Cotizantes y beneficiarios en la MISMA tabla: el grupo familiar son los
-- afiliados con el mismo cotizante_id.
CREATE TABLE afiliados (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id             UUID UNIQUE,                 -- ref. lógica → auth.usuarios (NULL en beneficiarios sin cuenta)
  tipo_documento         tipo_documento NOT NULL,
  numero_documento       VARCHAR(20)    NOT NULL,
  nombres                VARCHAR(80)    NOT NULL,
  apellidos              VARCHAR(80)    NOT NULL,
  fecha_nacimiento       DATE           NOT NULL,
  sexo                   sexo           NOT NULL,
  telefono               VARCHAR(20),
  email                  VARCHAR(150),
  direccion              TEXT,
  ciudad                 VARCHAR(80)    NOT NULL,    -- municipio de residencia
  departamento           VARCHAR(80)    NOT NULL,
  zona                   zona_residencia NOT NULL DEFAULT 'urbana',
  pertenencia_etnica     pertenencia_etnica NOT NULL DEFAULT 'no_responde',
  tiene_discapacidad     BOOLEAN,                     -- NULL = prefiere no responder
  tipo_discapacidad      tipo_discapacidad,
  incapacidad_permanente BOOLEAN        NOT NULL DEFAULT false,   -- hijos de 25 años o más
  regimen_id             UUID NOT NULL REFERENCES regimenes(id),
  ips_id                 UUID,                        -- ref. lógica → prestadores.ips
  tipo_afiliado          tipo_afiliado  NOT NULL DEFAULT 'cotizante',
  cotizante_id           UUID REFERENCES afiliados(id),
  parentesco             parentesco,
  tipo_cotizante         tipo_cotizante,              -- solo cotizante contributivo
  categoria              categoria_ibc,               -- solo contributivo
  ibc                    NUMERIC(14,2),
  grupo_sisben           VARCHAR(4),                  -- solo subsidiado, ej. 'A1', 'B3'
  empleador_nit          VARCHAR(20),
  empleador_nombre       VARCHAR(150),
  estado                 estado_afiliado NOT NULL DEFAULT 'pendiente',
  motivo_rechazo         TEXT,
  fecha_afiliacion       DATE,                        -- se llena al aprobar
  fecha_retiro           DATE,
  creado_en              TIMESTAMPTZ    NOT NULL DEFAULT now(),
  actualizado_en         TIMESTAMPTZ    NOT NULL DEFAULT now(),
  eliminado_en           TIMESTAMPTZ,                 -- borrado lógico
  CONSTRAINT uq_afiliados_documento UNIQUE (tipo_documento, numero_documento),
  CONSTRAINT ck_beneficiario CHECK (
    (tipo_afiliado = 'beneficiario' AND cotizante_id IS NOT NULL AND parentesco IS NOT NULL)
    OR (tipo_afiliado = 'cotizante' AND cotizante_id IS NULL AND parentesco IS NULL)),
  CONSTRAINT ck_no_autocotizante CHECK (cotizante_id IS NULL OR cotizante_id <> id),
  CONSTRAINT ck_rechazo_con_motivo CHECK (estado <> 'rechazado' OR motivo_rechazo IS NOT NULL),
  CONSTRAINT ck_tipo_discapacidad CHECK (tipo_discapacidad IS NULL OR tiene_discapacidad),
  CONSTRAINT ck_dependiente_empleador CHECK (tipo_cotizante IS DISTINCT FROM 'dependiente' OR empleador_nit IS NOT NULL)
);
CREATE INDEX ix_afiliados_cotizante ON afiliados (cotizante_id) WHERE eliminado_en IS NULL;
CREATE INDEX ix_afiliados_estado    ON afiliados (estado) WHERE tipo_afiliado = 'cotizante';
CREATE TRIGGER trg_afiliados_actualizado BEFORE UPDATE ON afiliados
  FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

CREATE TABLE novedades_afiliado (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id      UUID NOT NULL REFERENCES afiliados(id),
  estado_anterior  estado_afiliado,
  estado_nuevo     estado_afiliado NOT NULL,
  motivo           TEXT NOT NULL,
  registrado_por   UUID,                 -- ref. lógica → auth.usuarios
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_novedades_afiliado ON novedades_afiliado (afiliado_id, fecha DESC);

-- Ley 1581 de 2012: una fila por aceptación, se conserva el historial.
CREATE TABLE consentimientos (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  afiliado_id                  UUID NOT NULL REFERENCES afiliados(id),
  version_politica             VARCHAR(10) NOT NULL,
  autoriza_datos_salud         BOOLEAN     NOT NULL,
  autoriza_contacto_comercial  BOOLEAN     NOT NULL DEFAULT false,
  declara_veracidad            BOOLEAN     NOT NULL,
  canal_notificacion           VARCHAR(20) NOT NULL DEFAULT 'email',
  ip_origen                    VARCHAR(45),
  fecha_aceptacion             TIMESTAMPTZ NOT NULL DEFAULT now(),
  vigente                      BOOLEAN     NOT NULL DEFAULT true
);
CREATE UNIQUE INDEX uq_consentimiento_vigente ON consentimientos (afiliado_id) WHERE vigente;

CREATE TABLE medicamentos (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo_cum             VARCHAR(30)  UNIQUE,
  nombre_generico        VARCHAR(150) NOT NULL,
  concentracion          VARCHAR(60),
  forma_farmaceutica     VARCHAR(60),
  grupo                  VARCHAR(60),
  cubierto_pbs           BOOLEAN      NOT NULL DEFAULT true,
  requiere_autorizacion  BOOLEAN      NOT NULL DEFAULT false,
  activo                 BOOLEAN      NOT NULL DEFAULT true
);
CREATE INDEX ix_medicamentos_nombre ON medicamentos (lower(nombre_generico));

CREATE TABLE servicios_pbs (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria              VARCHAR(60)  NOT NULL,
  nombre                 VARCHAR(150) NOT NULL,
  descripcion            TEXT,
  requiere_autorizacion  BOOLEAN      NOT NULL DEFAULT false,
  activo                 BOOLEAN      NOT NULL DEFAULT true
);

-- AJUSTE: por régimen y categoría (Circular Externa 048 de 2025, UVB 2026 = $12.110)
CREATE TABLE tarifas (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio               SMALLINT      NOT NULL,
  regimen            VARCHAR(20)   NOT NULL CHECK (regimen IN ('contributivo', 'subsidiado')),
  categoria          categoria_ibc,                 -- NULL en subsidiado
  cuota_moderadora   NUMERIC(12,2) NOT NULL DEFAULT 0,
  porcentaje_copago  NUMERIC(5,2)  NOT NULL DEFAULT 0,
  tope_evento        NUMERIC(14,2),
  tope_anual         NUMERIC(14,2),
  CONSTRAINT uq_tarifa UNIQUE NULLS NOT DISTINCT (anio, regimen, categoria)
);

INSERT INTO regimenes (codigo, nombre, descripcion) VALUES
  ('contributivo', 'Régimen contributivo', 'Personas con capacidad de pago: trabajadores dependientes, independientes y pensionados.'),
  ('subsidiado',   'Régimen subsidiado',   'Población sin capacidad de pago, clasificada en el Sisbén.');

INSERT INTO tarifas (anio, regimen, categoria, cuota_moderadora, porcentaje_copago, tope_evento, tope_anual) VALUES
  (2026, 'contributivo', 'A',  5000, 11.5,  373715,  748882),
  (2026, 'contributivo', 'B', 20100, 17.3, 1497644, 2995409),
  (2026, 'contributivo', 'C', 52800, 23.0, 2995409, 5990696),
  (2026, 'subsidiado',   NULL,    0, 10.0,  651155, 1302309);

INSERT INTO medicamentos (nombre_generico, concentracion, forma_farmaceutica, grupo, cubierto_pbs, requiere_autorizacion) VALUES
  ('Acetaminofén', '500 mg', 'Tableta', 'Dolor y fiebre', true, false),
  ('Ibuprofeno', '400 mg', 'Tableta', 'Dolor y fiebre', true, false),
  ('Amoxicilina', '500 mg', 'Cápsula', 'Antibióticos', true, false),
  ('Losartán', '50 mg', 'Tableta', 'Cardiovascular', true, false),
  ('Atorvastatina', '20 mg', 'Tableta', 'Cardiovascular', true, false),
  ('Metformina', '850 mg', 'Tableta', 'Diabetes', true, false),
  ('Insulina NPH', '100 UI/mL', 'Vial', 'Diabetes', true, false),
  ('Salbutamol', '100 mcg', 'Inhalador', 'Respiratorio', true, false),
  ('Omeprazol', '20 mg', 'Cápsula', 'Digestivo', true, false),
  ('Levotiroxina', '50 mcg', 'Tableta', 'Hormonas', true, false),
  ('Adalimumab', '40 mg', 'Jeringa prellenada', 'Biológicos', false, true);

INSERT INTO servicios_pbs (categoria, nombre, requiere_autorizacion) VALUES
  ('Consulta', 'Medicina general', false), ('Consulta', 'Medicina especializada', true),
  ('Urgencias', 'Atención inicial de urgencias', false), ('Hospitalización', 'Hospitalización y cirugía', true),
  ('Diagnóstico', 'Laboratorio clínico e imágenes', false), ('Salud oral', 'Odontología general', false),
  ('Maternidad', 'Control prenatal y parto', false), ('Salud mental', 'Psicología y psiquiatría', false),
  ('Prevención', 'Vacunación y tamizajes', false);

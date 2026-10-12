-- =====================================================================
-- LIBITINA E.P.S. — TRÁMITES (puerto 8004) · Base: libitina_tramites
-- Servidor: general · 7 tablas
-- =====================================================================
CREATE TYPE rol_usuario       AS ENUM ('afiliado', 'doctor', 'admin', 'anonimo');
CREATE TYPE tipo_tramite      AS ENUM ('afiliacion', 'certificado', 'portabilidad', 'actualizacion_datos',
                                       'pqrsd', 'autorizacion_medica', 'solicitud_recurso');
CREATE TYPE estado_tramite    AS ENUM ('pendiente', 'en_proceso', 'aprobado', 'rechazado', 'cancelado');
CREATE TYPE tipo_pqrsd        AS ENUM ('peticion', 'queja', 'reclamo', 'sugerencia', 'denuncia');
CREATE TYPE canal_pqrsd       AS ENUM ('web', 'telefono', 'presencial', 'correo');
CREATE TYPE tipo_autorizacion AS ENUM ('procedimiento', 'medicamento', 'examen', 'hospitalizacion', 'terapia');
CREATE TYPE tipo_recurso      AS ENUM ('sala', 'quirofano');

CREATE OR REPLACE FUNCTION fn_set_actualizado_en() RETURNS trigger AS $$
BEGIN NEW.actualizado_en := now(); RETURN NEW; END; $$ LANGUAGE plpgsql;

-- Radicados automáticos: LIB-PQR-2026-000123
CREATE SEQUENCE seq_radicado;
CREATE OR REPLACE FUNCTION fn_generar_radicado() RETURNS trigger AS $$
DECLARE prefijo TEXT;
BEGIN
  IF NEW.radicado IS NULL THEN
    prefijo := CASE NEW.tipo
      WHEN 'afiliacion' THEN 'AFI' WHEN 'certificado' THEN 'CER' WHEN 'portabilidad' THEN 'POR'
      WHEN 'actualizacion_datos' THEN 'ACT' WHEN 'pqrsd' THEN 'PQR'
      WHEN 'autorizacion_medica' THEN 'AUT' WHEN 'solicitud_recurso' THEN 'REC' END;
    NEW.radicado := format('LIB-%s-%s-%s', prefijo, to_char(now(), 'YYYY'), lpad(nextval('seq_radicado')::text, 6, '0'));
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

CREATE TABLE tramites (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  radicado         VARCHAR(30) UNIQUE,
  tipo             tipo_tramite   NOT NULL,
  estado           estado_tramite NOT NULL DEFAULT 'pendiente',
  solicitante_id   UUID,              -- ref. lógica → auth.usuarios (NULL = anónimo)
  solicitante_rol  rol_usuario    NOT NULL,
  afiliado_id      UUID,              -- ref. lógica → afiliados.afiliados
  asignado_a       UUID,
  datos            JSONB NOT NULL DEFAULT '{}',
  observaciones    TEXT,
  creado_en        TIMESTAMPTZ NOT NULL DEFAULT now(),
  actualizado_en   TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT ck_anonimo CHECK (solicitante_rol <> 'anonimo' OR solicitante_id IS NULL)
);
CREATE INDEX ix_tramites_solicitante ON tramites (solicitante_id, creado_en DESC);
CREATE INDEX ix_tramites_bandeja     ON tramites (tipo, estado, creado_en);
CREATE TRIGGER trg_tramites_radicado BEFORE INSERT ON tramites FOR EACH ROW EXECUTE FUNCTION fn_generar_radicado();
CREATE TRIGGER trg_tramites_actualizado BEFORE UPDATE ON tramites FOR EACH ROW EXECUTE FUNCTION fn_set_actualizado_en();

CREATE TABLE pqrsd (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id           UUID NOT NULL UNIQUE REFERENCES tramites(id),
  tipo                 tipo_pqrsd  NOT NULL,
  canal                canal_pqrsd NOT NULL DEFAULT 'web',
  anonima              BOOLEAN     NOT NULL DEFAULT false,
  nombre_contacto      VARCHAR(150),
  documento_contacto   VARCHAR(20),
  email_contacto       VARCHAR(150),
  telefono_contacto    VARCHAR(20),
  asunto               VARCHAR(200) NOT NULL,
  descripcion          TEXT NOT NULL,
  fecha_limite         DATE NOT NULL,
  respuesta            TEXT,
  respondida_por       UUID,
  respondida_en        TIMESTAMPTZ,
  CONSTRAINT ck_contacto CHECK (anonima OR (nombre_contacto IS NOT NULL AND email_contacto IS NOT NULL)),
  CONSTRAINT ck_respuesta CHECK ((respuesta IS NULL) = (respondida_en IS NULL))
);
CREATE INDEX ix_pqrsd_vencimiento ON pqrsd (fecha_limite) WHERE respuesta IS NULL;

CREATE TABLE autorizaciones_medicas (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id            UUID NOT NULL UNIQUE REFERENCES tramites(id),
  afiliado_id           UUID NOT NULL,
  doctor_id             UUID NOT NULL,
  consulta_id           UUID,                   -- ref. lógica → historia.consultas
  tipo                  tipo_autorizacion NOT NULL,
  cups_code             VARCHAR(20),
  descripcion_servicio  VARCHAR(200) NOT NULL,
  cantidad              SMALLINT NOT NULL DEFAULT 1 CHECK (cantidad > 0),
  descripcion_clinica   TEXT NOT NULL,
  diagnostico_cie10     VARCHAR(10)  NOT NULL,
  diagnostico_desc      VARCHAR(200) NOT NULL,
  urgente               BOOLEAN NOT NULL DEFAULT false,
  ips_destino_id        UUID,                   -- ref. lógica → prestadores.ips
  fecha_vencimiento     DATE
);
CREATE INDEX ix_autorizaciones_afiliado ON autorizaciones_medicas (afiliado_id);
CREATE INDEX ix_autorizaciones_doctor   ON autorizaciones_medicas (doctor_id);

CREATE TABLE solicitudes_recurso (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id        UUID NOT NULL UNIQUE REFERENCES tramites(id),
  doctor_id         UUID NOT NULL,
  afiliado_id       UUID,
  tipo_recurso      tipo_recurso NOT NULL,
  recurso_id        UUID NOT NULL,       -- ref. lógica → prestadores.recursos_medicos
  fecha_solicitada  DATE NOT NULL,
  hora_inicio       TIME NOT NULL,
  hora_fin          TIME NOT NULL,
  procedimiento     TEXT NOT NULL,
  justificacion     TEXT NOT NULL,
  reserva_id        UUID,                -- ref. lógica → citas.reservas_recurso
  CONSTRAINT ck_horario_recurso CHECK (hora_fin > hora_inicio)
);

CREATE TABLE certificados (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id           UUID NOT NULL UNIQUE REFERENCES tramites(id),
  afiliado_id          UUID NOT NULL,
  tipo                 VARCHAR(40) NOT NULL DEFAULT 'afiliacion',
  codigo_verificacion  VARCHAR(20) NOT NULL UNIQUE,
  archivo_url          TEXT NOT NULL,
  generado_en          TIMESTAMPTZ NOT NULL DEFAULT now(),
  vigente_hasta        DATE NOT NULL
);

CREATE TABLE adjuntos (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id      UUID NOT NULL REFERENCES tramites(id),
  nombre_archivo  VARCHAR(200) NOT NULL,
  tipo_mime       VARCHAR(80)  NOT NULL,
  tamano_bytes    INTEGER      NOT NULL CHECK (tamano_bytes BETWEEN 1 AND 10485760),
  url             TEXT NOT NULL,
  subido_por      UUID,
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_adjuntos_tramite ON adjuntos (tramite_id);

CREATE TABLE historial_estado (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tramite_id       UUID NOT NULL REFERENCES tramites(id),
  estado_anterior  estado_tramite,
  estado_nuevo     estado_tramite NOT NULL,
  cambiado_por     UUID,
  nota             TEXT,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ix_historial_tramite ON historial_estado (tramite_id, fecha);

CREATE OR REPLACE FUNCTION fn_registrar_cambio_estado() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO historial_estado (tramite_id, estado_anterior, estado_nuevo, cambiado_por) VALUES (NEW.id, NULL, NEW.estado, NEW.solicitante_id);
  ELSIF NEW.estado IS DISTINCT FROM OLD.estado THEN
    INSERT INTO historial_estado (tramite_id, estado_anterior, estado_nuevo, cambiado_por) VALUES (NEW.id, OLD.estado, NEW.estado, NEW.asignado_a);
  END IF;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;
CREATE TRIGGER trg_tramites_historial AFTER INSERT OR UPDATE OF estado ON tramites
  FOR EACH ROW EXECUTE FUNCTION fn_registrar_cambio_estado();

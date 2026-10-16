-- Citas · 002
-- Solicitudes de ausencia del doctor (vacaciones, incapacidad, capacitación…). El administrador
-- las aprueba o rechaza; al aprobar se crea el bloqueo de agenda (excepciones_agenda).
CREATE TABLE IF NOT EXISTS solicitudes_ausencia (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id       UUID NOT NULL REFERENCES doctores(doctor_id),
  tipo            VARCHAR(20) NOT NULL CHECK (tipo IN ('vacaciones', 'incapacidad', 'capacitacion', 'calamidad', 'otro')),
  fecha_inicio    DATE NOT NULL,
  fecha_fin       DATE NOT NULL CHECK (fecha_fin >= fecha_inicio),
  motivo          VARCHAR(500) NOT NULL,
  estado          VARCHAR(12) NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'aprobada', 'rechazada', 'cancelada')),
  respuesta       VARCHAR(500),
  revisada_por    UUID,
  revisada_en     TIMESTAMPTZ,
  excepcion_id    UUID REFERENCES excepciones_agenda(id),
  contacto_email  VARCHAR(255),
  creado_en       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ix_ausencias_doctor ON solicitudes_ausencia (doctor_id, fecha_inicio DESC);
CREATE INDEX IF NOT EXISTS ix_ausencias_pendientes ON solicitudes_ausencia (creado_en) WHERE estado = 'pendiente';

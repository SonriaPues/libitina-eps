-- Historia Clínica · 001
-- Copia del nombre del profesional y su especialidad (para mostrar sin llamar a otros
-- servicios) y una sola consulta por cita.
ALTER TABLE consultas
  ADD COLUMN doctor_nombre VARCHAR(160),
  ADD COLUMN especialidad  VARCHAR(100);
CREATE UNIQUE INDEX uq_consulta_cita ON consultas (cita_id) WHERE cita_id IS NOT NULL;

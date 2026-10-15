-- Trámites · 002 · Remisiones a especialistas (autorizaciones de tipo consulta_especializada)
ALTER TABLE autorizaciones_medicas
  ADD COLUMN especialidad_codigo VARCHAR(40),
  ADD COLUMN cita_origen_id UUID,     -- ref. lógica → citas.citas (consulta en la que se emitió)
  ADD COLUMN cita_uso_id    UUID;     -- ref. lógica → citas.citas (cita de especialista que la consumió)
CREATE INDEX ix_remisiones_disponibles ON autorizaciones_medicas (afiliado_id, especialidad_codigo, fecha_vencimiento)
  WHERE cita_uso_id IS NULL;
CREATE INDEX ix_tramites_afiliado ON tramites (afiliado_id, tipo);

-- =====================================================================
-- Citas · 001 · Lo que necesita el agendamiento por especialidad
-- =====================================================================
ALTER TABLE doctores
  ADD COLUMN especialidad_codigo VARCHAR(40),
  ADD COLUMN sede_principal_id   UUID;              -- ref. lógica → prestadores.puntos_atencion
CREATE INDEX ix_doctores_codigo ON doctores (especialidad_codigo) WHERE activo;

ALTER TABLE citas
  ADD COLUMN especialidad_codigo  VARCHAR(40),
  ADD COLUMN especialidad         VARCHAR(100),
  ADD COLUMN remision_id          UUID,             -- ref. lógica → tramites.autorizaciones_medicas
  ADD COLUMN cuota_moderadora     NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN titular_usuario_id   UUID,             -- dueño de la cuenta que agenda (ve las citas de su grupo)
  ADD COLUMN contacto_email       VARCHAR(150),
  ADD COLUMN contacto_nombre      VARCHAR(80),
  ADD COLUMN recordatorio_enviado BOOLEAN NOT NULL DEFAULT false;

-- Un paciente no puede tener dos citas activas de la misma especialidad
CREATE UNIQUE INDEX uq_cita_paciente_especialidad ON citas (afiliado_id, especialidad_codigo)
  WHERE estado IN ('pendiente', 'confirmada');
CREATE INDEX ix_citas_titular      ON citas (titular_usuario_id, fecha DESC);
CREATE INDEX ix_citas_recordatorio ON citas (fecha) WHERE estado = 'confirmada' AND NOT recordatorio_enviado;
CREATE INDEX ix_excepciones_doctor ON excepciones_agenda (doctor_id, fecha_inicio, fecha_fin);

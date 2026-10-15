-- =====================================================================
-- Red de Prestadores · 001
-- 1. Catálogo de especialidades administrable (tabla 41 del modelo).
-- 2. Perfil del doctor enlazado a su especialidad, con copia de su correo y documento.
-- 3. Un punto de atención por cada IPS de la red (sedes donde se agenda).
-- =====================================================================
CREATE TABLE especialidades (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo             VARCHAR(40)  NOT NULL UNIQUE,
  nombre             VARCHAR(100) NOT NULL UNIQUE,
  descripcion        TEXT,
  requiere_remision  BOOLEAN  NOT NULL DEFAULT true,
  duracion_cita_min  SMALLINT NOT NULL DEFAULT 20 CHECK (duracion_cita_min BETWEEN 10 AND 120),
  activa             BOOLEAN  NOT NULL DEFAULT true,
  creado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO especialidades (codigo, nombre, descripcion, requiere_remision, duracion_cita_min) VALUES
  ('medicina_general', 'Medicina general', 'Consulta de primera vez o control con médico general.', false, 20),
  ('odontologia', 'Odontología', 'Valoración y tratamiento de salud oral.', false, 30),
  ('pediatria', 'Pediatría', 'Atención especializada para niños y adolescentes.', true, 20),
  ('ginecologia', 'Ginecología', 'Salud de la mujer y control prenatal.', true, 20),
  ('medicina_interna', 'Medicina interna', 'Enfermedades crónicas y casos complejos del adulto.', true, 30),
  ('cardiologia', 'Cardiología', 'Corazón y sistema circulatorio.', true, 30),
  ('dermatologia', 'Dermatología', 'Piel, cabello y uñas.', true, 20),
  ('ortopedia', 'Ortopedia', 'Huesos, articulaciones y músculos.', true, 20),
  ('oftalmologia', 'Oftalmología', 'Salud visual.', true, 20),
  ('psicologia', 'Psicología', 'Salud mental y acompañamiento emocional.', true, 40);

ALTER TABLE perfiles_doctor
  ADD COLUMN especialidad_id UUID REFERENCES especialidades(id),
  ADD COLUMN email     VARCHAR(150),   -- copia de auth.usuarios para mostrar sin llamar a Autenticación
  ADD COLUMN documento VARCHAR(30);
CREATE INDEX ix_perfiles_doctor_especialidad_id ON perfiles_doctor (especialidad_id);

-- Un punto de atención por IPS (id derivado del de la IPS: a1b2… -> b1b2…)
INSERT INTO puntos_atencion (id, ips_id, nombre, ciudad, departamento, direccion, horario, servicios)
SELECT overlay(i.id::text placing 'b1b2c3d4' from 1 for 8)::uuid, i.id, i.nombre, i.ciudad, i.departamento,
       coalesce(i.direccion, ''), jsonb_build_object('texto', i.horario), i.servicios
FROM ips i
ON CONFLICT (id) DO NOTHING;

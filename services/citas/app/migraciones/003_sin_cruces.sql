-- Citas · 003
-- Ningún doctor ni ningún paciente puede tener dos citas activas que se crucen en el tiempo,
-- aunque empiecen a horas distintas (8:30–8:50 y 8:40–9:00 también se rechazan).
-- La base de datos lo garantiza con restricciones de exclusión (btree_gist, ya instalada).
-- El rango de una cita: [fecha + hora_inicio, fecha + hora_fin), con un día más si termina a medianoche o después.

-- 1. Si ya hay citas activas cruzadas (por ejemplo, creadas a mano), se cancela la más reciente de cada cruce.
UPDATE citas c
   SET estado = 'cancelada',
       motivo_cancelacion = 'Cancelada automáticamente: se cruzaba con otra cita activa en el mismo horario.'
 WHERE c.estado IN ('pendiente', 'confirmada')
   AND EXISTS (
     SELECT 1 FROM citas o
      WHERE o.id <> c.id
        AND o.estado IN ('pendiente', 'confirmada')
        AND (o.doctor_id = c.doctor_id OR o.afiliado_id = c.afiliado_id)
        AND tsrange(o.fecha + o.hora_inicio, o.fecha + o.hora_fin + CASE WHEN o.hora_fin <= o.hora_inicio THEN interval '1 day' ELSE interval '0' END)
         && tsrange(c.fecha + c.hora_inicio, c.fecha + c.hora_fin + CASE WHEN c.hora_fin <= c.hora_inicio THEN interval '1 day' ELSE interval '0' END)
        AND (o.creado_en, o.id) < (c.creado_en, c.id));

-- 2. Restricciones: el doctor no se cruza consigo mismo; el paciente tampoco.
ALTER TABLE citas ADD CONSTRAINT ex_cita_doctor_sin_cruce EXCLUDE USING gist (
  doctor_id WITH =,
  tsrange(fecha + hora_inicio, fecha + hora_fin + CASE WHEN hora_fin <= hora_inicio THEN interval '1 day' ELSE interval '0' END) WITH &&
) WHERE (estado IN ('pendiente', 'confirmada'));

ALTER TABLE citas ADD CONSTRAINT ex_cita_paciente_sin_cruce EXCLUDE USING gist (
  afiliado_id WITH =,
  tsrange(fecha + hora_inicio, fecha + hora_fin + CASE WHEN hora_fin <= hora_inicio THEN interval '1 day' ELSE interval '0' END) WITH &&
) WHERE (estado IN ('pendiente', 'confirmada'));

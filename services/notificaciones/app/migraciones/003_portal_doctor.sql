-- Notificaciones · 003
-- Plantillas del portal del doctor: respuesta a una solicitud de ausencia.
INSERT INTO plantillas_correo (evento, asunto, resumen, cuerpo_html) VALUES
  ('ausencia_respondida', 'Tu solicitud de {{tipo}} fue {{decision}}', 'Solicitud de {{tipo}} {{decision}}.',
   '<p>Hola {{nombre}},</p><p>Tu solicitud de <strong>{{tipo}}</strong> del {{desde}} al {{hasta}} fue <strong>{{decision}}</strong>.</p><p>{{respuesta}}</p><p><a class="boton" href="{{enlace}}">Ver mis solicitudes</a></p>')
ON CONFLICT (evento) DO UPDATE SET asunto = EXCLUDED.asunto, resumen = EXCLUDED.resumen,
  cuerpo_html = EXCLUDED.cuerpo_html, actualizado_en = now();

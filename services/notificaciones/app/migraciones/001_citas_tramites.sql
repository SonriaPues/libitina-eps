-- Notificaciones · 001
-- 1. Quien radica una PQRSD sin cuenta también recibe correo: usuario_id pasa a ser opcional.
-- 2. Plantillas de los flujos de doctores, citas, remisiones y PQRSD.
ALTER TABLE notificaciones ALTER COLUMN usuario_id DROP NOT NULL;

INSERT INTO plantillas_correo (evento, asunto, resumen, cuerpo_html) VALUES
  ('bienvenida_doctor', 'Bienvenido al portal del doctor de Libitina EPS', 'Crea tu contraseña para entrar al portal del doctor.',
   '<p>Hola {{nombre}},</p><p>La administración de Libitina EPS te registró como profesional de <strong>{{especialidad}}</strong>. Desde el portal del doctor podrás ver tu agenda, atender a tus pacientes y emitir remisiones.</p><p>Para empezar, crea tu contraseña:</p><p><a class="boton" href="{{enlace}}">Crear mi contraseña</a></p><p>El enlace vence en 72 horas. Si vence, pídele a la administración uno nuevo.</p>'),
  ('cita_agendada', 'Tu cita de {{especialidad}} quedó agendada', 'Cita de {{especialidad}} agendada: {{fecha}}, {{hora}}.',
   '<p>Hola {{nombre}},</p><p>Quedó agendada la cita de <strong>{{especialidad}}</strong> para <strong>{{paciente}}</strong>:</p><ul><li><strong>Fecha:</strong> {{fecha}}</li><li><strong>Hora:</strong> {{hora}}</li><li><strong>Profesional:</strong> {{doctor}}</li><li><strong>Sede:</strong> {{sede}}</li><li><strong>Cuota moderadora:</strong> {{cuota}}</li></ul><p>Llega 15 minutos antes con el documento de identidad del paciente. Si no puedes asistir, cancélala desde tu portal con al menos 2 horas de anticipación para que otra persona pueda usar el horario.</p><p><a class="boton" href="{{enlace}}">Ver mis citas</a></p>'),
  ('cita_recordatorio', 'Recordatorio: mañana tienes cita de {{especialidad}}', 'Recordatorio: cita mañana a las {{hora}}.',
   '<p>Hola {{nombre}},</p><p>Te recordamos la cita de <strong>{{especialidad}}</strong> de <strong>{{paciente}}</strong>, <strong>{{fecha}}</strong> a las <strong>{{hora}}</strong> con {{doctor}} en {{sede}}.</p><p>Si ya no puedes asistir, cancélala desde tu portal.</p><p><a class="boton" href="{{enlace}}">Ver mis citas</a></p>'),
  ('cita_cancelada', 'Se canceló una cita de {{especialidad}}', 'Se canceló la cita del {{fecha}}.',
   '<p>Hola {{nombre}},</p><p>La cita de <strong>{{especialidad}}</strong> de <strong>{{paciente}}</strong> del {{fecha}} a las {{hora}} con {{doctor}} fue cancelada.</p><p><strong>Motivo:</strong> {{motivo}}</p><p>Si la necesitas, puedes agendar otra desde tu portal.</p><p><a class="boton" href="{{enlace}}">Agendar una cita</a></p>'),
  ('remision_emitida', 'Tienes una remisión a {{especialidad}}', 'Nueva remisión a {{especialidad}}.',
   '<p>Hola {{nombre}},</p><p>{{doctor}} remitió a <strong>{{paciente}}</strong> a <strong>{{especialidad}}</strong>. La remisión está vigente hasta el <strong>{{vence}}</strong>.</p><p>Ya puedes agendar la cita con el especialista desde tu portal.</p><p><a class="boton" href="{{enlace}}">Agendar la cita</a></p>'),
  ('pqrsd_radicada', 'Radicamos tu {{tipo}}: {{radicado}}', 'Radicamos tu {{tipo}} {{radicado}}.',
   '<p>Hola {{nombre}},</p><p>Recibimos tu {{tipo}} con el radicado <strong>{{radicado}}</strong>. Te responderemos a más tardar el <strong>{{fecha_limite}}</strong>.</p><p>Puedes consultar el estado en cualquier momento con el radicado y tu número de documento.</p><p><a class="boton" href="{{enlace}}">Consultar mi PQRSD</a></p>'),
  ('pqrsd_respondida', 'Respondimos tu {{tipo}} {{radicado}}', 'Respondimos tu PQRSD {{radicado}}.',
   '<p>Hola {{nombre}},</p><p>Esta es la respuesta a tu {{tipo}} con radicado <strong>{{radicado}}</strong>:</p><blockquote style="margin:16px 0;padding:12px 16px;border-left:4px solid #F6C220;background:#F7FAFD">{{respuesta}}</blockquote><p>Si no estás conforme, puedes radicar una nueva PQRSD o acudir a la Superintendencia Nacional de Salud.</p><p><a class="boton" href="{{enlace}}">Ver mi PQRSD</a></p>')
ON CONFLICT (evento) DO UPDATE SET asunto = EXCLUDED.asunto, resumen = EXCLUDED.resumen,
  cuerpo_html = EXCLUDED.cuerpo_html, actualizado_en = now();

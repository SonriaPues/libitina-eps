-- =====================================================================
-- LIBITINA E.P.S. — NOTIFICACIONES (puerto 8006) · Base: libitina_notificaciones
-- Servidor: general · 5 tablas · PostgreSQL con JSONB (sin MongoDB)
-- =====================================================================
CREATE TYPE estado_envio    AS ENUM ('pendiente', 'enviado', 'fallido');
CREATE TYPE origen_evento   AS ENUM ('autenticacion', 'afiliados', 'prestadores', 'historia_clinica', 'tramites', 'citas', 'admin');
CREATE TYPE resultado_envio AS ENUM ('ok', 'error');

CREATE TABLE plantillas_correo (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evento          VARCHAR(60)  NOT NULL UNIQUE,
  asunto          VARCHAR(200) NOT NULL,
  cuerpo_html     TEXT NOT NULL,             -- variables {{nombre}}, {{enlace}}…
  resumen         VARCHAR(255) NOT NULL,     -- texto corto para la campanita
  activa          BOOLEAN NOT NULL DEFAULT true,
  actualizado_en  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE envios_masivos (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enviado_por          UUID NOT NULL,
  asunto               VARCHAR(200) NOT NULL,
  cuerpo_html          TEXT NOT NULL,
  segmento             JSONB NOT NULL DEFAULT '{}',
  total_destinatarios  INTEGER NOT NULL DEFAULT 0,
  creado_en            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE notificaciones (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id        UUID NOT NULL,             -- ref. lógica → auth.usuarios
  email_destino     VARCHAR(150) NOT NULL,
  asunto            VARCHAR(200) NOT NULL,
  cuerpo_html       TEXT NOT NULL,
  resumen           VARCHAR(255) NOT NULL,
  enlace            VARCHAR(255),
  estado            estado_envio  NOT NULL DEFAULT 'pendiente',
  origen            origen_evento NOT NULL,
  evento            VARCHAR(60)   NOT NULL,
  referencia_id     UUID,
  envio_masivo_id   UUID REFERENCES envios_masivos(id),
  leida             BOOLEAN NOT NULL DEFAULT false,
  leida_en          TIMESTAMPTZ,
  creado_en         TIMESTAMPTZ NOT NULL DEFAULT now(),
  enviado_en        TIMESTAMPTZ
);
CREATE INDEX ix_notif_usuario    ON notificaciones (usuario_id, creado_en DESC);
CREATE INDEX ix_notif_no_leidas  ON notificaciones (usuario_id) WHERE NOT leida;
CREATE INDEX ix_notif_pendientes ON notificaciones (creado_en) WHERE estado = 'pendiente';

CREATE TABLE log_envios (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notificacion_id  UUID NOT NULL REFERENCES notificaciones(id) ON DELETE CASCADE,
  intento          SMALLINT NOT NULL CHECK (intento > 0),
  resultado        resultado_envio NOT NULL,
  detalle_error    TEXT,
  fecha            TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_intento UNIQUE (notificacion_id, intento)
);

CREATE TABLE preferencias_notificacion (
  usuario_id              UUID PRIMARY KEY,
  email_alterno           VARCHAR(150),
  recibir_recordatorios   BOOLEAN NOT NULL DEFAULT true,
  recibir_masivos         BOOLEAN NOT NULL DEFAULT true,
  actualizado_en          TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO plantillas_correo (evento, asunto, resumen, cuerpo_html) VALUES
  ('afiliacion_recibida', 'Recibimos tu solicitud de afiliación', 'Tu solicitud de afiliación está en revisión.',
   '<p>Hola {{nombre}},</p><p>Recibimos tu solicitud de afiliación a Libitina EPS. Un administrador la revisará y te avisaremos por este medio.</p><p>Mientras tanto, confirma tu correo para activar tu cuenta:</p><p><a class="boton" href="{{enlace}}">Confirmar mi correo</a></p><p>Puedes seguir el estado de tu solicitud desde tu portal.</p>'),
  ('afiliacion_aprobada', 'Tu afiliación a Libitina EPS fue aprobada', 'Tu afiliación fue aprobada.',
   '<p>Hola {{nombre}},</p><p>Tu afiliación y la de tu grupo familiar quedaron <strong>activas</strong>. Ya puedes usar los servicios de salud en tu IPS asignada.</p><p><a class="boton" href="{{enlace}}">Ir a mi portal</a></p>'),
  ('afiliacion_rechazada', 'Tu solicitud de afiliación necesita correcciones', 'Tu solicitud fue rechazada. Revisa el motivo.',
   '<p>Hola {{nombre}},</p><p>Revisamos tu solicitud y necesita correcciones antes de aprobarla.</p><p><strong>Motivo:</strong> {{motivo}}</p><p>Entra a tu portal, corrige los datos y vuelve a enviarla. No tienes que inscribirte de nuevo.</p><p><a class="boton" href="{{enlace}}">Corregir mi solicitud</a></p>'),
  ('verificacion_email', 'Confirma tu correo', 'Confirma tu correo electrónico.',
   '<p>Hola {{nombre}},</p><p>Confirma tu correo para activar tu cuenta en Libitina EPS.</p><p><a class="boton" href="{{enlace}}">Confirmar mi correo</a></p><p>El enlace vence en 24 horas.</p>'),
  ('recuperacion_contrasena', 'Restablece tu contraseña', 'Solicitaste restablecer tu contraseña.',
   '<p>Hola {{nombre}},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p><a class="boton" href="{{enlace}}">Crear una nueva contraseña</a></p><p>El enlace vence en 30 minutos. Si no fuiste tú, ignora este correo: tu contraseña no cambia.</p>'),
  ('cita_agendada', 'Tu cita fue agendada', 'Tienes una cita agendada.', '<p>{{fecha}} a las {{hora}} con {{doctor}} en {{sede}}.</p>'),
  ('cita_recordatorio', 'Recordatorio: tienes una cita mañana', 'Recordatorio de cita.', '<p>{{fecha}} a las {{hora}} con {{doctor}}.</p>'),
  ('cita_cancelada', 'Tu cita fue cancelada', 'Una cita fue cancelada.', '<p>La cita del {{fecha}} fue cancelada. Motivo: {{motivo}}</p>'),
  ('tramite_actualizado', 'Tu trámite {{radicado}} cambió de estado', 'Un trámite cambió de estado.', '<p>Nuevo estado: {{estado}}</p>'),
  ('pqrsd_respondida', 'Respuesta a tu PQRSD {{radicado}}', 'Tu PQRSD fue respondida.', '<p>{{respuesta}}</p>');

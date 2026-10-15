# Hoja de ruta · Libitina EPS

Lo que ya funciona: afiliación completa (inscripción, beneficiarios, aprobación y rechazo, corrección),
autenticación con verificación de correo y recuperación de contraseña, red de IPS, notificaciones por correo,
consulta pública del estado, **citas de medicina general, odontología y especialistas (con remisión)**,
**portal del doctor**, **historia clínica cifrada**, **certificados con QR**, **PQRSD reales** y la gestión de
doctores, especialidades y agendas desde el panel del administrador. Todo desplegado en Azure.

Lo que sigue, en orden. Cada entrega llena un servicio cuya base ya existe.

## Entrega 2 · Trámites (servicio `tramites`)

El carné y las novedades siguen con datos simulados; lo demás ya es real.

- [x] **Expedición de certificados** (PDF real con código de verificación):
  - [x] Certificado de afiliación (titular y grupo familiar, régimen, IPS, fecha de afiliación).
  - [ ] Certificado de no afiliación / de retiro, para quien se traslada a otra EPS.
  - [x] Certificado del grupo familiar (incluido en el de afiliación) (beneficiarios y parentesco).
  - [x] Página pública para que una empresa o colegio **verifique** un certificado con su código.
- [x] **PQRSD reales**: radicado automático, plazo en días hábiles sin festivos (15; 30 para denuncias),
      denuncias anónimas, consulta con radicado + documento, bandeja del administrador con las vencidas resaltadas,
      correos al radicar y al responder.
- [ ] Adjuntos PDF o imagen hasta 5 MB en las PQRSD.
- [ ] **Novedades de afiliación** desde el portal:
  - [ ] Actualizar datos de contacto y dirección.
  - [ ] Incluir o retirar beneficiarios (con aprobación del administrador).
  - [ ] Cambio de IPS.
  - [ ] Cambio de régimen o de tipo de cotizante.
  - [ ] Retiro de la EPS y traslado.
- [ ] **Carné digital** con los datos reales del afiliado y sus beneficiarios.

## Entrega 3 · Citas (servicio `citas`) y portal del doctor

- [x] Agenda de cada profesional por sede y días de la semana; vacaciones y excepciones.
- [x] Pedir, reagendar y cancelar citas de medicina general, odontología y especialistas (con remisión).
- [x] Citas para los beneficiarios desde la cuenta del titular.
- [x] Recordatorio por correo el día anterior (tarea programada de Celery).
- [ ] Solicitud de atención domiciliaria (pensada para la zona rural).
- [x] Portal del doctor: su agenda del día y de la semana, la historia del paciente y el registro de la consulta.

## Entrega 4 · Historia Clínica (servicio `historia`)

- [x] Registro de la consulta (motivo, examen, diagnóstico CIE-10, tratamiento), cifrado con pgcrypto.
- [x] Antecedentes y alergias.
- [ ] Medicamentos permanentes y exámenes.
- [x] Registro de **cada acceso** a la historia (quién, cuándo, para qué), que no se puede borrar.
- [x] El afiliado ve su propia historia (y la de sus hijos menores) en el portal.
- [ ] Resultados de laboratorio.

## Entrega 5 · Autorizaciones, medicamentos e incapacidades

- [x] Remisión a especialista emitida por el doctor (vigencia de 90 días).
- [ ] Autorizaciones de servicios (exámenes, procedimientos) solicitadas por el doctor y aprobadas por la EPS.
- [ ] Órdenes de medicamentos y seguimiento de la entrega en farmacia.
- [ ] Reserva de salas y quirófanos.
- [ ] Incapacidades y licencias de maternidad y paternidad (régimen contributivo).

## Administración y reportes

- [x] Gestión de profesionales y especialidades desde el panel.
- [ ] Gestión de IPS y puntos de atención desde el panel (hoy se cargan con SQL).
- [x] Gestión de doctores (cuenta, especialidad, estado y reenvío del acceso).
- [ ] Gestión de usuarios administradores.
- [ ] Tablero con cifras reales (afiliados por régimen, zona rural/urbana, PQRSD por vencer, citas del día);
      reemplaza las cifras `[000]` de la página de inicio.
- [ ] Envíos masivos (campañas de vacunación, brigadas rurales), usando la tabla `envios_masivos`.

## Contenido e infraestructura

- [ ] Correo, teléfono y horario reales de atención (`frontend/src/data/sitio.js`); enlaces de Instagram y Facebook.
- [ ] Copia de los respaldos fuera de la máquina (Azure Blob Storage).
- [ ] Monitoreo: aviso por correo si un servicio deja de responder.
- [ ] Límite de peticiones compartido en Redis, para poder correr varias copias del Gateway.

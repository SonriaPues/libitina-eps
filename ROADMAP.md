# Hoja de ruta · Libitina EPS

Lo que ya funciona: afiliación completa (inscripción, beneficiarios, aprobación y rechazo, corrección),
autenticación con verificación de correo y recuperación de contraseña, red de IPS, notificaciones por correo,
consulta pública del estado y la arquitectura lista para desplegar en Azure.

Lo que sigue, en orden. Cada entrega llena un servicio cuya base ya existe.

## Entrega 2 · Trámites (servicio `tramites`)

Las pantallas de PQRSD, certificado y carné ya existen en el front, pero funcionan con datos simulados.

- [ ] **Expedición de certificados** (PDF real con código de verificación):
  - [ ] Certificado de afiliación (titular y grupo familiar, régimen, IPS, fecha de afiliación).
  - [ ] Certificado de no afiliación / de retiro, para quien se traslada a otra EPS.
  - [ ] Certificado del grupo familiar (beneficiarios y parentesco).
  - [ ] Página pública para que una empresa o colegio **verifique** un certificado con su código.
- [ ] **PQRSD reales**: radicado automático (`LIB-PQR-2026-000123`), plazo de 15 días hábiles (Ley 1755 de 2015),
      radicación anónima para denuncias, adjuntos PDF o imagen hasta 5 MB, consulta con radicado + documento,
      bandeja del administrador con las vencidas resaltadas, correos al radicar y al responder.
- [ ] **Novedades de afiliación** desde el portal:
  - [ ] Actualizar datos de contacto y dirección.
  - [ ] Incluir o retirar beneficiarios (con aprobación del administrador).
  - [ ] Cambio de IPS.
  - [ ] Cambio de régimen o de tipo de cotizante.
  - [ ] Retiro de la EPS y traslado.
- [ ] **Carné digital** con los datos reales del afiliado y sus beneficiarios.

## Entrega 3 · Citas (servicio `citas`) y portal del doctor

- [ ] Agenda de cada profesional por sede y días de la semana; vacaciones y excepciones.
- [ ] Pedir, reagendar y cancelar citas de medicina general, odontología y especialistas (con remisión).
- [ ] Citas para los beneficiarios desde la cuenta del titular.
- [ ] Recordatorio por correo el día anterior (tarea programada de Celery).
- [ ] Solicitud de atención domiciliaria (pensada para la zona rural).
- [ ] Portal del doctor: su agenda del día y la lista de pacientes.

## Entrega 4 · Historia Clínica (servicio `historia`)

- [ ] Registro de la consulta (motivo, examen, diagnóstico CIE-10, tratamiento), cifrado con pgcrypto.
- [ ] Antecedentes, alergias, medicamentos permanentes y exámenes.
- [ ] Registro de **cada acceso** a la historia (quién, cuándo, para qué), que no se puede borrar.
- [ ] El afiliado ve su propia historia y sus resultados de laboratorio en el portal.

## Entrega 5 · Autorizaciones, medicamentos e incapacidades

- [ ] Autorizaciones de servicios (exámenes, procedimientos, especialistas) solicitadas por el doctor y aprobadas por la EPS.
- [ ] Órdenes de medicamentos y seguimiento de la entrega en farmacia.
- [ ] Reserva de salas y quirófanos.
- [ ] Incapacidades y licencias de maternidad y paternidad (régimen contributivo).

## Administración y reportes

- [ ] Gestión de IPS, puntos de atención y profesionales desde el panel (hoy se cargan con SQL).
- [ ] Gestión de usuarios administradores y doctores.
- [ ] Tablero con cifras reales (afiliados por régimen, zona rural/urbana, PQRSD por vencer, citas del día);
      reemplaza las cifras `[000]` de la página de inicio.
- [ ] Envíos masivos (campañas de vacunación, brigadas rurales), usando la tabla `envios_masivos`.

## Contenido e infraestructura

- [ ] Correo, teléfono y horario reales de atención (`frontend/src/data/sitio.js`); enlaces de Instagram y Facebook.
- [ ] Copia de los respaldos fuera de la máquina (Azure Blob Storage).
- [ ] Monitoreo: aviso por correo si un servicio deja de responder.
- [ ] Límite de peticiones compartido en Redis, para poder correr varias copias del Gateway.

// Funciones que usan las páginas. Cada una llama al API real o al simulado.
import { api, USE_MOCK, getRefresh, ApiError, descargar } from './client.js';
import { mock } from './mock.js';
import { IPS } from '../data/ips.js';

const m = (fnMock, fnReal) => (...a) => (USE_MOCK ? fnMock(...a) : fnReal(...a));

export const authApi = {
  login: m(mock.login, (d) => api('/auth/login', { method: 'POST', body: d })),
  logout: m(async () => null, () => api('/auth/logout', { method: 'POST', body: { refresh_token: getRefresh() || '' } }).catch(() => null)),
  recuperar: m(mock.ok, (correo) => api('/auth/recuperar', { method: 'POST', body: { correo } })),
  confirmarRecuperacion: m(mock.ok, (token, clave) => api('/auth/recuperar/confirmar', { method: 'POST', body: { token, clave } })),
  verificarCorreo: m(mock.ok, (token) => api(`/auth/verificar-email/${encodeURIComponent(token)}`)),
  reenviarVerificacion: m(mock.ok, () => api('/auth/verificar-email', { method: 'POST', auth: true })),
};

export const afiliadosApi = {
  inscripcion: m(mock.inscripcion, (d) => api('/afiliados/inscripcion', { method: 'POST', body: d })),
  miAfiliacion: m(mock.miAfiliacion, () => api('/afiliados/me', { auth: true })),
  reenviar: m(mock.reenviar, (d) => api('/afiliados/me/reenviar', { method: 'PUT', body: d, auth: true })),
  consulta: m(mock.consulta, (tipo, numero) => api(`/afiliados/consulta?tipo=${tipo}&numero=${encodeURIComponent(numero)}`)),
  solicitudes: m(mock.solicitudes, (estado) => api(`/afiliados/solicitudes${estado ? `?estado=${estado}` : ''}`, { auth: true })),
  aprobar: m((id) => mock.decidir(id, 'aprobar'), (id) => api(`/afiliados/solicitudes/${id}/aprobar`, { method: 'POST', auth: true })),
  rechazar: m((id, motivo) => mock.decidir(id, 'rechazar', motivo), (id, motivo) => api(`/afiliados/solicitudes/${id}/rechazar`, { method: 'POST', body: { motivo }, auth: true })),
};

export const prestadoresApi = {
  // Si el servicio no responde, se usa el listado local para no dejar la página vacía.
  async ips() {
    if (USE_MOCK) return IPS;
    try { return await api('/prestadores/ips'); } catch { return IPS; }
  },
};

// ---------------------------------------------------------------------------
// Funciones que solo existen con el backend real (Citas, Historia, Trámites y
// gestión de doctores). En modo demostración muestran un aviso.
// ---------------------------------------------------------------------------
const sinMock = (fn) => (...a) => (USE_MOCK
  ? Promise.reject(new ApiError('Esta sección necesita el backend. Levántalo con Docker y pon VITE_USE_MOCK=false en el .env del front.', 0))
  : fn(...a));
const real = (obj) => Object.fromEntries(Object.entries(obj).map(([k, f]) => [k, sinMock(f)]));

export const redApi = real({
  especialidades: (incluirInactivas = false) => api('/prestadores/especialidades', { params: { incluir_inactivas: incluirInactivas || undefined } }),
  sedes: () => api('/prestadores/puntos-atencion'),
  crearEspecialidad: (d) => api('/prestadores/especialidades', { method: 'POST', body: d, auth: true }),
  editarEspecialidad: (id, d) => api(`/prestadores/especialidades/${id}`, { method: 'PUT', body: d, auth: true }),
  doctores: () => api('/prestadores/admin/doctores', { auth: true }),
  crearDoctor: (d) => api('/prestadores/admin/doctores', { method: 'POST', body: d, auth: true }),
  editarDoctor: (id, d) => api(`/prestadores/admin/doctores/${id}`, { method: 'PUT', body: d, auth: true }),
  reenviarAcceso: (id) => api(`/prestadores/admin/doctores/${id}/reenviar-acceso`, { method: 'POST', auth: true }),
  miPerfil: () => api('/prestadores/doctores/me', { auth: true }),
});

export const citasApi = real({
  especialidadesConAgenda: () => api('/citas/especialidades'),
  disponibilidad: (especialidad, puntoId, desde) => api('/citas/disponibilidad', { auth: true, params: { especialidad, punto_atencion_id: puntoId, desde, dias: 31 } }),
  agendar: (d) => api('/citas', { method: 'POST', body: d, auth: true }),
  mias: () => api('/citas/mias', { auth: true }),
  cancelar: (id, motivo) => api(`/citas/${id}/cancelar`, { method: 'POST', body: { motivo }, auth: true }),
  reagendar: (id, d) => api(`/citas/${id}/reagendar`, { method: 'POST', body: d, auth: true }),
  agendaDoctor: (desde, hasta) => api('/citas/doctor/agenda', { auth: true, params: { desde, hasta } }),
  citaDoctor: (id) => api(`/citas/doctor/citas/${id}`, { auth: true }),
  noAsistio: (id) => api(`/citas/${id}/no-asistio`, { method: 'POST', auth: true }),
  doctoresAdmin: () => api('/citas/admin/doctores', { auth: true }),
  agendaAdmin: (doctorId) => api(`/citas/admin/doctores/${doctorId}/agenda`, { auth: true }),
  crearTurno: (doctorId, d) => api(`/citas/admin/doctores/${doctorId}/turnos`, { method: 'POST', body: d, auth: true }),
  borrarTurno: (id) => api(`/citas/admin/turnos/${id}`, { method: 'DELETE', auth: true }),
  crearBloqueo: (doctorId, d) => api(`/citas/admin/doctores/${doctorId}/excepciones`, { method: 'POST', body: d, auth: true }),
  borrarBloqueo: (id) => api(`/citas/admin/excepciones/${id}`, { method: 'DELETE', auth: true }),
});

export const historiaApi = real({
  paciente: (afiliadoId, citaId) => api(`/historia/pacientes/${afiliadoId}`, { auth: true, params: { cita_id: citaId } }),
  registrarConsulta: (d) => api('/historia/consultas', { method: 'POST', body: d, auth: true }),
  agregarAlergia: (afiliadoId, citaId, d) => api(`/historia/pacientes/${afiliadoId}/alergias?cita_id=${citaId}`, { method: 'POST', body: d, auth: true }),
  agregarAntecedente: (afiliadoId, citaId, d) => api(`/historia/pacientes/${afiliadoId}/antecedentes?cita_id=${citaId}`, { method: 'POST', body: d, auth: true }),
  mia: (afiliadoId) => api('/historia/mia', { auth: true, params: { afiliado_id: afiliadoId } }),
  accesos: (afiliadoId) => api('/historia/mia/accesos', { auth: true, params: { afiliado_id: afiliadoId } }),
});

export const tramitesApi = real({
  emitirRemision: (d) => api('/tramites/remisiones', { method: 'POST', body: d, auth: true }),
  remisionesDeCita: (citaId) => api(`/tramites/remisiones/cita/${citaId}`, { auth: true }),
  misRemisiones: () => api('/tramites/remisiones/mias', { auth: true }),
  expedirCertificado: () => api('/tramites/certificados', { method: 'POST', auth: true }),
  misCertificados: () => api('/tramites/certificados', { auth: true }),
  descargarCertificado: (c) => descargar(c.url_pdf, `certificado-${c.radicado}.pdf`),
  verificarCertificado: (codigo) => api(`/tramites/certificados/verificar/${encodeURIComponent(codigo)}`),
  radicarPqrsd: (d) => api('/tramites/pqrsd', { method: 'POST', body: d, auth: true }),
  consultarPqrsd: (radicado, documento) => api('/tramites/pqrsd/consulta', { params: { radicado, documento } }),
  misPqrsd: () => api('/tramites/pqrsd/mias', { auth: true }),
  bandejaPqrsd: (estado) => api('/tramites/admin/pqrsd', { auth: true, params: { estado } }),
  tomarPqrsd: (id) => api(`/tramites/admin/pqrsd/${id}/en-proceso`, { method: 'POST', auth: true }),
  responderPqrsd: (id, respuesta) => api(`/tramites/admin/pqrsd/${id}/responder`, { method: 'POST', body: { respuesta }, auth: true }),
});

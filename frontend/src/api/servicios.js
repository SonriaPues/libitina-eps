// Funciones que usan las páginas. Cada una llama al API real o al simulado.
import { api, USE_MOCK, getRefresh } from './client.js';
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

// Cliente HTTP hacia el API Gateway. Agrega el token JWT y lo renueva solo cuando vence.
export const BASE = import.meta.env.VITE_API_URL || '/api/v1';
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export class ApiError extends Error {
  constructor(message, status) { super(message); this.status = status; }
}

const leer = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
export const getToken = () => leer('libitina_token');
export const getRefresh = () => leer('libitina_refresh');

export function guardarSesion(s) {
  localStorage.setItem('libitina_token', s.access_token);
  if (s.refresh_token) localStorage.setItem('libitina_refresh', s.refresh_token);
  localStorage.setItem('libitina_usuario', JSON.stringify(s.usuario));
}
export function borrarSesion() {
  ['libitina_token', 'libitina_refresh', 'libitina_usuario'].forEach((k) => localStorage.removeItem(k));
}

function mensaje(data) {
  const d = data?.detail;
  if (Array.isArray(d)) return (d[0]?.msg || 'Revisa los datos del formulario.').replace('Value error, ', '');
  return d || 'Ocurrió un error al procesar la solicitud.';
}

let renovando = null;
async function renovar() {
  const refresh = getRefresh();
  if (!refresh) return false;
  renovando ??= fetch(`${BASE}/auth/refresh`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refresh_token: refresh }) })
    .then(async (r) => { if (!r.ok) return false; guardarSesion(await r.json()); return true; })
    .catch(() => false)
    .finally(() => { setTimeout(() => { renovando = null; }, 0); });
  return renovando;
}

export async function api(path, { method = 'GET', body, auth = false, reintento = true, params } = {}) {
  if (params) {
    const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''));
    if ([...q].length) path += (path.includes('?') ? '&' : '?') + q;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (auth && getToken()) headers.Authorization = `Bearer ${getToken()}`;
  let res;
  try {
    res = await fetch(`${BASE}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError('No pudimos conectar con el servidor. Revisa tu conexión e intenta de nuevo.', 0);
  }
  if (res.status === 401 && auth && reintento && (await renovar())) return api(path, { method, body, auth, reintento: false });
  if (res.status === 401 && auth) { borrarSesion(); window.dispatchEvent(new Event('libitina:sesion-expirada')); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(mensaje(data), res.status);
  return data;
}

// Descarga un archivo protegido (ej. el PDF del certificado) y lo guarda en el equipo.
export async function descargar(rutaCompleta, nombre, reintento = true) {
  const res = await fetch(rutaCompleta, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.status === 401 && reintento && (await renovar())) return descargar(rutaCompleta, nombre, false);
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(mensaje(data), res.status);
  }
  const url = URL.createObjectURL(await res.blob());
  const a = Object.assign(document.createElement('a'), { href: url, download: nombre });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

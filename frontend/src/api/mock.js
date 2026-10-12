// Backend simulado para trabajar el front sin Docker (VITE_USE_MOCK=true).
// Responde con la misma forma que el API real y guarda los datos en el navegador.
import { ApiError } from './client.js';

const KEY = 'libitina_mock_db_v2';
const espera = (ms = 350) => new Promise((r) => setTimeout(r, ms));
const hoy = () => new Date().toISOString();
const uid = () => (crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random()));
const IPS1 = 'a1b2c3d4-0000-4000-8000-000000000001';

const inicial = () => ({
  usuarios: [
    { id: 'u-admin', correo: 'admin@libitina.co', clave: 'Admin123', rol: 'admin', nombre: 'Administrador Libitina' },
    { id: 'u-laura', correo: 'laura@correo.com', clave: 'Laura123', rol: 'afiliado', nombre: 'Laura Camila Rodríguez Pérez' },
  ],
  afiliados: [{
    id: 'af-1', usuario_id: 'u-laura', email: 'laura@correo.com', estado: 'pendiente', motivo_rechazo: null, creado_en: '2026-09-20T15:14:00Z',
    tipo_documento: 'CC', numero_documento: '1012345678', nombres: 'Laura Camila', apellidos: 'Rodríguez Pérez', fecha_nacimiento: '1994-05-12',
    sexo: 'femenino', telefono: '3001234567', direccion: 'Calle 47 # 13-20', departamento: 'Bogotá D. C.', ciudad: 'Bogotá', zona: 'urbana',
    pertenencia_etnica: 'no_responde', tiene_discapacidad: null, tipo_discapacidad: null,
    regimen: 'contributivo', ips_id: IPS1, tipo_cotizante: 'dependiente', categoria: 'B', empleador_nit: '900123456-7', empleador_nombre: 'Empresa Ejemplo SAS', grupo_sisben: null,
    beneficiarios: [
      { id: 'b-1', estado: 'pendiente', parentesco: 'conyuge', tipo_documento: 'CC', numero_documento: '80123456', nombres: 'Andrés', apellidos: 'Rodríguez', fecha_nacimiento: '1992-02-01', sexo: 'masculino', incapacidad_permanente: false },
      { id: 'b-2', estado: 'pendiente', parentesco: 'hijo', tipo_documento: 'RC', numero_documento: '1098765432', nombres: 'Tomás', apellidos: 'Rodríguez', fecha_nacimiento: '2020-08-10', sexo: 'masculino', incapacidad_permanente: false },
    ],
    historial: [{ estado: 'pendiente', fecha: '2026-09-20T15:14:00Z', detalle: 'Solicitud de afiliación enviada' }],
  }],
});

function db() {
  try { const d = JSON.parse(localStorage.getItem(KEY)); if (d) return d; } catch { /* sin datos */ }
  const d = inicial(); guardar(d); return d;
}
function guardar(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* sin almacenamiento */ } }
function usuarioActual(d) {
  const t = localStorage.getItem('libitina_token') || '';
  const u = d.usuarios.find((x) => `mock.${x.id}` === t);
  if (!u) throw new ApiError('Tu sesión expiró. Inicia sesión de nuevo.', 401);
  return u;
}
const documentoUsado = (d, tipo, num, excepto = []) => d.afiliados.some((a) => [a, ...a.beneficiarios].some((p) => p.tipo_documento === tipo && p.numero_documento === num && !excepto.includes(p.id)));

export const mock = {
  ok: async () => { await espera(); return { mensaje: 'ok' }; },
  async login({ correo, clave }) {
    await espera(); const d = db();
    const u = d.usuarios.find((x) => x.correo.toLowerCase() === correo.toLowerCase() && x.clave === clave);
    if (!u) throw new ApiError('El correo o la contraseña no son correctos.', 401);
    return { access_token: `mock.${u.id}`, refresh_token: `mock-refresh.${u.id}`, usuario: { id: u.id, correo: u.correo, rol: u.rol, nombre: u.nombre, email_verificado: true } };
  },
  async inscripcion(p) {
    await espera(600); const d = db();
    if (d.usuarios.some((u) => u.correo.toLowerCase() === p.cuenta.correo.toLowerCase())) throw new ApiError('Ya existe una cuenta con ese correo.', 409);
    for (const x of [p.titular, ...p.beneficiarios]) if (documentoUsado(d, x.tipo_documento, x.numero_documento)) throw new ApiError(`El documento ${x.tipo_documento} ${x.numero_documento} ya está registrado en Libitina EPS.`, 409);
    const uidU = uid();
    d.usuarios.push({ id: uidU, correo: p.cuenta.correo, clave: p.cuenta.clave, rol: 'afiliado', nombre: `${p.titular.nombres} ${p.titular.apellidos}` });
    const a = { id: uid(), usuario_id: uidU, email: p.cuenta.correo, estado: 'pendiente', motivo_rechazo: null, creado_en: hoy(), ...p.titular, ...p.afiliacion,
      beneficiarios: p.beneficiarios.map((b) => ({ ...b, id: uid(), estado: 'pendiente' })),
      historial: [{ estado: 'pendiente', fecha: hoy(), detalle: 'Solicitud de afiliación enviada' }] };
    d.afiliados.push(a); guardar(d);
    return { afiliado_id: a.id, estado: 'pendiente' };
  },
  async miAfiliacion() {
    await espera(); const d = db(); const u = usuarioActual(d);
    const a = d.afiliados.find((x) => x.usuario_id === u.id);
    if (!a) throw new ApiError('No encontramos una afiliación asociada a tu cuenta.', 404);
    return a;
  },
  async reenviar({ titular, afiliacion, beneficiarios }) {
    await espera(); const d = db(); const u = usuarioActual(d);
    const a = d.afiliados.find((x) => x.usuario_id === u.id);
    if (a.estado !== 'rechazado') throw new ApiError('Solo puedes corregir una solicitud rechazada.', 409);
    Object.assign(a, titular, afiliacion, { estado: 'pendiente', motivo_rechazo: null });
    a.beneficiarios = beneficiarios.map((b) => ({ ...b, id: b.id || uid(), estado: 'pendiente' }));
    a.historial.push({ estado: 'pendiente', fecha: hoy(), detalle: 'Solicitud corregida y reenviada' });
    guardar(d); return a;
  },
  async solicitudes(estado) {
    await espera(); const d = db(); const u = usuarioActual(d);
    if (u.rol !== 'admin') throw new ApiError('No tienes permiso para esta acción.', 403);
    return d.afiliados.filter((a) => !estado || a.estado === estado);
  },
  async decidir(id, accion, motivo) {
    await espera(); const d = db(); usuarioActual(d);
    const a = d.afiliados.find((x) => x.id === id);
    if (a.estado !== 'pendiente') throw new ApiError('Esta solicitud ya fue revisada.', 409);
    const nuevo = accion === 'aprobar' ? 'activo' : 'rechazado';
    a.estado = nuevo; a.motivo_rechazo = accion === 'rechazar' ? motivo : null;
    a.beneficiarios.forEach((b) => { b.estado = nuevo; });
    a.historial.push({ estado: nuevo, fecha: hoy(), detalle: accion === 'aprobar' ? 'Afiliación aprobada' : `Solicitud rechazada: ${motivo}` });
    guardar(d); return a;
  },
  async consulta(tipo, numero) {
    await espera(); const d = db();
    for (const a of d.afiliados) {
      const p = [a, ...a.beneficiarios].find((x) => x.tipo_documento === tipo && x.numero_documento === numero);
      if (p) {
        const ocultar = (s) => s.split(' ').map((x) => x[0] + '***').join(' ');
        return { encontrado: true, nombre: `${p.nombres.split(' ')[0]} ${ocultar(p.apellidos)}`.toUpperCase(), regimen: a.regimen, estado: p.estado, ips_id: a.ips_id, tipo_afiliado: p === a ? 'cotizante' : 'beneficiario' };
      }
    }
    return { encontrado: false };
  },
};

export const pesos = (n) => '$' + Math.round(n).toLocaleString('es-CO');
// Una fecha sola ("2026-11-03") se lee a mediodía local: así no se corre un día por la zona horaria.
const comoFecha = (iso) => new Date(String(iso).length === 10 ? `${iso}T12:00:00` : iso);
export const fecha = (iso) => comoFecha(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
export const fechaHora = (iso) => new Date(iso).toLocaleString('es-CO', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

// Mismos valores que el tipo estado_afiliado de la base de datos
export const ESTADOS = {
  pendiente: { texto: 'Pendiente', clase: 'bg-dorado-100 text-dorado-800' },
  activo: { texto: 'Activa', clase: 'bg-azul-600 text-white' },
  rechazado: { texto: 'Rechazada', clase: 'bg-red-50 text-red-700' },
};
export const estado = (e) => ESTADOS[e] ?? { texto: e, clase: 'bg-azul-50 text-azul-800' };

export const PARENTESCOS = { conyuge: 'Cónyuge', companero_permanente: 'Compañero(a) permanente', hijo: 'Hijo(a)', padre: 'Padre', madre: 'Madre' };
export const nombreCompleto = (p) => `${p?.nombres ?? ''} ${p?.apellidos ?? ''}`.trim();
export const iniciales = (nombre = '') => nombre.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// ---------- Fechas y horas (las citas vienen como "2026-10-14" y "07:20") ----------
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const aFecha = (iso) => new Date(`${String(iso).slice(0, 10)}T12:00:00`);
export const fechaLarga = (iso) => { const d = aFecha(iso); return `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`; };
export const fechaCorta = (iso) => { const d = aFecha(iso); return { dia: DIAS[d.getDay()].slice(0, 3), num: d.getDate(), mes: MESES[d.getMonth()].slice(0, 3) }; };
export const hora12 = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'a. m.' : 'p. m.'}`; };
export const hoyIso = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10);
export const sumarDias = (iso, n) => { const d = aFecha(iso); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const edadDe = (iso) => { const n = aFecha(iso), h = new Date(); let e = h.getFullYear() - n.getFullYear(); if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--; return e; };
export const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const ESTADOS_CITA = {
  confirmada: { texto: 'Confirmada', clase: 'bg-azul-600 text-white' },
  pendiente: { texto: 'Pendiente', clase: 'bg-dorado-100 text-dorado-800' },
  realizada: { texto: 'Atendida', clase: 'bg-azul-50 text-azul-800' },
  cancelada: { texto: 'Cancelada', clase: 'bg-red-50 text-red-700' },
  no_asistio: { texto: 'No asistió', clase: 'bg-dorado-50 text-dorado-800' },
  reagendada: { texto: 'Reagendada', clase: 'bg-azul-50 text-azul-600' },
};

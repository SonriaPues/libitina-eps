export const pesos = (n) => '$' + Math.round(n).toLocaleString('es-CO');
export const fecha = (iso) => new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
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

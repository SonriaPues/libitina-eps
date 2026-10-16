// Utilidades compartidas por las mallas de horarios.
export const INICIO = 6 * 60;           // 6:00 a. m.
export const FIN = 21 * 60;             // 9:00 p. m.
export const PASO = 30;                 // los turnos se mueven de a 30 minutos
export const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const deMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
export const ajustar = (m) => Math.min(FIN, Math.max(INICIO, Math.round(m / PASO) * PASO));
export const horaCorta = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'a' : 'p'}`; };
export const diaSemana = (iso) => (new Date(`${iso}T12:00:00`).getDay() + 6) % 7;     // 0 = lunes
export const bloqueadoEn = (excepciones, doctorId, iso) => excepciones.find((e) => e.doctor_id === doctorId && e.fecha_inicio <= iso && iso <= e.fecha_fin);
export const OPCIONES_HORA = Array.from({ length: (FIN - INICIO) / PASO + 1 }, (_, i) => deMin(INICIO + i * PASO));

// Un color por especialidad (fondo claro + trazo), para leer la malla de un vistazo.
const COLORES = {
  medicina_general: ['#DCEAF7', '#075699'], odontologia: ['#D5F2EE', '#0F766E'], pediatria: ['#FDEBD0', '#B45309'],
  ginecologia: ['#FCE1EE', '#BE185D'], medicina_interna: ['#E3E2FB', '#4338CA'], cardiologia: ['#FBE0E0', '#B91C1C'],
  dermatologia: ['#FAF0C8', '#8F690C'], ortopedia: ['#E4E9EF', '#475569'], oftalmologia: ['#D7F2E6', '#047857'], psicologia: ['#EEDFFB', '#7E22CE'],
};
const EXTRA = [['#E6EEF6', '#2F70A8'], ['#F1E9DA', '#8A5A00'], ['#E0F0F4', '#0E7490']];
export const colorDe = (codigo = '') => COLORES[codigo] ?? EXTRA[[...codigo].reduce((a, c) => a + c.charCodeAt(0), 0) % EXTRA.length];
export const RAYADO = 'repeating-linear-gradient(135deg, #F3F5F8 0 6px, #E4E9EF 6px 12px)';

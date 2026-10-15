import { ESTADOS_CITA } from '../../utils/formato.js';

// Piezas pequeñas que comparten los portales.
export const EstadoCita = ({ estado }) => {
  const e = ESTADOS_CITA[estado] ?? { texto: estado, clase: 'bg-azul-50 text-azul-800' };
  return <span className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${e.clase}`}>{e.texto}</span>;
};

export const Vacio = ({ titulo, texto, children }) => (
  <div className="flex flex-col items-center gap-2 rounded-[18px] border border-dashed border-azul-200 bg-white px-6 py-10 text-center">
    <span className="font-display text-lg font-bold text-azul-900">{titulo}</span>
    {texto && <span className="max-w-md text-[15px] leading-relaxed text-azul-600">{texto}</span>}
    {children}
  </div>
);

export const Cargando = ({ texto = 'Cargando…' }) => <p className="py-6 text-[15px] text-azul-500" role="status">{texto}</p>;

export const Dato = ({ k, v }) => (
  <div className="flex flex-col gap-0.5"><dt className="text-xs tracking-wide text-dorado-600">{k}</dt><dd className="text-[15px] text-azul-900">{v || '—'}</dd></div>
);

export const Insignia = ({ children, tono = 'azul' }) => {
  const c = { azul: 'bg-azul-50 text-azul-800', dorado: 'bg-dorado-100 text-dorado-800', rojo: 'bg-red-50 text-red-700', verde: 'bg-emerald-50 text-emerald-800' }[tono];
  return <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${c}`}>{children}</span>;
};

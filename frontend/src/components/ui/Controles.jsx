// Controles reutilizables: segmentado, chips, acordeón, campo con etiqueta y alertas.
import { useId } from 'react';

export function Segmentado({ opciones, valor, onCambio, className = '' }) {
  return (
    <div className={`flex rounded-xl bg-azul-50 p-1 ${className}`} role="tablist">
      {opciones.map(([v, t]) => (
        <button key={v} type="button" role="tab" aria-selected={valor === v} onClick={() => onCambio(v)}
          className={`h-11 flex-1 rounded-lg px-4 text-[15px] font-semibold transition-colors ${valor === v ? 'bg-white text-azul-900 shadow-sm' : 'text-azul-500 hover:text-azul-700'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function Chips({ opciones, valor, onCambio }) {
  return (
    <div className="flex flex-wrap gap-2">
      {opciones.map(([v, t]) => (
        <button key={v} type="button" aria-pressed={valor === v} onClick={() => onCambio(v)}
          className={`h-10 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors ${valor === v ? 'border-azul-600 bg-azul-600 text-white' : 'border-azul-200 bg-white text-azul-700 hover:border-azul-400'}`}>
          {t}
        </button>
      ))}
    </div>
  );
}

export function Acordeon({ items, abierto, onAbrir, conCategoria = false }) {
  return (
    <div>
      {items.map((it, i) => {
        const open = abierto === it.id;
        return (
          <div key={it.id} className={i < items.length - 1 ? 'border-b border-azul-100' : ''}>
            <button type="button" aria-expanded={open} onClick={() => onAbrir(open ? null : it.id)}
              className="flex w-full items-center justify-between gap-5 py-6 text-left">
              <span className="flex flex-col gap-1">
                {conCategoria && <span className="text-xs font-semibold tracking-wide text-dorado-600">{it.cat}</span>}
                <span className="font-display text-lg font-bold text-azul-900">{it.q}</span>
              </span>
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xl transition-colors ${open ? 'bg-azul-600 text-white' : 'bg-azul-50 text-azul-600'}`}>{open ? '−' : '+'}</span>
            </button>
            {open && <p className="pb-6 pr-14 text-base leading-relaxed text-azul-700">{it.a}</p>}
          </div>
        );
      })}
    </div>
  );
}

export function Campo({ etiqueta, ayuda, error, children, className = '' }) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="etiqueta">{etiqueta}</label>
      {children(id)}
      {error ? <span className="text-[13px] text-red-700">{error}</span> : ayuda && <span className="text-[13px] text-azul-500">{ayuda}</span>}
    </div>
  );
}

export function Alerta({ tipo = 'error', children }) {
  const c = tipo === 'error' ? 'bg-red-50 text-red-800' : tipo === 'exito' ? 'bg-azul-50 text-azul-800' : 'bg-dorado-50 text-dorado-800';
  return <div role={tipo === 'error' ? 'alert' : 'status'} className={`rounded-[10px] px-4 py-3 text-sm ${c}`}>{children}</div>;
}

export function Chequeo({ className = 'text-dorado-400' }) {
  return <span className={`font-extrabold ${className}`} aria-hidden="true">✓</span>;
}

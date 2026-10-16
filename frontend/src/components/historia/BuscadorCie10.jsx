import { useEffect, useRef, useState } from 'react';
import { buscarCie10 } from '../../data/cie10.js';

// Campo de diagnóstico: el médico escribe el código o parte del nombre y elige una sugerencia.
// Al elegir, se llenan el código y la descripción. También acepta códigos que no estén en la lista.
export default function BuscadorCie10({ codigo, descripcion, onCambio, error }) {
  const [texto, setTexto] = useState(codigo ? `${codigo}${descripcion ? ` · ${descripcion}` : ''}` : '');
  const [abierto, setAbierto] = useState(false);
  const [activo, setActivo] = useState(0);
  const caja = useRef(null);
  const sugerencias = abierto ? buscarCie10(texto) : [];

  useEffect(() => {
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    return () => document.removeEventListener('mousedown', fuera);
  }, []);

  const elegir = ([c, n]) => { setTexto(`${c} · ${n}`); onCambio(c, n); setAbierto(false); };
  const escribir = (v) => {
    setTexto(v); setAbierto(true); setActivo(0);
    const m = v.trim().match(/^([A-Za-z][0-9]{2}(?:\.[0-9A-Za-z]{1,4})?)\s*(?:·\s*(.*))?$/);   // escrito a mano: "I10 · Hipertensión"
    onCambio(m ? m[1].toUpperCase() : '', m ? (m[2] ?? descripcion ?? '') : '');
  };
  const tecla = (e) => {
    if (!sugerencias.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActivo((activo + 1) % sugerencias.length); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActivo((activo - 1 + sugerencias.length) % sugerencias.length); }
    if (e.key === 'Enter') { e.preventDefault(); elegir(sugerencias[activo]); }
    if (e.key === 'Escape') setAbierto(false);
  };

  return (
    <div className="relative flex flex-col gap-1.5" ref={caja}>
      <label htmlFor="cie10" className="etiqueta">Diagnóstico CIE-10</label>
      <input id="cie10" className="campo" autoComplete="off" role="combobox" aria-expanded={sugerencias.length > 0} aria-controls="cie10-lista"
        placeholder="Escribe el código o el nombre: I10, hipertensión, lumbago…" value={texto}
        onChange={(e) => escribir(e.target.value)} onFocus={() => setAbierto(true)} onKeyDown={tecla} />
      {error ? <span className="text-[13px] text-red-700">{error}</span>
        : <span className="text-[13px] text-azul-500">{codigo ? <>Código <strong className="font-mono">{codigo}</strong>{descripcion && ` · ${descripcion}`}</> : 'Elige una sugerencia o escribe "CÓDIGO · descripción".'}</span>}
      {sugerencias.length > 0 && (
        <ul id="cie10-lista" role="listbox" className="absolute left-0 right-0 top-[76px] z-30 max-h-72 overflow-y-auto rounded-xl border border-azul-100 bg-white py-1 shadow-xl">
          {sugerencias.map(([c, n], i) => (
            <li key={c} role="option" aria-selected={i === activo} onMouseDown={(e) => { e.preventDefault(); elegir([c, n]); }} onMouseEnter={() => setActivo(i)}
              className={`flex cursor-pointer items-baseline gap-3 px-3.5 py-2 text-sm ${i === activo ? 'bg-azul-50' : ''}`}>
              <span className="w-14 shrink-0 font-mono font-bold text-azul-600">{c}</span><span>{n}</span>
            </li>))}
        </ul>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';

// Muestra solo el símbolo del archivo MiniLogoSVG.svg (sin modificar el archivo):
// el texto que trae por dentro sería ilegible en tamaños pequeños, así que se
// recorta con un contenedor y el nombre se escribe al lado como texto real.
export function Monograma({ alto = 48, className = '' }) {
  const s = alto / 320; // la zona del símbolo mide 300 × 320 unidades del viewBox 500 × 500
  return (
    <span className={`relative inline-block shrink-0 overflow-hidden ${className}`} style={{ width: 300 * s, height: alto }} aria-hidden="true">
      <img src="/logo/MiniLogoSVG.svg" alt="" className="absolute max-w-none" style={{ width: 500 * s, height: 500 * s, left: -130 * s, top: -25 * s }} />
    </span>
  );
}

export function Marca({ alto = 48, claro = false, conPlaca = false, texto = 'text-[22px]' }) {
  return (
    <Link to="/" className="flex items-center gap-3" aria-label="Libitina EPS, ir al inicio">
      {conPlaca ? (
        <span className="flex items-center justify-center rounded-xl bg-white p-1.5"><Monograma alto={alto} /></span>
      ) : (
        <Monograma alto={alto} />
      )}
      <span className={`font-display font-extrabold tracking-[0.5px] ${texto} ${claro ? 'text-white' : 'text-marca'}`}>
        LIBITINA <span className={claro ? 'text-dorado-400' : 'text-dorado-500'}>EPS</span>
      </span>
    </Link>
  );
}

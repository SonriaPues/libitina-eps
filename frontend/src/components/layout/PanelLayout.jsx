import { Link } from 'react-router-dom';
import { Marca } from '../ui/Marca.jsx';
import MenuUsuario from './MenuUsuario.jsx';

// Estructura tipo dashboard para el portal del afiliado (claro), del doctor y del administrador (oscuros).
// La cuenta y "Cerrar sesión" van siempre arriba a la derecha.
export default function PanelLayout({ oscuro = false, etiqueta = null, menu, children }) {
  return (
    <div className="flex min-h-screen flex-col bg-fondo lg:flex-row">
      <aside className={`flex shrink-0 flex-col gap-5 px-4 py-4 lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:gap-7 lg:py-6 ${oscuro ? 'bg-azul-950' : 'border-b border-azul-100 bg-white lg:border-b-0 lg:border-r'}`}>
        <div className="flex items-center justify-between gap-3 px-2">
          <Link to="/" className="flex flex-col" aria-label="Ir al inicio">
            <Marca alto={36} claro={oscuro} conPlaca={oscuro} texto="text-[17px]" />
            {oscuro && <span className="mt-1 block pl-[60px] text-xs text-azul-200">{etiqueta || 'Administración'}</span>}
          </Link>
          <div className="lg:hidden"><MenuUsuario oscuro={oscuro} /></div>
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-y-auto" aria-label="Panel">
          {menu.map((m) => (
            <Link key={m.texto} to={m.ruta || '#'} aria-current={m.activo ? 'page' : undefined}
              className={`flex shrink-0 items-center justify-between gap-3 rounded-[10px] px-3.5 py-3 text-[15px] ${m.activo
                ? (oscuro ? 'bg-azul-800 font-semibold text-white' : 'bg-azul-50 font-semibold text-azul-900')
                : (oscuro ? 'text-azul-200 hover:bg-azul-900' : 'text-azul-700 hover:bg-azul-50')}`}>
              <span className="flex items-center gap-3">{m.icono}{m.texto}</span>
              {m.contador != null && <span className="rounded-full bg-dorado-400 px-2 text-xs font-bold text-azul-950">{m.contador}</span>}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 hidden h-16 items-center justify-end border-b border-azul-100 bg-white/90 px-10 backdrop-blur lg:flex">
          <MenuUsuario />
        </header>
        <main className="flex-1 px-5 py-8 md:px-10 lg:px-12">{children}</main>
      </div>
    </div>
  );
}

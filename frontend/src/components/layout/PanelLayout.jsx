import { Link, useNavigate } from 'react-router-dom';
import { Marca } from '../ui/Marca.jsx';
import { Icono } from '../ui/Iconos.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

// Estructura tipo dashboard para el portal del afiliado (claro) y el panel de admin (oscuro).
export default function PanelLayout({ oscuro = false, etiqueta = null, menu, children }) {
  const { cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const salir = () => { cerrarSesion(); navigate('/iniciar-sesion'); };
  return (
    <div className="flex min-h-screen flex-col bg-fondo lg:flex-row">
      <aside className={`flex shrink-0 flex-col gap-7 px-4 py-6 lg:min-h-screen lg:w-64 ${oscuro ? 'bg-azul-950' : 'border-b border-azul-100 bg-white lg:border-b-0 lg:border-r'}`}>
        <div className="px-2">
          <Marca alto={36} claro={oscuro} conPlaca={oscuro} texto="text-[17px]" />
          {oscuro && <span className="mt-1 block pl-[60px] text-xs text-azul-200">{etiqueta || 'Administración'}</span>}
        </div>
        <nav className="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Panel">
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
        <button type="button" onClick={salir} className={`mt-auto hidden items-center gap-3 px-3.5 py-3 text-left text-[15px] lg:flex ${oscuro ? 'text-azul-200 hover:text-white' : 'text-azul-700 hover:text-azul-900'}`}>
          <Icono.salir width={20} height={20} />Cerrar sesión
        </button>
      </aside>
      <main className="flex-1 px-5 py-8 md:px-10 lg:px-12">
        {children}
        <button type="button" onClick={salir} className="mt-8 text-sm font-semibold text-azul-600 lg:hidden">Cerrar sesión</button>
      </main>
    </div>
  );
}

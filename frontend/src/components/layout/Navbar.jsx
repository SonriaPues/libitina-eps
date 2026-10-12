import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Marca } from '../ui/Marca.jsx';
import { Icono } from '../ui/Iconos.jsx';
import { MENU } from '../../data/sitio.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const [abierto, setAbierto] = useState(false);
  const { pathname } = useLocation();
  const { usuario } = useAuth();
  const activo = (item) => pathname === item.ruta || item.hijos?.some((h) => pathname.startsWith(h.ruta.split('/').slice(0, 3).join('/')) && h.ruta !== '/');

  const destinoPortal = usuario?.rol === 'admin' ? '/admin' : '/portal';

  return (
    <header className="sticky top-0 z-40 border-b border-azul-100 bg-white/95 backdrop-blur">
      <div className="contenedor flex items-center justify-between gap-8 py-3.5">
        <Marca alto={48} />
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Principal">
          {MENU.map((item) => (
            <div key={item.texto} className="group relative">
              <NavLink to={item.ruta}
                className={`border-b-2 pb-1 text-[15px] font-medium transition-colors ${activo(item) ? 'border-dorado-400 font-bold text-azul-600' : 'border-transparent text-azul-900 hover:text-azul-600'}`}>
                {item.texto}
              </NavLink>
              {item.hijos && (
                <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-4 opacity-0 transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                  <div className="flex flex-col rounded-2xl border border-azul-100 bg-white p-2 shadow-xl shadow-azul-950/10">
                    {item.hijos.map((h) => (
                      <Link key={h.ruta} to={h.ruta} className="rounded-lg px-3.5 py-2.5 text-sm text-azul-800 hover:bg-azul-50">{h.texto}</Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>
        <div className="hidden gap-2.5 lg:flex">
          {usuario ? (
            <Link to={destinoPortal} className="btn-primario px-5 py-3 text-sm">Mi portal</Link>
          ) : (
            <>
              <Link to="/iniciar-sesion" className="btn-borde px-5 py-3 text-sm">Iniciar sesión</Link>
              <Link to="/inscripcion" className="btn-primario px-5 py-3 text-sm">Afíliate</Link>
            </>
          )}
        </div>
        <button type="button" className="rounded-lg p-2 text-azul-900 lg:hidden" onClick={() => setAbierto(!abierto)} aria-expanded={abierto} aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}>
          {abierto ? <Icono.cerrar /> : <Icono.menu />}
        </button>
      </div>
      {abierto && (
        <div className="border-t border-azul-100 bg-white lg:hidden">
          <nav className="contenedor flex flex-col gap-1 py-4" aria-label="Principal móvil" onClick={() => setAbierto(false)}>
            {MENU.flatMap((item) => (item.hijos ? [{ ...item, titulo: true }, ...item.hijos] : [item])).map((it, i) =>
              it.titulo ? (
                <span key={i} className="px-3 pt-3 text-xs font-semibold tracking-wide text-dorado-600">{it.texto}</span>
              ) : (
                <Link key={i} to={it.ruta} className="rounded-lg px-3 py-2.5 text-[15px] text-azul-900 hover:bg-azul-50">{it.texto}</Link>
              )
            )}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Link to="/iniciar-sesion" className="btn-borde py-3 text-sm">Iniciar sesión</Link>
              <Link to="/inscripcion" className="btn-primario py-3 text-sm">Afíliate</Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}

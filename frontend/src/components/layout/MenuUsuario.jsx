import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Icono } from '../ui/Iconos.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

const ROL = { afiliado: 'Afiliado', doctor: 'Profesional de la salud', admin: 'Administrador' };
const iniciales = (n = '') => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();

// Menú de la cuenta (arriba a la derecha): nombre, rol y cerrar sesión.
export default function MenuUsuario({ oscuro = false }) {
  const { usuario, cerrarSesion } = useAuth();
  const navigate = useNavigate();
  const [abierto, setAbierto] = useState(false);
  const caja = useRef(null);

  useEffect(() => {
    if (!abierto) return undefined;
    const fuera = (e) => { if (caja.current && !caja.current.contains(e.target)) setAbierto(false); };
    const tecla = (e) => { if (e.key === 'Escape') setAbierto(false); };
    document.addEventListener('mousedown', fuera);
    document.addEventListener('keydown', tecla);
    return () => { document.removeEventListener('mousedown', fuera); document.removeEventListener('keydown', tecla); };
  }, [abierto]);

  const salir = async () => { setAbierto(false); await cerrarSesion(); navigate('/iniciar-sesion'); };
  if (!usuario) return null;
  const nombre = usuario.nombre || usuario.correo;

  return (
    <div className="relative" ref={caja}>
      <button type="button" onClick={() => setAbierto(!abierto)} aria-haspopup="menu" aria-expanded={abierto}
        className={`flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-left transition ${oscuro ? 'text-white hover:bg-azul-900' : 'text-azul-900 hover:bg-azul-50'}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-dorado-400 font-display text-sm font-extrabold text-azul-950">{iniciales(nombre)}</span>
        <span className="hidden flex-col leading-tight sm:flex">
          <span className="max-w-[200px] truncate text-sm font-semibold">{nombre}</span>
          <span className={`text-xs ${oscuro ? 'text-azul-200' : 'text-azul-500'}`}>{ROL[usuario.rol]}</span>
        </span>
        <Icono.flechaAbajo width={16} height={16} className={`transition ${abierto ? 'rotate-180' : ''}`} />
      </button>
      {abierto && (
        <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 overflow-hidden rounded-2xl border border-azul-100 bg-white text-azul-900 shadow-xl shadow-azul-950/10">
          <div className="flex flex-col gap-0.5 border-b border-azul-50 px-4 py-3.5">
            <span className="truncate font-semibold">{nombre}</span>
            <span className="truncate text-sm text-azul-500">{usuario.correo}</span>
            <span className="mt-1 w-fit rounded-full bg-azul-50 px-2.5 py-0.5 text-xs font-semibold text-azul-700">{ROL[usuario.rol]}</span>
          </div>
          <Link role="menuitem" to="/" onClick={() => setAbierto(false)} className="flex items-center gap-3 px-4 py-3 text-[15px] hover:bg-azul-50">
            <Icono.casa width={18} height={18} />Ir al sitio de Libitina
          </Link>
          <button role="menuitem" type="button" onClick={salir} className="flex w-full items-center gap-3 border-t border-azul-50 px-4 py-3 text-left text-[15px] font-semibold text-red-700 hover:bg-red-50">
            <Icono.salir width={18} height={18} />Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

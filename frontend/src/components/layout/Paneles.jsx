import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { citasApi } from '../../api/servicios.js';
import PanelLayout from './PanelLayout.jsx';
import { Icono } from '../ui/Iconos.jsx';

// Menú de cada rol. La opción activa se calcula con la ruta actual.
const i = (I) => <I width={20} height={20} />;
const MENUS = {
  afiliado: [
    ['Resumen', '/portal', Icono.casa],
    ['Mis citas', '/portal/citas', Icono.calendario],
    ['Historia clínica', '/portal/historia', Icono.historia],
    ['Certificados', '/portal/certificados', Icono.certificado],
    ['Mis PQRSD', '/portal/pqrsd', Icono.mensaje],
    ['Red de IPS', '/red-de-ips', Icono.ubicacion],
  ],
  doctor: [
    ['Inicio', '/doctor', Icono.casa],
    ['Mi agenda', '/doctor/agenda', Icono.calendario],
    ['Mis pacientes', '/doctor/pacientes', Icono.familia],
    ['Remisiones', '/doctor/remisiones', Icono.documento],
    ['Ausencias', '/doctor/ausencias', Icono.reloj],
    ['Mi perfil', '/mi-cuenta', Icono.persona],
  ],
  admin: [
    ['Afiliaciones', '/admin', Icono.familia],
    ['Doctores y agendas', '/admin/doctores', Icono.doctor],
    ['Horarios', '/admin/horarios', Icono.malla],
    ['Ausencias', '/admin/ausencias', Icono.reloj],
    ['Especialidades', '/admin/especialidades', Icono.estrella],
    ['PQRSD', '/admin/pqrsd', Icono.bandeja],
    ['Red de IPS', '/red-de-ips', Icono.ubicacion],
  ],
};

// Solicitudes de ausencia por responder: el contador del menú del administrador.
function useAusenciasPendientes(activo) {
  const [n, setN] = useState(null);
  useEffect(() => {
    if (!activo) return undefined;
    const cargar = () => citasApi.cuentaAusencias().then((r) => setN(r.pendientes || null)).catch(() => {});
    cargar();
    window.addEventListener('libitina:contadores', cargar);
    return () => window.removeEventListener('libitina:contadores', cargar);
  }, [activo]);
  return n;
}

function Panel({ rol, contadores = {}, children }) {
  const { pathname: ruta } = useLocation();
  const pathname = ruta.startsWith('/doctor/citas/') ? '/doctor/agenda' : ruta;     // la atención de una cita cuelga de la agenda
  const ausencias = useAusenciasPendientes(rol === 'admin');
  if (rol === 'admin' && ausencias) contadores = { ...contadores, '/admin/ausencias': ausencias };
  const opciones = MENUS[rol];
  // La opción activa es la de ruta más larga que coincide (así /admin/doctores/x marca "Doctores")
  const activa = opciones.map((o) => o[1]).filter((r) => pathname === r || pathname.startsWith(`${r}/`)).sort((a, b) => b.length - a.length)[0];
  const menu = opciones.map(([texto, ruta, I]) => ({ texto, ruta, icono: i(I), activo: ruta === activa, contador: contadores[ruta] }));
  return <PanelLayout oscuro={rol !== 'afiliado'} etiqueta={rol === 'doctor' ? 'Portal del doctor' : rol === 'admin' ? 'Administración' : null} menu={menu}>{children}</PanelLayout>;
}

export const PanelAfiliado = (p) => <Panel rol="afiliado" {...p} />;
export const PanelDoctor = (p) => <Panel rol="doctor" {...p} />;
export const PanelAdministrador = (p) => <Panel rol="admin" {...p} />;

// Encabezado común de las páginas de los paneles
export function TituloPanel({ antetitulo, titulo, children }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1.5">{antetitulo && <span className="antetitulo">{antetitulo}</span>}<h1 className="text-3xl font-extrabold">{titulo}</h1></div>
      {children}
    </div>
  );
}

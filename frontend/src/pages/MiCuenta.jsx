import { useState } from 'react';
import { PanelAdministrador, PanelAfiliado, PanelDoctor, TituloPanel } from '../components/layout/Paneles.jsx';
import { Alerta, Campo } from '../components/ui/Controles.jsx';
import { Dato } from '../components/ui/Piezas.jsx';
import { authApi, citasApi, redApi } from '../api/servicios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useDatos } from '../utils/useDatos.js';
import { claveSegura } from '../utils/validaciones.js';
import { DIAS_SEMANA, fecha, hora12 } from '../utils/formato.js';

const PANEL = { afiliado: PanelAfiliado, doctor: PanelDoctor, admin: PanelAdministrador };
const ROL = { afiliado: 'Afiliado', doctor: 'Profesional de la salud', admin: 'Administrador' };

function PerfilProfesional() {
  const perfil = useDatos(() => Promise.all([redApi.miPerfil(), citasApi.mallaDoctor(), redApi.sedes()]));
  if (perfil.error) return <Alerta>{perfil.error}</Alerta>;
  if (!perfil.datos) return null;
  const [p, malla, sedes] = perfil.datos;
  const sede = (id) => sedes.find((s) => s.id === id)?.nombre ?? '—';
  return (
    <>
      <section className="tarjeta flex flex-col gap-4 p-6">
        <h2 className="text-lg font-extrabold">Datos profesionales</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          <Dato k="Especialidad" v={p.especialidad} /><Dato k="Tarjeta profesional" v={p.tarjeta_profesional} /><Dato k="Documento" v={p.documento} />
          <Dato k="Universidad" v={`${p.universidad} (${p.anio_graduacion})`} /><Dato k="Sede principal" v={sede(p.sede_principal_id)} />
          <Dato k="Vinculación" v={`${p.tipo_vinculacion === 'planta' ? 'Planta' : 'Contratista'} desde el ${fecha(p.fecha_ingreso)}`} />
        </dl>
        <p className="text-xs text-azul-500">Si algún dato está mal, pídele a la administración que lo corrija.</p>
      </section>
      <section className="tarjeta flex flex-col gap-3 p-6">
        <h2 className="text-lg font-extrabold">Mis turnos semanales</h2>
        {malla.turnos.length === 0 && <span className="text-sm text-azul-600">Todavía no tienes turnos asignados.</span>}
        <ul className="flex flex-col gap-2">{malla.turnos.map((t) => (
          <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-xl bg-azul-50 px-4 py-2.5 text-sm"><span className="w-24 font-semibold">{DIAS_SEMANA[t.dia_semana]}</span>
            <span className="text-right">{hora12(t.hora_inicio)} – {hora12(t.hora_fin)} · {sede(t.punto_atencion_id)}</span></li>))}</ul>
      </section>
    </>
  );
}

// Mi cuenta: datos de la sesión, cambio de contraseña y (para doctores) el perfil profesional.
export default function MiCuenta() {
  const { usuario, iniciarSesion } = useAuth();
  const Panel = PANEL[usuario?.rol] ?? PanelAfiliado;
  const [f, setF] = useState({ actual: '', nueva: '', nueva2: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function cambiar(e) {
    e.preventDefault();
    if (!claveSegura(f.nueva)) return setError('La nueva contraseña necesita mínimo 8 caracteres, una mayúscula y un número.');
    if (f.nueva !== f.nueva2) return setError('Las contraseñas nuevas no coinciden.');
    setEnviando(true); setError(''); setAviso('');
    try {
      await authApi.cambiarClave(f.actual, f.nueva);
      await iniciarSesion(usuario.correo, f.nueva);     // sesión nueva con la nueva contraseña
      setAviso('Cambiamos tu contraseña. Cerramos las sesiones que tenías abiertas en otros dispositivos.');
      setF({ actual: '', nueva: '', nueva2: '' });
    } catch (err) { setError(err.message); } finally { setEnviando(false); }
  }

  return (
    <Panel>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Mi cuenta" titulo={usuario?.rol === 'doctor' ? 'Mi perfil' : 'Mi cuenta'} />
        <div className="grid items-start gap-5 lg:grid-cols-5">
          <div className="flex flex-col gap-5 lg:col-span-3">
            <section className="tarjeta flex flex-col gap-4 p-6">
              <h2 className="text-lg font-extrabold">Tu cuenta</h2>
              <dl className="grid gap-4 sm:grid-cols-2"><Dato k="Nombre" v={usuario?.nombre} /><Dato k="Rol" v={ROL[usuario?.rol]} /><div className="sm:col-span-2 break-all"><Dato k="Correo" v={usuario?.correo} /></div></dl>
            </section>
            {usuario?.rol === 'doctor' && <PerfilProfesional />}
          </div>
          <form onSubmit={cambiar} className="tarjeta flex flex-col gap-4 p-6 lg:col-span-2" noValidate>
            <h2 className="text-lg font-extrabold">Cambiar contraseña</h2>
            <Campo etiqueta="Contraseña actual">{(i) => <input id={i} type="password" autoComplete="current-password" className="campo" value={f.actual} onChange={(e) => setF({ ...f, actual: e.target.value })} />}</Campo>
            <Campo etiqueta="Nueva contraseña" ayuda="Mínimo 8 caracteres, con una mayúscula y un número.">{(i) => <input id={i} type="password" autoComplete="new-password" className="campo" value={f.nueva} onChange={(e) => setF({ ...f, nueva: e.target.value })} />}</Campo>
            <Campo etiqueta="Confirma la nueva contraseña">{(i) => <input id={i} type="password" autoComplete="new-password" className="campo" value={f.nueva2} onChange={(e) => setF({ ...f, nueva2: e.target.value })} />}</Campo>
            {error && <Alerta>{error}</Alerta>}
            {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
            <button type="submit" disabled={enviando || !f.actual} className="btn-primario self-end px-6">{enviando ? 'Guardando…' : 'Cambiar contraseña'}</button>
          </form>
        </div>
      </div>
    </Panel>
  );
}

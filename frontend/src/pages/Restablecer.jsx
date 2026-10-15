import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PaginaSimple from '../components/layout/PaginaSimple.jsx';
import { Campo, Alerta } from '../components/ui/Controles.jsx';
import { authApi } from '../api/servicios.js';
import { claveSegura } from '../utils/validaciones.js';

export default function Restablecer() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const nuevo = params.get('nuevo') === '1';
  const [clave, setClave] = useState('');
  const [clave2, setClave2] = useState('');
  const [error, setError] = useState('');
  const [listo, setListo] = useState(false);
  const [cargando, setCargando] = useState(false);

  async function guardar(e) {
    e.preventDefault();
    if (!claveSegura(clave)) return setError('Usa mínimo 8 caracteres, con al menos una mayúscula y un número.');
    if (clave !== clave2) return setError('Las contraseñas no coinciden.');
    setCargando(true); setError('');
    try { await authApi.confirmarRecuperacion(token, clave); setListo(true); } catch (err) { setError(err.message); } finally { setCargando(false); }
  }

  if (!token) return (
    <PaginaSimple>
      <h1 className="text-[26px] font-extrabold">El enlace está incompleto</h1>
      <p className="text-[15px] leading-relaxed text-azul-700">Ábrelo de nuevo desde el correo o solicita uno nuevo.</p>
      <Link to="/iniciar-sesion" className="btn-borde h-[52px]">Solicitar un enlace nuevo</Link>
    </PaginaSimple>
  );

  return (
    <PaginaSimple>
      {listo ? <>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-dorado-100 text-2xl text-dorado-700">✓</span>
        <h1 className="text-[26px] font-extrabold">{nuevo ? 'Tu cuenta quedó lista' : 'Tu contraseña se actualizó'}</h1>
        <p className="text-[15px] leading-relaxed text-azul-700">{nuevo ? 'Ya puedes entrar con tu correo y la contraseña que acabas de crear.' : 'Por seguridad cerramos tus otras sesiones. Ya puedes entrar con tu nueva contraseña.'}</p>
        <Link to="/iniciar-sesion" className="btn-primario h-[52px]">Iniciar sesión</Link>
      </> : (
        <form onSubmit={guardar} className="flex flex-col gap-5" noValidate>
          <div className="flex flex-col gap-1.5"><h1 className="text-[28px] font-extrabold">{nuevo ? 'Crea tu contraseña' : 'Crea una nueva contraseña'}</h1><span className="text-[15px] text-azul-700">Mínimo 8 caracteres, con al menos una mayúscula y un número.</span></div>
          <Campo etiqueta="Nueva contraseña">{(i) => <input id={i} type="password" autoComplete="new-password" className="campo" value={clave} onChange={(e) => { setClave(e.target.value); setError(''); }} />}</Campo>
          <Campo etiqueta="Confirma la contraseña">{(i) => <input id={i} type="password" autoComplete="new-password" className="campo" value={clave2} onChange={(e) => { setClave2(e.target.value); setError(''); }} />}</Campo>
          {error && <Alerta>{error}</Alerta>}
          <button type="submit" disabled={cargando} className="btn-primario h-[52px] text-base font-bold">{cargando ? 'Guardando…' : 'Guardar contraseña'}</button>
        </form>
      )}
    </PaginaSimple>
  );
}

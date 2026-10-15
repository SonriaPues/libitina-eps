import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Marca } from '../components/ui/Marca.jsx';
import { Campo, Alerta } from '../components/ui/Controles.jsx';
import { INICIO_POR_ROL } from '../components/layout/ProtectedRoute.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { authApi } from '../api/servicios.js';
import { USE_MOCK } from '../api/client.js';
import { correoValido } from '../utils/validaciones.js';

export default function Login() {
  const [vista, setVista] = useState('login');
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const { iniciarSesion } = useAuth();
  const navigate = useNavigate();

  async function entrar(e) {
    e.preventDefault();
    if (!correo || !clave) { setError('Escribe tu correo y tu contraseña para continuar.'); return; }
    setCargando(true); setError('');
    try {
      const u = await iniciarSesion(correo, clave);
      navigate(INICIO_POR_ROL[u.rol] ?? '/');
    } catch (err) { setError(err.message); } finally { setCargando(false); }
  }

  async function recuperar(e) {
    e.preventDefault();
    if (!correoValido(correo)) { setError('Escribe un correo válido.'); return; }
    setCargando(true); setError('');
    try { await authApi.recuperar(correo); setVista('enviado'); } catch (err) { setError(err.message); } finally { setCargando(false); }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-azul-900">
      <img src="/images/login/login-fondo.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-azul-950/85 via-azul-950/60 to-azul-950/40" />
      <div className="relative flex min-h-screen flex-col px-5 py-8 md:px-16 lg:px-20">
        <Marca alto={40} claro conPlaca texto="text-xl" />
        <div className="flex flex-1 flex-col items-center justify-center gap-12 py-10 lg:flex-row lg:justify-between">
          <div className="hidden max-w-[520px] flex-col gap-5 lg:flex">
            <span className="text-[13px] font-semibold tracking-[2px] text-dorado-400">Portal Libitina</span>
            <h1 className="text-[50px] font-extrabold leading-[1.1] tracking-tight text-white">Tu salud y la de tu familia, en un solo lugar</h1>
            <p className="text-[17px] leading-relaxed text-azul-100">Consulta el estado de tu afiliación, tus beneficiarios y tus trámites cuando lo necesites.</p>
          </div>
          <div className="w-full max-w-[460px] rounded-3xl bg-white p-8 md:p-10">
            {vista === 'login' && (
              <form onSubmit={entrar} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col gap-1.5"><h2 className="text-[28px] font-extrabold">Inicia sesión</h2><span className="text-[15px] text-azul-700">Afiliados y administradores entran por aquí.</span></div>
                <Campo etiqueta="Correo electrónico">{(id) => <input id={id} type="email" autoComplete="email" className="campo" placeholder="laura@correo.com" value={correo} onChange={(e) => { setCorreo(e.target.value.trim()); setError(''); }} />}</Campo>
                <div className="flex flex-col gap-2">
                  <div className="flex items-baseline justify-between"><label htmlFor="clave" className="etiqueta">Contraseña</label>
                    <button type="button" onClick={() => { setVista('recuperar'); setError(''); }} className="text-sm font-semibold text-azul-600">¿La olvidaste?</button></div>
                  <input id="clave" type="password" autoComplete="current-password" className="campo" value={clave} onChange={(e) => { setClave(e.target.value); setError(''); }} />
                </div>
                {error && <Alerta>{error}</Alerta>}
                <button type="submit" disabled={cargando} className="btn-primario h-[52px] text-base font-bold">{cargando ? 'Entrando…' : 'Entrar'}</button>
                {USE_MOCK && <p className="rounded-lg bg-dorado-50 px-3 py-2 text-xs leading-relaxed text-dorado-800">Modo demostración: admin@libitina.co / Admin123 o laura@correo.com / Laura123</p>}
                <p className="border-t border-azul-50 pt-4 text-center text-[15px] text-azul-700">¿Aún no estás afiliado? <Link to="/inscripcion" className="font-semibold text-azul-600">Inscríbete</Link></p>
              </form>
            )}
            {vista === 'recuperar' && (
              <form onSubmit={recuperar} className="flex flex-col gap-5" noValidate>
                <div className="flex flex-col gap-1.5"><h2 className="text-[28px] font-extrabold">Recupera tu contraseña</h2><span className="text-[15px] leading-relaxed text-azul-700">Escribe el correo con el que te inscribiste y te enviaremos un enlace para crear una nueva.</span></div>
                <Campo etiqueta="Correo electrónico">{(id) => <input id={id} type="email" className="campo" value={correo} onChange={(e) => { setCorreo(e.target.value.trim()); setError(''); }} />}</Campo>
                {error && <Alerta>{error}</Alerta>}
                <button type="submit" disabled={cargando} className="btn-primario h-[52px] text-base font-bold">Enviar enlace</button>
                <button type="button" onClick={() => setVista('login')} className="text-[15px] font-semibold text-azul-600">Volver a iniciar sesión</button>
              </form>
            )}
            {vista === 'enviado' && (
              <div className="flex flex-col gap-5">
                <h2 className="text-[26px] font-extrabold">Revisa tu correo</h2>
                <p className="text-[15px] leading-relaxed text-azul-700">Si <strong>{correo}</strong> está registrado, te llegará un enlace para crear una nueva contraseña. Vence en 30 minutos.</p>
                <button type="button" onClick={() => setVista('login')} className="btn-borde h-[52px]">Volver a iniciar sesión</button>
              </div>
            )}
          </div>
        </div>
        <span className="text-[13px] text-azul-200">© {new Date().getFullYear()} Libitina EPS · Proyecto académico de la Universidad Católica de Colombia</span>
      </div>
    </div>
  );
}

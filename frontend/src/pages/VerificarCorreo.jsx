import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PaginaSimple from '../components/layout/PaginaSimple.jsx';
import { authApi } from '../api/servicios.js';

export default function VerificarCorreo() {
  const [params] = useSearchParams();
  const [estado, setEstado] = useState('cargando');
  const [mensaje, setMensaje] = useState('');
  const hecho = useRef(false);

  useEffect(() => {
    if (hecho.current) return; // el token es de un solo uso: evita el doble llamado de React en desarrollo
    hecho.current = true;
    const token = params.get('token');
    if (!token) { setEstado('error'); setMensaje('El enlace está incompleto. Ábrelo de nuevo desde el correo.'); return; }
    authApi.verificarCorreo(token).then(() => setEstado('ok')).catch((e) => { setEstado('error'); setMensaje(e.message); });
  }, [params]);

  return (
    <PaginaSimple>
      {estado === 'cargando' && <p className="text-azul-700">Confirmando tu correo…</p>}
      {estado === 'ok' && <>
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-dorado-100 text-2xl text-dorado-700">✓</span>
        <h1 className="text-[26px] font-extrabold">Tu correo quedó confirmado</h1>
        <p className="text-[15px] leading-relaxed text-azul-700">Ya puedes entrar a tu portal para ver el estado de tu afiliación.</p>
        <Link to="/iniciar-sesion" className="btn-primario h-[52px]">Iniciar sesión</Link>
      </>}
      {estado === 'error' && <>
        <h1 className="text-[26px] font-extrabold">No pudimos confirmar tu correo</h1>
        <p className="text-[15px] leading-relaxed text-azul-700">{mensaje} Si ya iniciaste sesión, desde tu portal puedes pedir un enlace nuevo.</p>
        <Link to="/iniciar-sesion" className="btn-borde h-[52px]">Ir a iniciar sesión</Link>
      </>}
    </PaginaSimple>
  );
}

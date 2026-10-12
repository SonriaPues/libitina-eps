import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Campo, Alerta } from '../components/ui/Controles.jsx';
import { afiliadosApi } from '../api/servicios.js';
import { nombreIps } from '../data/ips.js';
import { estado } from '../utils/formato.js';
import { soloNumeros } from '../utils/validaciones.js';

export default function ConsultaEstado() {
  const [tipo, setTipo] = useState('CC');
  const [num, setNum] = useState('');
  const [humano, setHumano] = useState(false);
  const [error, setError] = useState('');
  const [res, setRes] = useState(null);
  const [cargando, setCargando] = useState(false);

  async function consultar(e) {
    e.preventDefault(); setRes(null);
    if (!num) return setError('Escribe el número de documento.');
    if (!humano) return setError('Confirma que no eres un robot.');
    setError(''); setCargando(true);
    try { setRes({ ...(await afiliadosApi.consulta(tipo, num)), doc: `${tipo} ${num}` }); } catch (err) { setError(err.message); } finally { setCargando(false); }
  }

  const est = res?.encontrado ? estado(res.estado) : null;
  return (
    <section className="bg-azul-950 px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto flex max-w-[760px] flex-col gap-7">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <span className="text-[13px] text-azul-200">Trámites › Estado de afiliación</span>
          <h1 className="text-4xl font-extrabold leading-tight text-white md:text-[46px]">Consulta tu estado de afiliación</h1>
          <p className="text-[17px] text-azul-200">Verifica si una persona está afiliada a Libitina EPS, sin iniciar sesión.</p>
        </div>
        <form onSubmit={consultar} className="flex flex-col gap-4 rounded-3xl bg-white p-7 md:p-8" noValidate>
          <div className="grid gap-3.5 sm:grid-cols-[1fr_1.4fr]">
            <Campo etiqueta="Tipo de documento">{(id) => <select id={id} className="campo" value={tipo} onChange={(e) => setTipo(e.target.value)}><option value="CC">Cédula de ciudadanía</option><option value="TI">Tarjeta de identidad</option><option value="RC">Registro civil</option><option value="CE">Cédula de extranjería</option><option value="PPT">PPT</option></select>}</Campo>
            <Campo etiqueta="Número de documento">{(id) => <input id={id} className="campo" inputMode="numeric" placeholder="1012345678" value={num} onChange={(e) => { setNum(soloNumeros(e.target.value)); setError(''); }} />}</Campo>
          </div>
          {/* En producción, reemplazar por un captcha real (por ejemplo, reCAPTCHA). */}
          <label className="flex cursor-pointer items-center gap-3 self-start rounded-xl border-[1.5px] border-azul-100 px-4 py-3.5 text-[15px]"><input type="checkbox" className="h-5 w-5 accent-azul-600" checked={humano} onChange={(e) => { setHumano(e.target.checked); setError(''); }} />No soy un robot</label>
          {error && <Alerta>{error}</Alerta>}
          <button type="submit" disabled={cargando} className="btn-primario h-14 text-base font-bold">{cargando ? 'Consultando…' : 'Consultar'}</button>
        </form>
        {res && (
          <div className="overflow-hidden rounded-3xl bg-white" aria-live="polite">
            {res.encontrado ? (
              <>
                <div className={`flex items-center justify-between px-7 py-5 ${res.estado === 'activo' ? 'bg-azul-50' : 'bg-dorado-50'}`}>
                  <span className="font-display text-xl font-extrabold">{res.estado === 'activo' ? 'Afiliación activa' : res.estado === 'pendiente' ? 'Afiliación en revisión' : res.estado === 'rechazado' ? 'Solicitud rechazada' : `Afiliación ${res.estado}`}</span>
                  <span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${est.clase}`}>{est.texto}</span>
                </div>
                <dl className="grid gap-4 px-7 py-6 sm:grid-cols-2">
                  {[['Nombre', res.nombre], ['Documento', res.doc], ['Régimen', res.regimen === 'contributivo' ? 'Contributivo' : 'Subsidiado'], ['IPS', nombreIps(res.ips_id)]].map(([k, v]) => (
                    <div key={k} className="flex flex-col gap-1"><dt className="text-xs tracking-wide text-dorado-600">{k}</dt><dd className="text-base font-medium">{v}</dd></div>
                  ))}
                </dl>
                <div className="flex flex-col justify-between gap-3 px-7 pb-6 sm:flex-row sm:items-center"><span className="text-[13px] text-azul-500">Por protección de datos, el nombre se muestra parcialmente.</span><Link to="/tramites/certificado" className="text-[15px] font-semibold text-azul-600">Obtener certificado</Link></div>
              </>
            ) : (
              <div className="flex flex-col items-start justify-between gap-4 px-7 py-6 sm:flex-row sm:items-center">
                <span className="text-[15px] leading-relaxed text-azul-700">No encontramos una afiliación con ese documento en Libitina EPS.</span>
                <Link to="/inscripcion" className="btn-dorado shrink-0">Afiliarme</Link>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

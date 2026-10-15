import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Encabezado from '../components/ui/Encabezado.jsx';
import Foto from '../components/ui/Foto.jsx';
import { Segmentado, Campo, Alerta } from '../components/ui/Controles.jsx';
import { tramitesApi } from '../api/servicios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { correoValido, soloNumeros } from '../utils/validaciones.js';
import { fecha, fechaHora } from '../utils/formato.js';

const TIPOS = [['peticion', 'P', 'Petición', 'Solicitas información, un documento o una actuación de la EPS.'], ['queja', 'Q', 'Queja', 'Manifiestas inconformidad con la atención o el trato de una persona.'],
  ['reclamo', 'R', 'Reclamo', 'Reportas una falla en un servicio, como una autorización o un medicamento.'], ['sugerencia', 'S', 'Sugerencia', 'Nos propones una idea para mejorar nuestros servicios.'],
  ['denuncia', 'D', 'Denuncia', 'Informas un posible acto irregular o de corrupción. Puede ser anónima.']];
const PASOS = [['pendiente', 'Radicada'], ['en_proceso', 'En gestión'], ['respondida', 'Respondida']];

export default function Pqrsd() {
  const [params] = useSearchParams();
  const { usuario } = useAuth();
  const [tab, setTab] = useState(params.get('radicado') ? 'consultar' : 'radicar');
  const [tipo, setTipo] = useState('');
  const [anonima, setAnonima] = useState(false);
  const [f, setF] = useState({ nombre_contacto: usuario?.nombre ?? '', documento_contacto: '', email_contacto: usuario?.correo ?? '', telefono_contacto: '', asunto: '', descripcion: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [radicada, setRadicada] = useState(null);
  const [consulta, setConsulta] = useState({ radicado: params.get('radicado') ?? '', documento: '' });
  const [resultado, setResultado] = useState(null);
  const sel = TIPOS.find((x) => x[0] === tipo);
  const set = (k, fn = (v) => v) => (e) => { setF({ ...f, [k]: fn(e.target.value) }); setError(''); };

  async function radicar(e) {
    e.preventDefault();
    if (!tipo) return setError('Elige qué quieres radicar.');
    if (f.asunto.trim().length < 5 || f.descripcion.trim().length < 20) return setError('Escribe un asunto y cuéntanos lo que pasó (mínimo 20 caracteres).');
    if (!anonima && (!f.nombre_contacto.trim() || !f.documento_contacto || !correoValido(f.email_contacto))) return setError('Escribe tu nombre, tu documento y un correo válido para enviarte la respuesta.');
    setEnviando(true); setError('');
    try {
      const datos = anonima ? { tipo, anonima: true, asunto: f.asunto.trim(), descripcion: f.descripcion.trim() } : { tipo, ...f, telefono_contacto: f.telefono_contacto || null };
      setRadicada({ ...(await tramitesApi.radicarPqrsd(datos)), tipo: sel[2], anonima, documento: f.documento_contacto });
    } catch (err) { setError(err.message); } finally { setEnviando(false); }
  }

  async function consultar(e) {
    e?.preventDefault();
    if (!consulta.radicado.trim()) return setError('Escribe el número de radicado.');
    setError(''); setResultado(null);
    try { setResultado(await tramitesApi.consultarPqrsd(consulta.radicado.trim(), consulta.documento.trim())); } catch (err) { setError(err.message); }
  }

  const reiniciar = () => { setRadicada(null); setTipo(''); setAnonima(false); setF({ ...f, asunto: '', descripcion: '' }); };
  const paso = resultado ? PASOS.findIndex(([v]) => v === (resultado.estado === 'cerrado' ? 'respondida' : resultado.estado)) : -1;

  return (
    <>
      <Encabezado migas={[{ texto: 'Trámites' }, { texto: 'PQRSD' }]} titulo="Peticiones, quejas, reclamos, sugerencias y denuncias" texto="Radica tu solicitud en línea y recibe un número de radicado para seguir su estado." />
      <div className="contenedor grid items-start gap-7 py-10 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <Segmentado className="max-w-[460px]" opciones={[['radicar', 'Radicar'], ['consultar', 'Consultar estado']]} valor={tab} onCambio={(v) => { setTab(v); setError(''); }} />
          {tab === 'radicar' && !radicada && (
            <form onSubmit={radicar} className="tarjeta flex flex-col gap-6 p-7 md:p-8" noValidate>
              <fieldset className="flex flex-col gap-2.5"><legend className="etiqueta mb-2.5">¿Qué quieres radicar?</legend>
                <div className="grid grid-cols-5 gap-2.5">{TIPOS.map(([v, l, n]) => (
                  <button key={v} type="button" aria-pressed={tipo === v} onClick={() => { setTipo(v); setAnonima(false); setError(''); }}
                    className={`flex flex-col items-center gap-2 rounded-[14px] px-1 py-4 ${tipo === v ? 'border-2 border-azul-600 bg-azul-50' : 'border-[1.5px] border-azul-100 bg-white'}`}>
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-display text-xl font-extrabold ${tipo === v ? 'bg-dorado-400 text-azul-950' : 'bg-azul-50 text-azul-600'}`}>{l}</span>
                    <span className="text-xs font-semibold sm:text-sm">{n}</span>
                  </button>))}</div>
                <span className="text-sm leading-relaxed text-azul-500">{sel ? sel[3] : 'Elige una opción para ver de qué se trata.'}</span>
              </fieldset>
              {tipo === 'denuncia' && <label className="flex items-center gap-2.5 text-[15px]"><input type="checkbox" className="h-5 w-5 accent-azul-600" checked={anonima} onChange={(e) => setAnonima(e.target.checked)} />Quiero radicarla de forma anónima (no guardamos ningún dato tuyo)</label>}
              {!anonima && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Campo etiqueta="Nombre completo">{(id) => <input id={id} className="campo" autoComplete="name" value={f.nombre_contacto} onChange={set('nombre_contacto')} />}</Campo>
                  <Campo etiqueta="N.º de documento" ayuda="Lo necesitarás para consultar la respuesta.">{(id) => <input id={id} className="campo" inputMode="numeric" value={f.documento_contacto} onChange={set('documento_contacto', soloNumeros)} />}</Campo>
                  <Campo etiqueta="Correo para la respuesta">{(id) => <input id={id} type="email" className="campo" autoComplete="email" value={f.email_contacto} onChange={set('email_contacto', (v) => v.trim())} />}</Campo>
                  <Campo etiqueta="Celular (opcional)">{(id) => <input id={id} type="tel" className="campo" inputMode="numeric" value={f.telefono_contacto} onChange={set('telefono_contacto', soloNumeros)} />}</Campo>
                </div>
              )}
              <Campo etiqueta="Asunto">{(id) => <input id={id} className="campo" maxLength={200} placeholder="Demora en la entrega de un medicamento" value={f.asunto} onChange={set('asunto')} />}</Campo>
              <Campo etiqueta="Cuéntanos qué pasó">{(id) => <textarea id={id} className="campo h-auto min-h-[130px] py-3" maxLength={5000} placeholder="Incluye fechas, lugar y nombres si los tienes" value={f.descripcion} onChange={set('descripcion')} />}</Campo>
              {error && <Alerta>{error}</Alerta>}
              <button type="submit" disabled={enviando} className="btn-primario self-end px-8">{enviando ? 'Radicando…' : 'Radicar solicitud'}</button>
            </form>
          )}
          {tab === 'radicar' && radicada && (
            <div className="tarjeta flex flex-col items-start gap-4 p-8 md:p-10" role="status">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-dorado-100 text-2xl text-dorado-700">✓</span>
              <h2 className="text-[28px] font-extrabold">Radicamos tu {radicada.tipo.toLowerCase()}</h2>
              <div className="rounded-[14px] bg-azul-50 px-5 py-4"><span className="block text-xs tracking-wide text-dorado-600">Número de radicado</span><span className="font-display text-[26px] font-extrabold">{radicada.radicado}</span></div>
              <p className="max-w-[620px] leading-relaxed text-azul-700">Te responderemos a más tardar el <strong>{fecha(radicada.fecha_limite)}</strong> ({radicada.dias_habiles} días hábiles). {radicada.anonima ? 'Como es anónima, guarda el radicado: es la única forma de consultar su estado.' : 'Te enviamos el radicado a tu correo y allí recibirás la respuesta.'}</p>
              <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setTab('consultar'); setConsulta({ radicado: radicada.radicado, documento: radicada.documento ?? '' }); reiniciar(); }} className="btn-primario">Consultar estado</button><button type="button" onClick={reiniciar} className="btn-borde">Radicar otra</button></div>
            </div>
          )}
          {tab === 'consultar' && (
            <div className="tarjeta flex flex-col gap-5 p-7 md:p-8">
              <form onSubmit={consultar} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
                <Campo etiqueta="Número de radicado">{(id) => <input id={id} className="campo" placeholder="LIB-PQR-2026-000123" value={consulta.radicado} onChange={(e) => setConsulta({ ...consulta, radicado: e.target.value.toUpperCase() })} />}</Campo>
                <Campo etiqueta="N.º de documento">{(id) => <input id={id} className="campo" inputMode="numeric" placeholder="Vacío si es anónima" value={consulta.documento} onChange={(e) => setConsulta({ ...consulta, documento: soloNumeros(e.target.value) })} />}</Campo>
                <button type="submit" className="btn-primario h-12">Consultar</button>
              </form>
              {error && <Alerta>{error}</Alerta>}
              {resultado && (
                <div className="flex flex-col gap-4 border-t border-azul-50 pt-5" aria-live="polite">
                  <div className="flex flex-col gap-1"><span className="font-display text-lg font-extrabold">{resultado.asunto ?? `Radicado ${resultado.radicado}`}</span>
                    <span className="text-sm text-azul-500">{resultado.radicado} · radicada el {fechaHora(resultado.creado_en)} · respuesta a más tardar el {fecha(resultado.fecha_limite)}</span></div>
                  <ol className="grid grid-cols-3 gap-2.5">{PASOS.map(([v, t], i) => <li key={v} className={`border-t-4 pt-3 text-[15px] font-semibold ${i <= paso ? (i === paso ? 'border-dorado-400' : 'border-azul-600') : 'border-azul-100 text-azul-400'}`}>{t}</li>)}</ol>
                  {resultado.respuesta && <div className="rounded-xl border-l-4 border-dorado-400 bg-azul-50 px-4 py-3"><span className="text-xs tracking-wide text-dorado-700">Respuesta</span><p className="whitespace-pre-line text-[15px]">{resultado.respuesta}</p></div>}
                  {resultado.anonima && <span className="text-sm text-azul-600">Es una denuncia anónima: para proteger a quien la radicó, aquí solo se muestra el estado.</span>}
                </div>
              )}
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div className="flex flex-col gap-3.5 rounded-[22px] bg-azul-950 p-7 text-[15px] leading-relaxed text-azul-200">
            <h2 className="text-lg font-bold text-white">Antes de radicar</h2>
            <p>Describe tu caso con fechas, lugar y nombres: así lo resolvemos más rápido.</p>
            <p>Respondemos en máximo 15 días hábiles (Ley 1755 de 2015); las denuncias, en 30. No contamos sábados, domingos ni festivos.</p>
            <p>Si no quedas conforme con la respuesta, puedes acudir a la Superintendencia Nacional de Salud.</p>
          </div>
          <div className="h-60 overflow-hidden rounded-[22px]"><Foto src="/images/pqrsd/pqrsd-lateral.jpg" alt="Afiliada escribiendo su solicitud en un portátil" /></div>
        </aside>
      </div>
    </>
  );
}

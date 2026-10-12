import { useState } from 'react';
import Encabezado from '../components/ui/Encabezado.jsx';
import Foto from '../components/ui/Foto.jsx';
import { Segmentado, Campo, Alerta } from '../components/ui/Controles.jsx';

// Nota: el servicio de Trámites llega en una entrega posterior; por ahora el radicado es simulado.
const TIPOS = [['P', 'Petición', 'Solicitas información, un documento o una actuación de la EPS.'], ['Q', 'Queja', 'Manifiestas inconformidad con la atención o el trato de una persona.'], ['R', 'Reclamo', 'Reportas una falla en un servicio, como una autorización o un medicamento.'], ['S', 'Sugerencia', 'Nos propones una idea para mejorar nuestros servicios.'], ['D', 'Denuncia', 'Informas un posible acto irregular o de corrupción. Puede ser anónima.']];

export default function Pqrsd() {
  const [tab, setTab] = useState('radicar');
  const [tipo, setTipo] = useState('');
  const [anonimo, setAnonimo] = useState(false);
  const [asunto, setAsunto] = useState('');
  const [texto, setTexto] = useState('');
  const [error, setError] = useState('');
  const [radicado, setRadicado] = useState('');
  const [consulta, setConsulta] = useState('');
  const [consultado, setConsultado] = useState(false);

  const sel = TIPOS.find((x) => x[0] === tipo);
  function radicar(e) {
    e.preventDefault();
    if (!tipo || !asunto.trim() || !texto.trim()) return setError('Elige el tipo de solicitud y escribe el asunto y la descripción.');
    setError(''); setRadicado(`LIB-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`);
  }
  const reiniciar = () => { setRadicado(''); setTipo(''); setAsunto(''); setTexto(''); setAnonimo(false); };

  return (
    <>
      <Encabezado migas={[{ texto: 'Trámites' }, { texto: 'PQRSD' }]} titulo="Peticiones, quejas, reclamos, sugerencias y denuncias" texto="Radica tu solicitud en línea y recibe un número de radicado para seguir su estado." />
      <div className="contenedor grid items-start gap-7 py-10 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-8">
          <Segmentado className="max-w-[460px]" opciones={[['radicar', 'Radicar'], ['consultar', 'Consultar estado']]} valor={tab} onCambio={(v) => { setTab(v); setConsultado(false); }} />
          {tab === 'radicar' && !radicado && (
            <form onSubmit={radicar} className="tarjeta flex flex-col gap-6 p-7 md:p-8" noValidate>
              <fieldset className="flex flex-col gap-2.5"><legend className="etiqueta mb-2.5">¿Qué quieres radicar?</legend>
                <div className="grid grid-cols-5 gap-2.5">{TIPOS.map(([l, n]) => (
                  <button key={l} type="button" aria-pressed={tipo === l} onClick={() => { setTipo(l); setAnonimo(false); setError(''); }}
                    className={`flex flex-col items-center gap-2 rounded-[14px] px-1 py-4 ${tipo === l ? 'border-2 border-azul-600 bg-azul-50' : 'border-[1.5px] border-azul-100 bg-white'}`}>
                    <span className={`flex h-10 w-10 items-center justify-center rounded-xl font-display text-xl font-extrabold ${tipo === l ? 'bg-dorado-400 text-azul-950' : 'bg-azul-50 text-azul-600'}`}>{l}</span>
                    <span className="text-xs font-semibold sm:text-sm">{n}</span>
                  </button>))}</div>
                <span className="text-sm leading-relaxed text-azul-500">{sel ? sel[2] : 'Elige una opción para ver de qué se trata.'}</span>
              </fieldset>
              {tipo === 'D' && <label className="flex items-center gap-2.5 text-[15px]"><input type="checkbox" className="h-5 w-5 accent-azul-600" checked={anonimo} onChange={(e) => setAnonimo(e.target.checked)} />Quiero radicarla de forma anónima</label>}
              {!(tipo === 'D' && anonimo) && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Campo etiqueta="Nombre completo">{(id) => <input id={id} className="campo" placeholder="Laura Camila Rodríguez" />}</Campo>
                  <Campo etiqueta="N.º de documento">{(id) => <input id={id} className="campo" inputMode="numeric" placeholder="1012345678" />}</Campo>
                  <Campo etiqueta="Correo para la respuesta">{(id) => <input id={id} type="email" className="campo" placeholder="laura@correo.com" />}</Campo>
                </div>
              )}
              <Campo etiqueta="Asunto">{(id) => <input id={id} className="campo" placeholder="Demora en la entrega de un medicamento" value={asunto} onChange={(e) => { setAsunto(e.target.value); setError(''); }} />}</Campo>
              <Campo etiqueta="Cuéntanos qué pasó">{(id) => <textarea id={id} className="campo h-auto min-h-[130px] py-3" placeholder="Incluye fechas, lugar y nombres si los tienes" value={texto} onChange={(e) => { setTexto(e.target.value); setError(''); }} />}</Campo>
              <Campo etiqueta="Adjuntos (opcional)" ayuda="PDF o imagen, máximo 5 MB.">{(id) => <input id={id} type="file" accept=".pdf,image/*" className="text-sm text-azul-700 file:mr-4 file:rounded-lg file:border-0 file:bg-azul-50 file:px-4 file:py-2.5 file:font-semibold file:text-azul-700" />}</Campo>
              {error && <Alerta>{error}</Alerta>}
              <button type="submit" className="btn-primario self-end px-8">Radicar solicitud</button>
            </form>
          )}
          {tab === 'radicar' && radicado && (
            <div className="tarjeta flex flex-col items-start gap-4 p-8 md:p-10" role="status">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-dorado-100 text-2xl text-dorado-700">✓</span>
              <h2 className="text-[28px] font-extrabold">Radicamos tu {sel[1].toLowerCase()}</h2>
              <div className="rounded-[14px] bg-azul-50 px-5 py-4"><span className="block text-xs tracking-wide text-dorado-600">Número de radicado</span><span className="font-display text-[26px] font-extrabold">{radicado}</span></div>
              <p className="max-w-[620px] leading-relaxed text-azul-700">Guarda este número para consultar el estado. Te enviaremos la respuesta al correo que registraste dentro de los plazos de ley.</p>
              <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setTab('consultar'); setConsulta(radicado); setConsultado(true); reiniciar(); }} className="btn-primario">Consultar estado</button><button type="button" onClick={reiniciar} className="btn-borde">Radicar otra</button></div>
            </div>
          )}
          {tab === 'consultar' && (
            <div className="tarjeta flex flex-col gap-5 p-7 md:p-8">
              <form onSubmit={(e) => { e.preventDefault(); setConsultado(true); }} className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Campo etiqueta="Número de radicado" className="flex-1">{(id) => <input id={id} className="campo" placeholder="LIB-2026-004817" value={consulta} onChange={(e) => { setConsulta(e.target.value.toUpperCase()); setConsultado(false); }} />}</Campo>
                <button type="submit" className="btn-primario h-12">Consultar</button>
              </form>
              {consultado && (consulta.trim() ? (
                <div className="flex flex-col gap-4 border-t border-azul-50 pt-5" aria-live="polite">
                  <div className="flex items-center justify-between gap-4"><span className="flex flex-col gap-1"><span className="font-display text-lg font-extrabold">Radicado {consulta.trim()}</span><span className="text-sm text-azul-500">Ejemplo de seguimiento</span></span><span className="rounded-full bg-dorado-100 px-3 py-1 text-[13px] font-semibold text-dorado-800">En gestión</span></div>
                  <ol className="grid grid-cols-3 gap-2.5">{[['Radicada', 'border-azul-600', ''], ['En gestión', 'border-dorado-400', ''], ['Respondida', 'border-azul-100', 'text-azul-400']].map(([t, b, c]) => <li key={t} className={`border-t-4 pt-3 text-[15px] font-semibold ${b} ${c}`}>{t}</li>)}</ol>
                </div>
              ) : <Alerta>Escribe el número de radicado que recibiste al radicar.</Alerta>)}
            </div>
          )}
        </div>
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div className="flex flex-col gap-3.5 rounded-[22px] bg-azul-950 p-7 text-[15px] leading-relaxed text-azul-200">
            <h2 className="text-lg font-bold text-white">Antes de radicar</h2>
            <p>Describe tu caso con fechas, lugar y nombres: así lo resolvemos más rápido.</p>
            <p>Respondemos dentro de los plazos de ley, que para peticiones generales son de hasta 15 días hábiles (Ley 1755 de 2015).</p>
            <p>Si no quedas conforme con la respuesta, puedes acudir a la Superintendencia Nacional de Salud.</p>
          </div>
          <div className="h-60 overflow-hidden rounded-[22px]"><Foto src="/images/pqrsd/pqrsd-lateral.jpg" alt="Afiliada escribiendo su solicitud en un portátil" /></div>
        </aside>
      </div>
    </>
  );
}

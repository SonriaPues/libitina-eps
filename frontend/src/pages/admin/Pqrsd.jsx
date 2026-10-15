import { useState } from 'react';
import { PanelAdministrador, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta, Campo } from '../../components/ui/Controles.jsx';
import { Cargando, Dato, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import { tramitesApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fecha, fechaHora } from '../../utils/formato.js';
import { TIPOS_PQRSD, ESTADO_PQRSD } from '../portal/MisPqrsd.jsx';

const FILTROS = [['abiertas', 'Abiertas'], ['respondidas', 'Respondidas'], ['todas', 'Todas']];

function plazo(p) {
  if (p.respuesta) return <Insignia tono="verde">Respondida</Insignia>;
  if (p.vencida) return <Insignia tono="rojo">Vencida hace {-p.dias_habiles_restantes} días hábiles</Insignia>;
  return <Insignia tono={p.dias_habiles_restantes <= 3 ? 'dorado' : 'azul'}>{p.dias_habiles_restantes} días hábiles</Insignia>;
}

export default function BandejaPqrsd() {
  const [filtro, setFiltro] = useState('abiertas');
  const bandeja = useDatos(() => tramitesApi.bandejaPqrsd(filtro), [filtro]);
  const [selId, setSelId] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const items = bandeja.datos?.items ?? [];
  const sel = items.find((p) => p.id === selId) ?? items[0];

  async function responder(e) {
    e.preventDefault();
    if (respuesta.trim().length < 20) return setError('La respuesta debe tener al menos 20 caracteres.');
    try { await tramitesApi.responderPqrsd(sel.id, respuesta.trim()); setAviso(`Respondimos ${sel.radicado}${sel.anonima ? '.' : ' y le enviamos la respuesta por correo.'}`); setRespuesta(''); setError(''); bandeja.recargar(); }
    catch (err) { setError(err.message); }
  }
  const tomar = () => tramitesApi.tomarPqrsd(sel.id).then(() => bandeja.recargar()).catch((err) => setError(err.message));

  return (
    <PanelAdministrador>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Administración" titulo="Bandeja de PQRSD" />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="tarjeta flex flex-col gap-1 px-5 py-4"><span className="text-sm text-azul-700">Abiertas</span><span className="font-display text-3xl font-extrabold text-azul-600">{bandeja.datos?.abiertas ?? '–'}</span></div>
          <div className="tarjeta flex flex-col gap-1 px-5 py-4"><span className="text-sm text-azul-700">Vencidas</span><span className="font-display text-3xl font-extrabold text-red-700">{bandeja.datos?.vencidas ?? '–'}</span></div>
        </div>
        {(error || bandeja.error) && <Alerta>{error || bandeja.error}</Alerta>}
        {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
        <div className="grid items-start gap-5 xl:grid-cols-12">
          <section className="overflow-hidden rounded-[18px] border border-azul-100 bg-white xl:col-span-5">
            <div className="flex gap-1.5 border-b border-azul-50 p-3.5" role="tablist">{FILTROS.map(([v, t]) => (
              <button key={v} type="button" role="tab" aria-selected={filtro === v} onClick={() => { setFiltro(v); setSelId(null); }} className={`h-10 rounded-[10px] px-4 text-sm font-semibold ${filtro === v ? 'bg-azul-900 text-white' : 'text-azul-700 hover:bg-azul-50'}`}>{t}</button>))}</div>
            {bandeja.cargando && <div className="px-5"><Cargando /></div>}
            {!bandeja.cargando && items.length === 0 && <p className="px-6 py-10 text-center text-azul-500">No hay PQRSD en esta bandeja.</p>}
            <ul>{items.map((p) => (
              <li key={p.id}><button type="button" onClick={() => { setSelId(p.id); setError(''); }} className={`flex w-full flex-col gap-1.5 border-b border-azul-50 px-5 py-4 text-left ${sel?.id === p.id ? 'bg-azul-50' : 'hover:bg-fondo'}`}>
                <span className="flex items-center justify-between gap-2"><span className="font-semibold">{p.asunto}</span>{plazo(p)}</span>
                <span className="text-xs text-azul-600">{TIPOS_PQRSD[p.tipo]} · {p.radicado} · {p.anonima ? 'Anónima' : p.nombre}</span>
              </button></li>))}</ul>
          </section>
          {sel ? (
            <section className="tarjeta flex flex-col gap-5 p-6 xl:col-span-7">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex flex-col gap-1"><span className="antetitulo">{TIPOS_PQRSD[sel.tipo]} · {sel.radicado}</span><h2 className="text-xl font-extrabold">{sel.asunto}</h2></div>
                <Insignia tono={(ESTADO_PQRSD[sel.estado] ?? [])[1]}>{(ESTADO_PQRSD[sel.estado] ?? [sel.estado])[0]}</Insignia>
              </div>
              <dl className="grid gap-3 sm:grid-cols-3">
                <Dato k="Radicada" v={fechaHora(sel.creado_en)} /><Dato k="Fecha límite" v={fecha(sel.fecha_limite)} />
                <Dato k="Solicitante" v={sel.anonima ? 'Anónima' : `${sel.nombre} · ${sel.documento}`} />
                {!sel.anonima && <Dato k="Correo" v={sel.email} />}{!sel.anonima && <Dato k="Teléfono" v={sel.telefono} />}
              </dl>
              <p className="whitespace-pre-line rounded-xl bg-fondo p-4 text-[15px] leading-relaxed">{sel.descripcion}</p>
              {sel.respuesta ? (
                <div className="rounded-xl border-l-4 border-dorado-400 bg-azul-50 px-4 py-3"><span className="text-xs tracking-wide text-dorado-700">Respuesta · {fechaHora(sel.respondida_en)}</span><p className="whitespace-pre-line text-[15px]">{sel.respuesta}</p></div>
              ) : (
                <form onSubmit={responder} className="flex flex-col gap-3">
                  {sel.estado === 'pendiente' && <button type="button" onClick={tomar} className="btn-borde self-start px-4 py-2">Marcar en gestión</button>}
                  <Campo etiqueta="Respuesta" ayuda={sel.anonima ? 'Es anónima: la respuesta queda registrada, pero no hay a quién enviarla.' : 'Se enviará por correo al solicitante.'}>{(i) => <textarea id={i} className="campo h-auto min-h-[140px] py-3" value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />}</Campo>
                  <button type="submit" className="btn-primario self-end px-6">Enviar respuesta</button>
                </form>
              )}
            </section>
          ) : !bandeja.cargando && <div className="xl:col-span-7"><Vacio titulo="Sin selección" texto="Elige una PQRSD de la lista para verla y responderla." /></div>}
        </div>
      </div>
    </PanelAdministrador>
  );
}

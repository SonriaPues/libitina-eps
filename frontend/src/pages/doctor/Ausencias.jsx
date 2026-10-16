import { useState } from 'react';
import { PanelDoctor, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta, Campo } from '../../components/ui/Controles.jsx';
import { Cargando, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import { citasApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaLarga, hoyIso, sumarDias } from '../../utils/formato.js';

export const TIPOS_AUSENCIA = [['vacaciones', 'Vacaciones'], ['incapacidad', 'Incapacidad'], ['capacitacion', 'Capacitación'], ['calamidad', 'Calamidad doméstica'], ['otro', 'Otro motivo']];
export const ESTADO_AUSENCIA = { pendiente: ['Pendiente', 'dorado'], aprobada: ['Aprobada', 'verde'], rechazada: ['Rechazada', 'rojo'], cancelada: ['Retirada', 'azul'] };

// El doctor pide vacaciones, incapacidad o capacitación; la administración la aprueba y bloquea su agenda.
export default function Ausencias() {
  const lista = useDatos(() => citasApi.misAusencias());
  const hoy = hoyIso();
  const [f, setF] = useState({ tipo: 'vacaciones', fecha_inicio: sumarDias(hoy, 7), fecha_fin: sumarDias(hoy, 11), motivo: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const dias = f.fecha_inicio && f.fecha_fin && f.fecha_fin >= f.fecha_inicio
    ? Math.round((new Date(`${f.fecha_fin}T12:00:00`) - new Date(`${f.fecha_inicio}T12:00:00`)) / 86400000) + 1 : 0;

  async function solicitar(e) {
    e.preventDefault();
    if (f.motivo.trim().length < 5) return setError('Cuéntale a la administración el motivo (mínimo 5 caracteres).');
    setEnviando(true); setError(''); setAviso('');
    try {
      const a = await citasApi.solicitarAusencia({ ...f, motivo: f.motivo.trim() });
      setAviso(a.citas_afectadas ? `Enviamos tu solicitud. Tienes ${a.citas_afectadas} ${a.citas_afectadas === 1 ? 'cita' : 'citas'} esos días: si la aprueban, se cancelarán y avisaremos a los pacientes.` : 'Enviamos tu solicitud a la administración. Te avisaremos por correo cuando la respondan.');
      setF({ ...f, motivo: '' }); lista.recargar();
    } catch (err) { setError(err.message); } finally { setEnviando(false); }
  }
  const retirar = (a) => citasApi.retirarAusencia(a.id).then(() => { setAviso('Retiraste la solicitud.'); lista.recargar(); }).catch((e) => setError(e.message));

  return (
    <PanelDoctor>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Portal del doctor" titulo="Ausencias y vacaciones" />
        <div className="grid items-start gap-5 lg:grid-cols-5">
          <form onSubmit={solicitar} className="tarjeta flex flex-col gap-4 p-6 lg:col-span-2" noValidate>
            <h2 className="text-lg font-extrabold">Nueva solicitud</h2>
            <Campo etiqueta="Tipo">{(i) => <select id={i} className="campo" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })}>{TIPOS_AUSENCIA.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>}</Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Desde">{(i) => <input id={i} type="date" className="campo" min={hoy} value={f.fecha_inicio} onChange={(e) => setF({ ...f, fecha_inicio: e.target.value, fecha_fin: f.fecha_fin < e.target.value ? e.target.value : f.fecha_fin })} />}</Campo>
              <Campo etiqueta="Hasta">{(i) => <input id={i} type="date" className="campo" min={f.fecha_inicio || hoy} value={f.fecha_fin} onChange={(e) => setF({ ...f, fecha_fin: e.target.value })} />}</Campo>
            </div>
            {dias > 0 && <span className="-mt-2 text-sm text-azul-600">{dias} {dias === 1 ? 'día' : 'días'} calendario</span>}
            <Campo etiqueta="Motivo">{(i) => <textarea id={i} className="campo h-auto min-h-[90px] py-3" maxLength={500} placeholder="Ej.: vacaciones programadas de fin de año" value={f.motivo} onChange={(e) => setF({ ...f, motivo: e.target.value })} />}</Campo>
            {error && <Alerta>{error}</Alerta>}
            {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
            <button type="submit" disabled={enviando} className="btn-primario self-end px-6">{enviando ? 'Enviando…' : 'Enviar solicitud'}</button>
            <p className="text-xs text-azul-500">Si la aprueban, tu agenda queda bloqueada esos días y las citas que haya se cancelan con aviso por correo a cada paciente.</p>
          </form>

          <section className="flex flex-col gap-3 lg:col-span-3">
            <h2 className="text-lg font-bold">Mis solicitudes</h2>
            {lista.cargando && <Cargando />}
            {lista.datos?.length === 0 && <Vacio titulo="Sin solicitudes" texto="Cuando pidas vacaciones o reportes una incapacidad, verás aquí su estado." />}
            {(lista.datos ?? []).map((a) => { const [txt, tono] = ESTADO_AUSENCIA[a.estado]; return (
              <article key={a.id} className="tarjeta flex flex-col gap-2 p-5">
                <div className="flex items-start justify-between gap-3"><span className="flex flex-col"><span className="font-bold">{a.tipo_texto} · {a.dias} {a.dias === 1 ? 'día' : 'días'}</span>
                  <span className="text-sm text-azul-600 first-letter:uppercase">{fechaLarga(a.fecha_inicio)} – {fechaLarga(a.fecha_fin)}</span></span><Insignia tono={tono}>{txt}</Insignia></div>
                <p className="text-sm text-azul-800">{a.motivo}</p>
                {a.respuesta && <p className="rounded-xl bg-azul-50 px-3 py-2 text-sm"><strong>Administración:</strong> {a.respuesta}</p>}
                {a.estado === 'pendiente' && <div className="flex items-center justify-between gap-3"><span className="text-xs text-azul-500">{a.citas_afectadas ? `${a.citas_afectadas} citas agendadas esos días` : 'Sin citas agendadas esos días'}</span>
                  <button type="button" onClick={() => retirar(a)} className="text-sm font-semibold text-red-700 hover:underline">Retirar solicitud</button></div>}
              </article>); })}
          </section>
        </div>
      </div>
    </PanelDoctor>
  );
}

import { useState } from 'react';
import { PanelAdministrador, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta, Campo, Segmentado } from '../../components/ui/Controles.jsx';
import { Cargando, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import { ESTADO_AUSENCIA } from '../doctor/Ausencias.jsx';
import { citasApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaHora, fechaLarga } from '../../utils/formato.js';

// Bandeja de solicitudes de ausencia de los doctores.
export default function BandejaAusencias() {
  const [estado, setEstado] = useState('pendiente');
  const lista = useDatos(() => citasApi.ausenciasAdmin(estado), [estado]);
  const [abierta, setAbierta] = useState(null);
  const [respuesta, setRespuesta] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);

  const decidir = async (a, aprobar) => {
    setEnviando(true); setError(''); setAviso('');
    try {
      const r = aprobar ? await citasApi.aprobarAusencia(a.id, respuesta.trim() || null) : await citasApi.rechazarAusencia(a.id, respuesta.trim());
      setAviso(aprobar ? `Aprobada. Bloqueamos la agenda de ${a.doctor}${r.citas_canceladas ? ` y cancelamos ${r.citas_canceladas} ${r.citas_canceladas === 1 ? 'cita' : 'citas'} (con aviso a cada paciente)` : ''}.` : `Rechazada. Le avisamos a ${a.doctor} por correo.`);
      setAbierta(null); setRespuesta(''); lista.recargar(); window.dispatchEvent(new Event('libitina:contadores'));
    } catch (e) { setError(e.message); } finally { setEnviando(false); }
  };

  return (
    <PanelAdministrador>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Administración" titulo="Ausencias de doctores" />
        <Segmentado className="max-w-md" opciones={[['pendiente', 'Por responder'], ['resueltas', 'Respondidas'], ['todas', 'Todas']]} valor={estado} onCambio={(v) => { setEstado(v); setAbierta(null); }} />
        {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
        {(lista.error || error) && <Alerta>{lista.error || error}</Alerta>}
        {lista.cargando && !lista.datos && <Cargando />}
        {lista.datos?.length === 0 && <Vacio titulo={estado === 'pendiente' ? 'No hay solicitudes por responder' : 'Sin solicitudes'} texto="Los doctores solicitan vacaciones, incapacidades o capacitaciones desde su portal." />}
        <div className="flex flex-col gap-3">{(lista.datos ?? []).map((a) => { const [txt, tono] = ESTADO_AUSENCIA[a.estado]; const abierto = abierta === a.id; return (
          <article key={a.id} className={`tarjeta flex flex-col gap-3 p-5 ${abierto ? 'ring-2 ring-azul-200' : ''}`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <span className="flex flex-col"><span className="text-lg font-bold">{a.doctor}</span><span className="text-sm text-azul-600">{a.especialidad} · solicitada el {fechaHora(a.creado_en)}</span></span>
              <Insignia tono={tono}>{txt}</Insignia>
            </div>
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-[15px]"><span><strong>{a.tipo_texto}</strong> · {a.dias} {a.dias === 1 ? 'día' : 'días'}</span>
              <span className="first-letter:uppercase">{fechaLarga(a.fecha_inicio)} – {fechaLarga(a.fecha_fin)}</span>
              {a.citas_afectadas != null && <span className={a.citas_afectadas ? 'font-semibold text-dorado-800' : 'text-azul-600'}>{a.citas_afectadas ? `${a.citas_afectadas} citas agendadas esos días` : 'Sin citas esos días'}</span>}</div>
            <p className="text-sm text-azul-800">{a.motivo}</p>
            {a.respuesta && <p className="rounded-xl bg-azul-50 px-3 py-2 text-sm"><strong>Respuesta:</strong> {a.respuesta}</p>}
            {a.estado === 'pendiente' && !abierto && <button type="button" onClick={() => { setAbierta(a.id); setRespuesta(''); setError(''); }} className="btn-primario self-end px-5">Responder</button>}
            {abierto && (
              <div className="flex flex-col gap-3 border-t border-azul-50 pt-3">
                <Campo etiqueta="Mensaje para el doctor" ayuda="Obligatorio si rechazas.">{(i) => <textarea id={i} className="campo h-auto min-h-[70px] py-3" maxLength={500} value={respuesta} onChange={(e) => setRespuesta(e.target.value)} />}</Campo>
                {a.citas_afectadas > 0 && <Alerta tipo="aviso">Al aprobar se cancelan {a.citas_afectadas} citas y se avisa por correo a cada paciente para que reagende.</Alerta>}
                <div className="flex flex-wrap justify-end gap-2">
                  <button type="button" onClick={() => setAbierta(null)} className="btn-borde px-4">Cancelar</button>
                  <button type="button" disabled={enviando} onClick={() => decidir(a, false)} className="btn border-[1.5px] border-red-300 px-4 text-red-700 hover:bg-red-50">Rechazar</button>
                  <button type="button" disabled={enviando} onClick={() => decidir(a, true)} className="btn-primario px-5">Aprobar y bloquear agenda</button>
                </div>
              </div>
            )}
          </article>); })}</div>
      </div>
    </PanelAdministrador>
  );
}

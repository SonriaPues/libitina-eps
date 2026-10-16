import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { PanelAfiliado, TituloPanel } from '../../components/layout/Paneles.jsx';
import Agendador from '../../components/citas/Agendador.jsx';
import { Alerta, Campo } from '../../components/ui/Controles.jsx';
import { Cargando, EstadoCita, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import { Icono } from '../../components/ui/Iconos.jsx';
import { afiliadosApi, citasApi, redApi, tramitesApi } from '../../api/servicios.js';
import { api } from '../../api/client.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaLarga, hora12, pesos, PARENTESCOS } from '../../utils/formato.js';

export default function Citas() {
  const [params] = useSearchParams();
  const base = useDatos(() => Promise.all([afiliadosApi.miAfiliacion(), redApi.especialidades(), redApi.sedes(), citasApi.especialidadesConAgenda(),
    api('/afiliados/tarifas')]).then(([af, esps, sedes, conAgenda, tarifas]) => ({ af, esps, sedes, conAgenda, tarifas })));
  const citas = useDatos(() => citasApi.mias());
  const rems = useDatos(() => tramitesApi.misRemisiones());
  const [abierto, setAbierto] = useState(params.get('agendar') === '1' ? {} : null);   // {} = agendar nueva · {cita} = reagendar
  const [cancelando, setCancelando] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [aviso, setAviso] = useState('');
  const [error, setError] = useState('');

  const recargar = () => { citas.recargar(); rems.recargar(); };
  const b = base.datos;
  const personas = b ? [{ ...b.af, rol: 'Titular' }, ...b.af.beneficiarios.map((x) => ({ ...x, rol: PARENTESCOS[x.parentesco] }))] : [];
  const conAgenda = Object.fromEntries((b?.conAgenda ?? []).map((e) => [e.codigo, e]));
  const especialidades = b ? b.esps.filter((e) => conAgenda[e.codigo]).map((e) => ({ ...e, sedes: conAgenda[e.codigo].sedes })) : [];
  const sedeInicial = b?.sedes.find((s) => s.ips_id === b.af.ips_id)?.id;
  const cuota = b && b.af.regimen === 'contributivo' ? b.tarifas.find((t) => t.regimen === 'contributivo' && t.categoria === b.af.categoria)?.cuota_moderadora : 0;
  const sede = (id) => b?.sedes.find((s) => s.id === id)?.nombre ?? '';
  const vigentes = (rems.datos ?? []).filter((r) => r.estado === 'vigente');

  async function cancelar(e) {
    e.preventDefault();
    if (motivo.trim().length < 5) return setError('Cuéntanos el motivo de la cancelación.');
    try {
      await citasApi.cancelar(cancelando.id, motivo.trim());
      setAviso('Cancelamos la cita y te enviamos la confirmación por correo.'); setCancelando(null); setMotivo(''); setError(''); recargar();
    } catch (err) { setError(err.message); }
  }

  const listo = (cita) => {
    setAbierto(null);
    setAviso(`Listo: cita de ${cita.especialidad} el ${fechaLarga(cita.fecha)} a las ${hora12(cita.hora)} con ${cita.doctor}. Te enviamos la confirmación por correo.`);
    recargar();
  };

  return (
    <PanelAfiliado>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Mis citas" titulo="Citas médicas">
          {b?.af.estado === 'activo' && !abierto && <button type="button" onClick={() => { setAbierto({}); setAviso(''); }} className="btn-primario"><Icono.mas width={18} height={18} />Agendar cita</button>}
        </TituloPanel>
        {(base.error || citas.error) && <Alerta>{base.error || citas.error}</Alerta>}
        {base.cargando && <Cargando />}
        {b && b.af.estado !== 'activo' && <Alerta tipo="aviso">Podrás agendar citas cuando tu afiliación esté activa.</Alerta>}
        {aviso && <Alerta tipo="exito">{aviso}</Alerta>}

        {b && abierto && (
          <Agendador key={abierto.cita?.id ?? abierto.codigo ?? 'nueva'} personas={personas} especialidades={especialidades} sedes={b.sedes} sedeInicial={sedeInicial}
            remisiones={rems.datos ?? []} cuota={cuota} reagendar={abierto.cita} inicial={abierto}
            onListo={listo} onCancelar={() => setAbierto(null)} />
        )}

        {vigentes.length > 0 && !abierto && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Remisiones vigentes</h2>
            <div className="grid gap-3 md:grid-cols-2">{vigentes.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-4 rounded-[16px] border border-dorado-200 bg-dorado-50 p-4">
                <span className="flex flex-col gap-0.5"><span className="font-semibold">{r.especialidad} · {r.paciente}</span>
                  <span className="text-sm text-azul-700">Remitido por {r.doctor} · vence el {fechaLarga(r.vence)}</span></span>
                <button type="button" onClick={() => setAbierto({ codigo: r.especialidad_codigo, pacienteId: r.afiliado_id })} className="btn-primario shrink-0 px-4 py-2.5">Agendar</button>
              </div>))}</div>
          </section>
        )}

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-bold">Próximas</h2>
          {citas.datos?.proximas.length === 0 && <Vacio titulo="No tienes citas próximas" texto="Agenda una cita de medicina general u odontología cuando lo necesites." />}
          <div className="grid gap-3 lg:grid-cols-2">{citas.datos?.proximas.map((c) => (
            <article key={c.id} className="tarjeta flex flex-col gap-4 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-0.5"><span className="font-display text-lg font-extrabold">{c.especialidad}</span><span className="text-sm text-azul-600">{c.paciente}</span></div>
                <EstadoCita estado={c.estado} />
              </div>
              <div className="flex items-center gap-4 rounded-xl bg-azul-50 px-4 py-3">
                <Icono.calendario className="shrink-0 text-azul-600" />
                <span className="flex flex-col"><span className="font-semibold first-letter:uppercase">{fechaLarga(c.fecha)} · {hora12(c.hora)}</span>
                  <span className="text-sm text-azul-700">{c.doctor} · {sede(c.punto_atencion_id)}</span></span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <span className="text-sm text-azul-700">Cuota moderadora: <strong>{c.cuota_moderadora ? pesos(c.cuota_moderadora) : 'no aplica'}</strong>{c.remision_id && <> · <Insignia>Con remisión</Insignia></>}</span>
                {c.puede_cancelar ? (
                  <span className="flex gap-2">
                    <button type="button" onClick={() => { setAbierto({ cita: c }); setAviso(''); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-azul-600 hover:bg-azul-50">Reagendar</button>
                    <button type="button" onClick={() => { setCancelando(c); setError(''); }} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50">Cancelar</button>
                  </span>
                ) : <span className="text-xs text-azul-500">Ya no se puede cancelar en línea (menos de 2 horas).</span>}
              </div>
              {cancelando?.id === c.id && (
                <form onSubmit={cancelar} className="flex flex-col gap-3 border-t border-azul-50 pt-4">
                  <Campo etiqueta="¿Por qué cancelas?">{(id) => <input id={id} className="campo" autoFocus value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: tengo un viaje ese día" />}</Campo>
                  {error && <Alerta>{error}</Alerta>}
                  <span className="flex justify-end gap-2"><button type="button" onClick={() => setCancelando(null)} className="btn border-[1.5px] border-azul-200 px-4 py-2.5 text-azul-700">Volver</button>
                    <button type="submit" className="btn bg-red-700 px-4 py-2.5 text-white hover:bg-red-800">Cancelar cita</button></span>
                </form>
              )}
            </article>))}</div>
        </section>

        {citas.datos?.historial.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="text-lg font-bold">Historial</h2>
            <div className="overflow-x-auto rounded-[18px] border border-azul-100 bg-white">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="bg-azul-50 text-azul-700"><tr>{['Fecha', 'Especialidad', 'Paciente', 'Profesional', 'Estado'].map((t) => <th key={t} className="px-4 py-3 font-semibold">{t}</th>)}</tr></thead>
                <tbody>{citas.datos.historial.map((c) => (
                  <tr key={c.id} className="border-t border-azul-50">
                    <td className="px-4 py-3 first-letter:uppercase">{fechaLarga(c.fecha)}, {hora12(c.hora)}</td><td className="px-4 py-3">{c.especialidad}</td>
                    <td className="px-4 py-3">{c.paciente}</td><td className="px-4 py-3">{c.doctor}</td>
                    <td className="px-4 py-3"><EstadoCita estado={c.estado} />{c.motivo_cancelacion && <span className="mt-1 block text-xs text-azul-500">{c.motivo_cancelacion}</span>}</td>
                  </tr>))}</tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </PanelAfiliado>
  );
}

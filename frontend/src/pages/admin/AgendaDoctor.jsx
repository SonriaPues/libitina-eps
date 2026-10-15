import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PanelAdministrador } from '../../components/layout/Paneles.jsx';
import { Alerta, Campo } from '../../components/ui/Controles.jsx';
import { Cargando } from '../../components/ui/Piezas.jsx';
import { citasApi, redApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { DIAS_SEMANA, fecha, hora12, hoyIso } from '../../utils/formato.js';

export default function AgendaDoctor() {
  const { id } = useParams();
  const datos = useDatos(() => Promise.all([citasApi.agendaAdmin(id), redApi.sedes()]).then(([agenda, sedes]) => ({ ...agenda, sedes })), [id]);
  const [turno, setTurno] = useState({ dias: [0, 1, 2, 3, 4], hora_inicio: '07:00', hora_fin: '12:00', punto_atencion_id: '' });
  const [bloqueo, setBloqueo] = useState({ fecha_inicio: hoyIso(), fecha_fin: hoyIso(), motivo: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const d = datos.datos;
  const sede = (pid) => d?.sedes.find((s) => s.id === pid)?.nombre ?? 'Sede';
  const punto = turno.punto_atencion_id || d?.doctor.sede_principal_id || d?.sedes[0]?.id;

  async function crearTurnos(e) {
    e.preventDefault();
    if (!turno.dias.length) return setError('Elige al menos un día.');
    setError(''); setAviso('');
    const errores = [];
    for (const dia of turno.dias) {
      try { await citasApi.crearTurno(id, { dia_semana: dia, hora_inicio: turno.hora_inicio, hora_fin: turno.hora_fin, punto_atencion_id: punto }); }
      catch (err) { errores.push(`${DIAS_SEMANA[dia]}: ${err.message}`); }
    }
    if (errores.length) setError(errores.join(' '));
    else setAviso('Turnos guardados. Los afiliados ya pueden agendar en esos horarios.');
    datos.recargar();
  }

  async function crearBloqueo(e) {
    e.preventDefault();
    if (bloqueo.motivo.trim().length < 3) return setError('Escribe el motivo del bloqueo.');
    setError(''); setAviso('');
    try {
      const r = await citasApi.crearBloqueo(id, bloqueo);
      setAviso(r.citas_canceladas ? `Bloqueo guardado. Se cancelaron ${r.citas_canceladas} citas de esos días y se avisó a los pacientes por correo.` : 'Bloqueo guardado.');
      setBloqueo({ ...bloqueo, motivo: '' }); datos.recargar();
    } catch (err) { setError(err.message); }
  }

  const quitar = (fn, msg) => fn().then(() => { setAviso(msg); datos.recargar(); }).catch((err) => setError(err.message));

  return (
    <PanelAdministrador>
      <div className="flex flex-col gap-6">
        <Link to="/admin/doctores" className="text-sm font-semibold text-azul-600">‹ Volver a doctores</Link>
        {datos.error && <Alerta>{datos.error}</Alerta>}
        {!d && !datos.error && <Cargando />}
        {d && (
          <>
            <div className="flex flex-col gap-1"><span className="antetitulo">Agenda · citas de {d.doctor.duracion_cita_min} minutos</span><h1 className="text-3xl font-extrabold">{d.doctor.nombre}</h1><span className="text-azul-700">{d.doctor.especialidad}</span></div>
            {error && <Alerta>{error}</Alerta>}
            {aviso && <Alerta tipo="exito">{aviso}</Alerta>}

            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">{DIAS_SEMANA.map((nombre, dia) => { const lista = d.turnos.filter((t) => t.dia_semana === dia); return (
              <div key={nombre} className="flex flex-col gap-2 rounded-[16px] border border-azul-100 bg-white p-3">
                <span className="font-bold">{nombre}</span>
                {lista.length === 0 && <span className="text-xs text-azul-500">Sin turnos</span>}
                {lista.map((t) => (
                  <div key={t.id} className="flex flex-col gap-0.5 rounded-lg bg-azul-50 px-2.5 py-2 text-xs">
                    <span className="font-semibold">{hora12(t.hora_inicio)} – {hora12(t.hora_fin)}</span><span className="text-azul-700">{sede(t.punto_atencion_id)}</span>
                    <button type="button" onClick={() => quitar(() => citasApi.borrarTurno(t.id), 'Turno eliminado. Las citas ya agendadas se conservan.')} className="self-start font-semibold text-red-700">Quitar</button>
                  </div>))}
              </div>); })}</section>

            <div className="grid items-start gap-5 lg:grid-cols-2">
              <form onSubmit={crearTurnos} className="tarjeta flex flex-col gap-4 p-6">
                <h2 className="text-lg font-extrabold">Agregar turno</h2>
                <fieldset className="flex flex-wrap gap-2"><legend className="etiqueta mb-2">Días</legend>{DIAS_SEMANA.map((n, dia) => {
                  const on = turno.dias.includes(dia);
                  return <button key={n} type="button" aria-pressed={on} onClick={() => setTurno({ ...turno, dias: on ? turno.dias.filter((x) => x !== dia) : [...turno.dias, dia] })}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold ${on ? 'bg-azul-600 text-white' : 'border-[1.5px] border-azul-200 text-azul-700'}`}>{n.slice(0, 3)}</button>;
                })}</fieldset>
                <div className="grid grid-cols-2 gap-3">
                  <Campo etiqueta="Desde">{(i) => <input id={i} type="time" step="600" className="campo" value={turno.hora_inicio} onChange={(e) => setTurno({ ...turno, hora_inicio: e.target.value })} />}</Campo>
                  <Campo etiqueta="Hasta">{(i) => <input id={i} type="time" step="600" className="campo" value={turno.hora_fin} onChange={(e) => setTurno({ ...turno, hora_fin: e.target.value })} />}</Campo>
                </div>
                <Campo etiqueta="Sede">{(i) => <select id={i} className="campo" value={punto} onChange={(e) => setTurno({ ...turno, punto_atencion_id: e.target.value })}>{d.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>}</Campo>
                <button type="submit" className="btn-primario self-end px-6">Guardar turnos</button>
              </form>

              <div className="flex flex-col gap-4">
                <form onSubmit={crearBloqueo} className="tarjeta flex flex-col gap-4 p-6">
                  <h2 className="text-lg font-extrabold">Bloquear días</h2>
                  <p className="text-sm text-azul-700">Vacaciones, incapacidad o capacitación. Las citas de esos días se cancelan y se avisa a cada paciente por correo.</p>
                  <div className="grid grid-cols-2 gap-3">
                    <Campo etiqueta="Desde">{(i) => <input id={i} type="date" className="campo" min={hoyIso()} value={bloqueo.fecha_inicio} onChange={(e) => setBloqueo({ ...bloqueo, fecha_inicio: e.target.value })} />}</Campo>
                    <Campo etiqueta="Hasta">{(i) => <input id={i} type="date" className="campo" min={bloqueo.fecha_inicio} value={bloqueo.fecha_fin} onChange={(e) => setBloqueo({ ...bloqueo, fecha_fin: e.target.value })} />}</Campo>
                  </div>
                  <Campo etiqueta="Motivo">{(i) => <input id={i} className="campo" placeholder="Ej.: vacaciones" value={bloqueo.motivo} onChange={(e) => setBloqueo({ ...bloqueo, motivo: e.target.value })} />}</Campo>
                  <button type="submit" className="btn border-[1.5px] border-red-300 self-end px-6 font-bold text-red-700 hover:bg-red-50">Bloquear</button>
                </form>
                {d.excepciones.length > 0 && (
                  <section className="tarjeta flex flex-col gap-2 p-5"><h2 className="font-bold">Bloqueos vigentes</h2>
                    {d.excepciones.map((x) => <div key={x.id} className="flex items-center justify-between gap-3 text-sm"><span><strong>{fecha(x.fecha_inicio)} – {fecha(x.fecha_fin)}</strong> · {x.motivo}</span>
                      <button type="button" onClick={() => quitar(() => citasApi.borrarBloqueo(x.id), 'Bloqueo eliminado.')} className="font-semibold text-red-700">Quitar</button></div>)}
                  </section>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </PanelAdministrador>
  );
}

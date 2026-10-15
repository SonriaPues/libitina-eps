import { useEffect, useMemo, useState } from 'react';
import { Alerta, Campo } from '../ui/Controles.jsx';
import { Cargando, Insignia } from '../ui/Piezas.jsx';
import { citasApi } from '../../api/servicios.js';
import { fechaCorta, fechaLarga, hora12, pesos } from '../../utils/formato.js';

// Paso a paso para agendar (o reagendar) una cita:
// paciente → especialidad → sede → día → hora → motivo → confirmar.
export default function Agendador({ personas, especialidades, sedes, remisiones, cuota, reagendar, inicial = {}, onListo, onCancelar }) {
  const [pacienteId, setPacienteId] = useState(reagendar?.afiliado_id ?? inicial.pacienteId ?? personas[0]?.id);
  const [codigo, setCodigo] = useState(reagendar?.especialidad_codigo ?? inicial.codigo ?? '');
  const [sede, setSede] = useState('');
  const [dias, setDias] = useState(null);
  const [dia, setDia] = useState(null);
  const [horario, setHorario] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const vigentes = useMemo(() => remisiones.filter((r) => r.estado === 'vigente'), [remisiones]);
  const tieneRemision = (cod) => vigentes.some((r) => r.especialidad_codigo === cod && r.afiliado_id === pacienteId);
  const esp = especialidades.find((e) => e.codigo === codigo);
  const bloqueada = esp && esp.requiere_remision && !reagendar && !tieneRemision(codigo);
  const nombreSede = (id) => sedes.find((s) => s.id === id)?.nombre ?? 'Sede';

  useEffect(() => {
    setDias(null); setDia(null); setHorario(null); setError('');
    if (!codigo || bloqueada) return;
    citasApi.disponibilidad(codigo, sede).then((d) => { setDias(d); setDia(d[0]?.fecha ?? null); }).catch((e) => setError(e.message));
  }, [codigo, sede, bloqueada]);

  const horarios = dias?.find((d) => d.fecha === dia)?.horarios ?? [];
  // Agrupa por hora: varios profesionales pueden tener el mismo horario
  const porHora = horarios.reduce((acc, h) => ({ ...acc, [h.hora]: [...(acc[h.hora] || []), h] }), {});

  async function confirmar() {
    if (!horario) return setError('Elige un horario.');
    if (!reagendar && motivo.trim().length < 5) return setError('Cuéntanos brevemente el motivo de la cita.');
    setEnviando(true); setError('');
    const base = { doctor_id: horario.doctor_id, punto_atencion_id: horario.punto_atencion_id, fecha: dia, hora: horario.hora };
    try {
      const cita = reagendar ? await citasApi.reagendar(reagendar.id, base)
        : await citasApi.agendar({ ...base, afiliado_id: pacienteId, especialidad_codigo: codigo, motivo: motivo.trim() });
      onListo(cita);
    } catch (e) {
      setError(e.message);
      if (e.status === 409) citasApi.disponibilidad(codigo, sede).then(setDias).catch(() => {});   // alguien tomó el horario: se refresca
    } finally { setEnviando(false); }
  }

  return (
    <section className="tarjeta flex flex-col gap-6 p-6 md:p-7" aria-label={reagendar ? 'Reagendar cita' : 'Agendar una cita'}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1"><h2 className="text-xl font-extrabold">{reagendar ? `Reagendar ${reagendar.especialidad}` : 'Agendar una cita'}</h2>
          {reagendar && <span className="text-sm text-azul-600">Cita actual: {fechaLarga(reagendar.fecha)}, {hora12(reagendar.hora)}. Elige el nuevo horario.</span>}</div>
        <button type="button" onClick={onCancelar} className="text-sm font-semibold text-azul-600">Cerrar</button>
      </div>

      {!reagendar && (
        <fieldset className="flex flex-col gap-2.5"><legend className="etiqueta mb-2">¿Para quién es la cita?</legend>
          <div className="flex flex-wrap gap-2">{personas.map((p) => (
            <button key={p.id} type="button" aria-pressed={pacienteId === p.id} onClick={() => { setPacienteId(p.id); setHorario(null); }}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${pacienteId === p.id ? 'bg-azul-600 text-white' : 'border-[1.5px] border-azul-200 text-azul-800 hover:bg-azul-50'}`}>
              {p.nombres.split(' ')[0]} <span className="font-normal opacity-80">· {p.rol}</span>
            </button>))}</div>
        </fieldset>
      )}

      {!reagendar && (
        <fieldset className="flex flex-col gap-2.5"><legend className="etiqueta mb-2">Especialidad</legend>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">{especialidades.map((e) => {
            const necesita = e.requiere_remision && !tieneRemision(e.codigo);
            return (
              <button key={e.codigo} type="button" aria-pressed={codigo === e.codigo} onClick={() => setCodigo(e.codigo)}
                className={`flex flex-col items-start gap-1 rounded-[14px] p-3.5 text-left ${codigo === e.codigo ? 'border-2 border-azul-600 bg-azul-50' : 'border-[1.5px] border-azul-100 hover:bg-azul-50'}`}>
                <span className="font-semibold">{e.nombre}</span>
                {!e.requiere_remision ? <Insignia tono="verde">Directa</Insignia> : necesita ? <Insignia tono="dorado">Requiere remisión</Insignia> : <Insignia>Tienes remisión</Insignia>}
              </button>);
          })}</div>
        </fieldset>
      )}

      {bloqueada && (
        <Alerta tipo="aviso">Para agendar {esp.nombre} necesitas una remisión vigente. Pide primero una cita de medicina general: si el médico lo considera necesario, te remitirá y podrás agendarla aquí.</Alerta>
      )}

      {codigo && !bloqueada && (
        <>
          <Campo etiqueta="Sede" className="sm:max-w-sm">{(id) => (
            <select id={id} className="campo" value={sede} onChange={(e) => setSede(e.target.value)}>
              <option value="">Todas las sedes</option>{sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.ciudad}</option>)}
            </select>)}</Campo>

          {dias === null && !error && <Cargando texto="Buscando horarios disponibles…" />}
          {dias?.length === 0 && <Alerta tipo="aviso">No hay horarios disponibles en los próximos 30 días{sede ? ' en esta sede' : ''}. Prueba con otra sede o vuelve a revisar más tarde.</Alerta>}
          {dias?.length > 0 && (
            <>
              <div className="flex flex-col gap-2.5"><span className="etiqueta">Día</span>
                <div className="flex gap-2 overflow-x-auto pb-1">{dias.map((d) => { const f = fechaCorta(d.fecha); return (
                  <button key={d.fecha} type="button" aria-pressed={dia === d.fecha} onClick={() => { setDia(d.fecha); setHorario(null); }}
                    className={`flex w-[68px] shrink-0 flex-col items-center rounded-[14px] py-2.5 ${dia === d.fecha ? 'bg-azul-600 text-white' : 'border-[1.5px] border-azul-100 bg-white text-azul-800 hover:bg-azul-50'}`}>
                    <span className="text-xs capitalize opacity-80">{f.dia}</span><span className="font-display text-xl font-extrabold">{f.num}</span><span className="text-xs">{f.mes}</span>
                  </button>); })}</div>
              </div>
              <div className="flex flex-col gap-2.5"><span className="etiqueta">Hora · {fechaLarga(dia)}</span>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">{Object.entries(porHora).map(([h, lista]) => lista.map((x) => {
                  const sel = horario?.hora === x.hora && horario?.doctor_id === x.doctor_id;
                  return (
                    <button key={`${h}-${x.doctor_id}`} type="button" aria-pressed={sel} onClick={() => setHorario(x)}
                      className={`flex flex-col items-start rounded-xl px-3 py-2 text-left ${sel ? 'bg-dorado-400 text-azul-950' : 'border-[1.5px] border-azul-100 bg-white hover:bg-azul-50'}`}>
                      <span className="font-semibold">{hora12(x.hora)}</span><span className="truncate text-xs opacity-80" title={x.doctor}>{x.doctor.split(' ')[0]}</span>
                    </button>);
                }))}</div>
              </div>
            </>
          )}

          {horario && (
            <div className="flex flex-col gap-4 rounded-[16px] bg-azul-50 p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[['Profesional', horario.doctor], ['Sede', nombreSede(horario.punto_atencion_id)], ['Fecha y hora', `${fechaLarga(dia)}, ${hora12(horario.hora)}`],
                  ['Cuota moderadora', reagendar ? 'Igual a la de la cita original' : cuota ? pesos(cuota) : 'No aplica']].map(([k, v]) => (
                  <div key={k}><dt className="text-xs tracking-wide text-dorado-700">{k}</dt><dd className="text-[15px] font-semibold">{v}</dd></div>))}
              </dl>
              {!reagendar && <Campo etiqueta="Motivo de la consulta">{(id) => <textarea id={id} className="campo h-auto min-h-[84px] bg-white py-3" maxLength={500} placeholder="Ej.: control de presión arterial, dolor de cabeza frecuente…" value={motivo} onChange={(e) => setMotivo(e.target.value)} />}</Campo>}
            </div>
          )}
        </>
      )}

      {error && <Alerta>{error}</Alerta>}
      {horario && <button type="button" onClick={confirmar} disabled={enviando} className="btn-dorado self-end px-8">{enviando ? 'Agendando…' : reagendar ? 'Confirmar nuevo horario' : 'Confirmar cita'}</button>}
    </section>
  );
}

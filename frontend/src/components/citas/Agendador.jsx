import { useEffect, useMemo, useState } from 'react';
import { Alerta, Campo } from '../ui/Controles.jsx';
import { Cargando, Insignia } from '../ui/Piezas.jsx';
import { Icono } from '../ui/Iconos.jsx';
import { citasApi } from '../../api/servicios.js';
import { fechaCorta, fechaLarga, hora12, hoyIso, pesos, sumarDias } from '../../utils/formato.js';

const DIAS_VISIBLES = 7;
const TOTAL_DIAS = 31;
const JORNADAS = [['Mañana', (h) => h < '12:00'], ['Tarde', (h) => h >= '12:00' && h < '18:00'], ['Noche', (h) => h >= '18:00']];

// Paso a paso para agendar (o reagendar): paciente → especialidad → sede → día → hora → motivo → confirmar.
// El afiliado elige día y hora; el profesional lo asigna el sistema y se muestra al confirmar.
export default function Agendador({ personas, especialidades, sedes, sedeInicial, remisiones, cuota, reagendar, inicial = {}, onListo, onCancelar }) {
  const [pacienteId, setPacienteId] = useState(reagendar?.afiliado_id ?? inicial.pacienteId ?? personas[0]?.id);
  const [codigo, setCodigo] = useState(reagendar?.especialidad_codigo ?? inicial.codigo ?? '');
  const [sede, setSede] = useState('');
  const [dias, setDias] = useState(null);
  const [inicio, setInicio] = useState(0);              // primer día visible de la franja (índice)
  const [dia, setDia] = useState(null);
  const [hora, setHora] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [hecha, setHecha] = useState(null);

  const vigentes = useMemo(() => remisiones.filter((r) => r.estado === 'vigente'), [remisiones]);
  const tieneRemision = (cod) => vigentes.some((r) => r.especialidad_codigo === cod && r.afiliado_id === pacienteId);
  const esp = especialidades.find((e) => e.codigo === codigo);
  const bloqueada = esp && esp.requiere_remision && !reagendar && !tieneRemision(codigo);
  const nombreSede = (id) => sedes.find((s) => s.id === id)?.nombre ?? 'Sede';

  // Sedes donde se ofrece la especialidad; se preselecciona la IPS del afiliado (o la de la cita que se reagenda).
  const sedesEsp = useMemo(() => sedes.filter((s) => !esp?.sedes || esp.sedes.includes(s.id)), [sedes, esp]);
  useEffect(() => {
    if (!esp) return;
    const preferida = [reagendar?.punto_atencion_id, sedeInicial].find((id) => id && sedesEsp.some((s) => s.id === id));
    setSede(preferida ?? sedesEsp[0]?.id ?? '');
  }, [codigo]); // eslint-disable-line react-hooks/exhaustive-deps

  const hoy = hoyIso();
  const fechas = useMemo(() => Array.from({ length: TOTAL_DIAS }, (_, i) => sumarDias(hoy, i)), [hoy]);
  const cargar = () => {
    setDias(null); setDia(null); setHora(null); setError(''); setInicio(0);
    if (!codigo || bloqueada || !sede) return;
    citasApi.disponibilidad(codigo, sede).then((d) => {
      setDias(d); setDia(d[0]?.fecha ?? null);
      const i = d[0] ? fechas.indexOf(d[0].fecha) : 0;            // muestra la semana del primer día con cupo
      setInicio(Math.max(0, Math.min(Math.floor(i / DIAS_VISIBLES) * DIAS_VISIBLES, TOTAL_DIAS - DIAS_VISIBLES)));
    }).catch((e) => setError(e.message));
  };
  useEffect(cargar, [codigo, sede, bloqueada]); // eslint-disable-line react-hooks/exhaustive-deps

  // Franja de 31 días: los que no tienen cupo se ven apagados.
  const libres = useMemo(() => Object.fromEntries((dias ?? []).map((d) => [d.fecha, d.horas])), [dias]);
  const visibles = fechas.slice(inicio, inicio + DIAS_VISIBLES);
  const horas = libres[dia] ?? [];

  async function confirmar() {
    if (!hora) return setError('Elige una hora.');
    if (!reagendar && motivo.trim().length < 5) return setError('Cuéntanos brevemente el motivo de la cita.');
    setEnviando(true); setError('');
    const base = { punto_atencion_id: sede, fecha: dia, hora };
    try {
      setHecha(reagendar ? await citasApi.reagendar(reagendar.id, base)
        : await citasApi.agendar({ ...base, afiliado_id: pacienteId, especialidad_codigo: codigo, motivo: motivo.trim() }));
    } catch (e) {
      setError(e.message);
      if (e.status === 409) cargar();   // alguien tomó la hora mientras tanto: se refresca
    } finally { setEnviando(false); }
  }

  if (hecha) {
    return (
      <section className="tarjeta flex flex-col items-start gap-5 p-6 md:p-8" role="status">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-dorado-100 text-xl text-dorado-700">✓</span>
        <div className="flex flex-col gap-1"><h2 className="text-2xl font-extrabold">{reagendar ? 'Cita reagendada' : 'Cita agendada'}</h2>
          <span className="text-azul-700">Te enviamos la confirmación por correo.</span></div>
        <dl className="grid w-full gap-4 rounded-[16px] bg-azul-50 p-5 sm:grid-cols-2">
          {[['Paciente', hecha.paciente], ['Especialidad', hecha.especialidad], ['Fecha y hora', `${fechaLarga(hecha.fecha)}, ${hora12(hecha.hora)}`],
            ['Sede', nombreSede(hecha.punto_atencion_id ?? sede)], ['Te atiende', hecha.doctor],
            ['Cuota moderadora', hecha.cuota_moderadora ? pesos(hecha.cuota_moderadora) : 'No aplica']].map(([k, v]) => (
            <div key={k}><dt className="text-xs tracking-wide text-dorado-700">{k}</dt><dd className="text-[15px] font-semibold first-letter:uppercase">{v}</dd></div>))}
        </dl>
        <button type="button" onClick={() => onListo(hecha)} className="btn-primario px-8">Listo</button>
      </section>
    );
  }

  return (
    <section className="tarjeta flex flex-col gap-6 p-6 md:p-7" aria-label={reagendar ? 'Reagendar cita' : 'Agendar una cita'}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1"><h2 className="text-xl font-extrabold">{reagendar ? `Reagendar ${reagendar.especialidad}` : 'Agendar una cita'}</h2>
          {reagendar && <span className="text-sm text-azul-600">Cita actual: {fechaLarga(reagendar.fecha)}, {hora12(reagendar.hora)}. Elige el nuevo día y la nueva hora.</span>}</div>
        <button type="button" onClick={onCancelar} className="text-sm font-semibold text-azul-600">Cerrar</button>
      </div>

      {!reagendar && (
        <fieldset className="flex flex-col gap-2.5"><legend className="etiqueta mb-2">¿Para quién es la cita?</legend>
          <div className="flex flex-wrap gap-2">{personas.map((p) => (
            <button key={p.id} type="button" aria-pressed={pacienteId === p.id} onClick={() => { setPacienteId(p.id); setHora(null); }}
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
          <Campo etiqueta="Sede" className="sm:max-w-md">{(id) => (
            <select id={id} className="campo" value={sede} onChange={(e) => setSede(e.target.value)}>
              {sedesEsp.map((s) => <option key={s.id} value={s.id}>{s.nombre} · {s.ciudad}{s.id === sedeInicial ? ' (tu IPS)' : ''}</option>)}
            </select>)}</Campo>
          {sedesEsp.length < sedes.length && esp && <span className="-mt-4 text-sm text-azul-500">{esp.nombre} se atiende en {sedesEsp.length === 1 ? 'esta sede' : `estas ${sedesEsp.length} sedes`}.</span>}

          {dias === null && !error && <Cargando texto="Buscando horarios disponibles…" />}
          {dias?.length === 0 && <Alerta tipo="aviso">No hay horarios disponibles en los próximos 30 días en esta sede. Prueba con otra sede o vuelve a revisar más tarde.</Alerta>}
          {dias?.length > 0 && (
            <>
              <div className="flex flex-col gap-2.5">
                <div className="flex items-center justify-between"><span className="etiqueta">Día</span>
                  <span className="hidden text-sm text-azul-500 sm:inline">{fechaLarga(visibles[0])} – {fechaLarga(visibles[visibles.length - 1])}</span></div>
                <div className="flex items-stretch gap-2">
                  <button type="button" aria-label="Días anteriores" disabled={inicio === 0} onClick={() => setInicio(Math.max(0, inicio - DIAS_VISIBLES))}
                    className="flex w-9 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-azul-100 text-xl text-azul-700 hover:bg-azul-50 disabled:opacity-30">‹</button>
                  <div className="grid flex-1 grid-cols-7 gap-1.5">{visibles.map((f) => {
                    const c = fechaCorta(f); const n = libres[f]?.length ?? 0; const sel = dia === f;
                    return (
                      <button key={f} type="button" disabled={!n} aria-pressed={sel} onClick={() => { setDia(f); setHora(null); }}
                        aria-label={`${fechaLarga(f)}: ${n ? `${n} horas libres` : 'sin cupos'}`}
                        className={`flex min-w-0 flex-col items-center gap-0.5 rounded-[14px] py-2.5 ${sel ? 'bg-azul-600 text-white' : n ? 'border-[1.5px] border-azul-100 bg-white text-azul-800 hover:border-azul-300' : 'cursor-not-allowed bg-azul-50/60 text-azul-300'}`}>
                        <span className="text-xs capitalize">{c.dia}</span><span className="font-display text-xl font-extrabold leading-none">{c.num}</span>
                        <span className="text-[11px] capitalize">{c.mes}</span>
                        <span className={`mt-1 rounded-full px-1.5 text-[10px] font-bold ${sel ? 'bg-white/20' : n ? 'bg-azul-50 text-azul-600' : ''}`}>{n ? n : '—'}</span>
                      </button>);
                  })}</div>
                  <button type="button" aria-label="Días siguientes" disabled={inicio + DIAS_VISIBLES >= TOTAL_DIAS} onClick={() => setInicio(Math.min(TOTAL_DIAS - DIAS_VISIBLES, inicio + DIAS_VISIBLES))}
                    className="flex w-9 shrink-0 items-center justify-center rounded-xl border-[1.5px] border-azul-100 text-xl text-azul-700 hover:bg-azul-50 disabled:opacity-30">›</button>
                </div>
              </div>

              {dia && (
                <div className="flex flex-col gap-3"><span className="etiqueta first-letter:uppercase">Hora · {fechaLarga(dia)}</span>
                  {!horas.length && <span className="text-sm text-azul-500">Este día no tiene horas libres.</span>}
                  {JORNADAS.map(([nombre, esDe]) => {
                    const lista = horas.filter((h) => esDe(h.hora));
                    if (!lista.length) return null;
                    return (
                      <div key={nombre} className="grid gap-2 sm:grid-cols-[88px_1fr] sm:items-start">
                        <span className="pt-2 text-sm font-semibold text-azul-500">{nombre}</span>
                        <div className="flex flex-wrap gap-2">{lista.map((h) => (
                          <button key={h.hora} type="button" aria-pressed={hora === h.hora} onClick={() => setHora(h.hora)}
                            className={`w-[92px] rounded-xl py-2 text-sm font-semibold ${hora === h.hora ? 'bg-dorado-400 text-azul-950' : 'border-[1.5px] border-azul-100 bg-white hover:border-azul-300'}`}>
                            {hora12(h.hora)}
                          </button>))}</div>
                      </div>);
                  })}
                </div>
              )}
            </>
          )}

          {hora && (
            <div className="flex flex-col gap-4 rounded-[16px] bg-azul-50 p-5">
              <dl className="grid gap-3 sm:grid-cols-2">
                {[['Fecha y hora', `${fechaLarga(dia)}, ${hora12(hora)}`], ['Sede', nombreSede(sede)],
                  ['Profesional', 'Se asigna al confirmar'], ['Cuota moderadora', reagendar ? 'Igual a la de la cita original' : cuota ? pesos(cuota) : 'No aplica']].map(([k, v]) => (
                  <div key={k}><dt className="text-xs tracking-wide text-dorado-700">{k}</dt><dd className="text-[15px] font-semibold first-letter:uppercase">{v}</dd></div>))}
              </dl>
              {!reagendar && <Campo etiqueta="Motivo de la consulta">{(id) => <textarea id={id} className="campo h-auto min-h-[84px] bg-white py-3" maxLength={500} placeholder="Ej.: control de presión arterial, dolor de cabeza frecuente…" value={motivo} onChange={(e) => setMotivo(e.target.value)} />}</Campo>}
            </div>
          )}
        </>
      )}

      {error && <Alerta>{error}</Alerta>}
      {hora && <button type="button" onClick={confirmar} disabled={enviando} className="btn-dorado self-end px-8"><Icono.calendario width={18} height={18} />{enviando ? 'Agendando…' : reagendar ? 'Confirmar nuevo horario' : 'Confirmar cita'}</button>}
    </section>
  );
}

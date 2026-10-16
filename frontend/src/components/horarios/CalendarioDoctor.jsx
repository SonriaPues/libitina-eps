import { Link } from 'react-router-dom';
import { fechaCorta, hora12, hoyIso } from '../../utils/formato.js';
import { aMin, bloqueadoEn, deMin, diaSemana, FIN, horaCorta, INICIO, RAYADO } from './comun.js';

const ALTO_HORA = 60;
const MARGEN = 10;                      // aire arriba y abajo para que se lean 6a y 9p
const top = (m) => MARGEN + ((m - INICIO) / 60) * ALTO_HORA;
const ALTO = top(FIN) + MARGEN;
const ESTILO = { confirmada: 'bg-dorado-100 border-dorado-500 text-azul-950', realizada: 'bg-emerald-50 border-emerald-600 text-emerald-900', no_asistio: 'bg-slate-100 border-slate-400 text-slate-600' };

// Semana del doctor en calendario: columnas = días, eje vertical de 6 a. m. a 9 p. m.
// El fondo azul es su turno; encima van las citas (clic para atender).
export default function CalendarioDoctor({ datos, fechas }) {
  const hoy = hoyIso();
  const horas = Array.from({ length: (FIN - INICIO) / 60 + 1 }, (_, i) => INICIO + i * 60);
  return (
    <div className="overflow-x-auto rounded-[18px] border border-azul-100 bg-white">
      <div className="grid min-w-[860px]" style={{ gridTemplateColumns: '56px repeat(7, 1fr)' }}>
        <div className="border-b border-azul-100 bg-azul-50/70" />
        {fechas.map((f) => { const c = fechaCorta(f); return (
          <div key={f} className={`border-b border-l border-azul-100 py-2.5 text-center text-sm ${f === hoy ? 'bg-azul-600 text-white' : 'bg-azul-50/70 text-azul-700'}`}>
            <span className="capitalize">{c.dia}</span> <span className="font-display font-extrabold">{c.num}</span></div>); })}
        <div className="relative" style={{ height: ALTO }}>
          {horas.map((m) => <span key={m} className="absolute right-2 -translate-y-1/2 text-[11px] text-azul-500" style={{ top: top(m) }}>{horaCorta(deMin(m))}</span>)}
        </div>
        {fechas.map((f) => {
          const ds = diaSemana(f);
          const bloqueo = bloqueadoEn(datos.excepciones, datos.doctores[0]?.doctor_id, f);
          return (
            <div key={f} className="relative border-l border-azul-100" style={{ height: ALTO, ...(bloqueo ? { background: RAYADO } : {}) }}>
              {horas.map((m) => <span key={m} className="absolute inset-x-0 border-t border-azul-50" style={{ top: top(m) }} />)}
              {!bloqueo && datos.turnos.filter((t) => t.dia_semana === ds).map((t) => (
                <div key={t.id} className="absolute inset-x-0 border-y border-azul-200 bg-azul-50" style={{ top: top(aMin(t.hora_inicio)), height: top(aMin(t.hora_fin)) - top(aMin(t.hora_inicio)) }} />))}
              {bloqueo && <span className="absolute inset-x-1 top-2 rounded bg-white/90 px-1.5 py-1 text-center text-[11px] font-semibold text-azul-700">Bloqueado · {bloqueo.motivo}</span>}
              {datos.citas.filter((c) => c.fecha === f).map((c) => {
                const alto = Math.max(top(aMin(c.hora_fin)) - top(aMin(c.hora_inicio)) - 2, 16);
                const cuerpo = <><span className="font-bold">{hora12(c.hora_inicio).replace(' a. m.', 'a').replace(' p. m.', 'p')}</span> {c.paciente}</>;
                const clase = `absolute inset-x-1 overflow-hidden truncate whitespace-nowrap rounded-md border-l-[3px] px-1.5 py-[2px] text-[11px] leading-tight ${ESTILO[c.estado] ?? ESTILO.confirmada}`;
                const estilo = { top: top(aMin(c.hora_inicio)) + 1, height: alto };
                return ['confirmada', 'realizada'].includes(c.estado)
                  ? <Link key={c.id} to={`/doctor/citas/${c.id}`} className={`${clase} hover:shadow-md`} style={estilo} title={`${c.hora_inicio} · ${c.paciente}`}>{cuerpo}</Link>
                  : <span key={c.id} className={clase} style={estilo} title={`${c.hora_inicio} · ${c.paciente} (no asistió)`}>{cuerpo}</span>;
              })}
            </div>);
        })}
      </div>
    </div>
  );
}

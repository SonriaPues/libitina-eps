import { useEffect, useRef, useState } from 'react';
import { ajustar, aMin, bloqueadoEn, colorDe, deMin, diaSemana, FIN, horaCorta, INICIO, RAYADO } from './comun.js';

const TOTAL = FIN - INICIO;
const pct = (m) => `${((m - INICIO) / TOTAL) * 100}%`;
const HORAS = Array.from({ length: TOTAL / 60 + 1 }, (_, i) => INICIO + i * 60);
const COLOR_CITA = { confirmada: '#F6C220', realizada: '#10B981', no_asistio: '#94A3B8', pendiente: '#F6C220' };

// Un día de una sede, tipo Gantt: filas = doctores, eje de 6 a. m. a 9 p. m.
// Arrastrar una barra la mueve; arrastrar sus bordes la estira; arrastrar sobre un espacio vacío crea un turno.
export default function GanttDia({ datos, fecha, editable, onCambiar, onCrear, onEditar }) {
  const [drag, setDrag] = useState(null);   // { tipo, doctor, turno, x0, ancho, ini0, fin0, ini, fin, movio }
  const ref = useRef(drag); ref.current = drag;
  const { doctores, turnos, citas, excepciones } = datos;
  const ds = diaSemana(fecha);

  useEffect(() => {
    if (!drag) return undefined;
    const mover = (e) => {
      const d = ref.current; const delta = ((e.clientX - d.x0) / d.ancho) * TOTAL;
      let { ini, fin } = d;
      if (d.tipo === 'mover') { const largo = d.fin0 - d.ini0; ini = ajustar(d.ini0 + delta); ini = Math.min(ini, FIN - largo); fin = ini + largo; }
      if (d.tipo === 'inicio') ini = Math.min(ajustar(d.ini0 + delta), d.fin0 - 30);
      if (d.tipo === 'fin') fin = Math.max(ajustar(d.fin0 + delta), d.ini0 + 30);
      if (d.tipo === 'crear') { const p = ajustar(d.ini0 + delta); ini = Math.min(d.ini0, p); fin = Math.max(d.ini0, p); }
      setDrag({ ...d, ini, fin, movio: d.movio || Math.abs(e.clientX - d.x0) > 4 });
    };
    const soltar = () => {
      const d = ref.current; setDrag(null);
      if (!d.movio) { if (d.turno) onEditar(d.doctor, d.turno); else onCrear(d.doctor, { dia_semana: ds, hora_inicio: deMin(Math.min(d.ini0, FIN - 120)), hora_fin: deMin(Math.min(d.ini0, FIN - 120) + 120) }, true); return; }
      const nuevo = { dia_semana: ds, hora_inicio: deMin(d.ini), hora_fin: deMin(d.fin) };
      if (d.turno && (d.ini !== d.ini0 || d.fin !== d.fin0)) onCambiar(d.turno, nuevo);
      if (!d.turno && d.fin - d.ini >= 30) onCrear(d.doctor, nuevo, false);
    };
    window.addEventListener('pointermove', mover); window.addEventListener('pointerup', soltar);
    return () => { window.removeEventListener('pointermove', mover); window.removeEventListener('pointerup', soltar); };
  }, [drag !== null]); // eslint-disable-line react-hooks/exhaustive-deps

  const empezar = (e, tipo, doctor, turno) => {
    if (!editable || e.button !== 0) return;
    e.preventDefault(); e.stopPropagation();
    const fila = e.currentTarget.closest('[data-fila]').getBoundingClientRect();
    const minuto = INICIO + ((e.clientX - fila.left) / fila.width) * TOTAL;
    const ini0 = turno ? aMin(turno.hora_inicio) : ajustar(minuto); const fin0 = turno ? aMin(turno.hora_fin) : ini0;
    setDrag({ tipo, doctor, turno, x0: e.clientX, ancho: fila.width, ini0, fin0, ini: ini0, fin: fin0, movio: false });
  };

  return (
    <div className="overflow-x-auto rounded-[18px] border border-azul-100 bg-white select-none">
      <div className="min-w-[980px]">
        <div className="flex border-b border-azul-100 bg-azul-50/70">
          <div className="w-[220px] shrink-0 px-4 py-3 text-sm font-semibold text-azul-700">Profesional</div>
          <div className="relative h-11 flex-1">{HORAS.map((m) => (
            <span key={m} className="absolute top-3 -translate-x-1/2 text-xs font-semibold text-azul-500" style={{ left: pct(m) }}>{horaCorta(deMin(m))}</span>))}</div>
          <div className="w-4 shrink-0" />
        </div>
        {doctores.map((d) => {
          const [fondo, trazo] = colorDe(d.especialidad_codigo);
          const suyos = turnos.filter((t) => t.doctor_id === d.doctor_id && t.dia_semana === ds);
          const bloqueo = bloqueadoEn(excepciones, d.doctor_id, fecha);
          const deCitas = citas.filter((c) => c.doctor_id === d.doctor_id && c.fecha === fecha);
          const creando = drag?.tipo === 'crear' && drag.doctor.doctor_id === d.doctor_id && drag.movio;
          return (
            <div key={d.doctor_id} className="flex border-b border-azul-50 last:border-0">
              <div className="flex w-[220px] shrink-0 items-start gap-2 px-4 py-3">
                <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: trazo }} />
                <span className="flex min-w-0 flex-col"><span className="truncate text-sm font-semibold" title={d.nombre}>{d.nombre}</span>
                  <span className="truncate text-xs text-azul-500">{d.especialidad} · {deCitas.length} {deCitas.length === 1 ? 'cita' : 'citas'}</span></span>
              </div>
              <div data-fila className={`relative h-[58px] flex-1 ${editable ? 'cursor-crosshair' : ''}`} style={bloqueo ? { background: RAYADO } : undefined}
                onPointerDown={(e) => empezar(e, 'crear', d, null)} title={bloqueo ? `Bloqueado: ${bloqueo.motivo}` : undefined}>
                {HORAS.map((m) => <span key={m} className="pointer-events-none absolute inset-y-0 border-l border-azul-50" style={{ left: pct(m) }} />)}
                {suyos.map((t) => {
                  const activo = drag?.turno?.id === t.id;
                  const ini = activo ? drag.ini : aMin(t.hora_inicio); const fin = activo ? drag.fin : aMin(t.hora_fin);
                  return (
                    <div key={t.id} className={`absolute top-2 bottom-2 rounded-lg border-l-[3px] ${editable ? 'cursor-grab' : ''} ${activo ? 'shadow-lg ring-2 ring-dorado-400' : ''}`}
                      style={{ left: pct(ini), width: pct(INICIO + fin - ini), background: fondo, borderColor: trazo }}
                      onPointerDown={(e) => empezar(e, 'mover', d, t)} role="button" aria-label={`Turno de ${t.hora_inicio} a ${t.hora_fin}`}>
                      <span className="pointer-events-none absolute left-2 top-0.5 text-[11px] font-bold" style={{ color: trazo }}>{horaCorta(deMin(ini))}–{horaCorta(deMin(fin))}</span>
                      {editable && <>
                        <span className="absolute inset-y-0 -left-1 w-3 cursor-ew-resize" onPointerDown={(e) => empezar(e, 'inicio', d, t)} />
                        <span className="absolute inset-y-0 -right-1 w-3 cursor-ew-resize" onPointerDown={(e) => empezar(e, 'fin', d, t)} />
                      </>}
                    </div>);
                })}
                {creando && <div className="pointer-events-none absolute top-2 bottom-2 rounded-lg border-2 border-dashed border-dorado-500 bg-dorado-100/70"
                  style={{ left: pct(drag.ini), width: pct(INICIO + drag.fin - drag.ini) }}>
                  <span className="absolute left-2 top-0.5 text-[11px] font-bold text-dorado-800">{horaCorta(deMin(drag.ini))}–{horaCorta(deMin(drag.fin))}</span></div>}
                {deCitas.map((c) => (
                  <span key={c.id} className="pointer-events-auto absolute bottom-3 h-3 rounded-sm border border-white" title={`${c.hora_inicio} · ${c.paciente ?? 'Cita'} (${c.estado})`}
                    style={{ left: pct(aMin(c.hora_inicio)), width: pct(INICIO + aMin(c.hora_fin) - aMin(c.hora_inicio)), background: COLOR_CITA[c.estado] ?? '#F6C220' }} />))}
              </div>
              <div className="w-4 shrink-0" />
            </div>);
        })}
      </div>
    </div>
  );
}

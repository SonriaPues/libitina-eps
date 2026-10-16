import { useState } from 'react';
import { fechaCorta, hoyIso } from '../../utils/formato.js';
import { aMin, bloqueadoEn, colorDe, diaSemana, horaCorta, RAYADO } from './comun.js';

// Semana de una sede: filas = doctores, columnas = días. Cada turno es una ficha que se puede
// arrastrar a otro día de la misma fila; un clic en un espacio vacío crea un turno.
export default function MallaSemana({ datos, fechas, editable, onMover, onNuevo, onEditar }) {
  const [arrastrando, setArrastrando] = useState(null);     // turno que se está arrastrando
  const [destino, setDestino] = useState(null);             // celda bajo el cursor: `${doctor}|${dia}`
  const hoy = hoyIso();
  const { doctores, turnos, citas, excepciones } = datos;

  const soltar = (doctor, fecha) => {
    const t = arrastrando; setArrastrando(null); setDestino(null);
    if (t && t.doctor_id === doctor.doctor_id && t.dia_semana !== diaSemana(fecha)) onMover(t, { dia_semana: diaSemana(fecha), hora_inicio: t.hora_inicio, hora_fin: t.hora_fin });
  };

  return (
    <div className="overflow-x-auto rounded-[18px] border border-azul-100 bg-white">
      <table className="w-full min-w-[980px] table-fixed border-collapse text-sm">
        <thead>
          <tr className="bg-azul-50/70">
            <th className="sticky left-0 z-10 w-[220px] bg-azul-50 px-4 py-3 text-left font-semibold text-azul-700">Profesional</th>
            {fechas.map((f) => { const c = fechaCorta(f); return (
              <th key={f} className={`px-2 py-3 text-center font-semibold ${f === hoy ? 'text-azul-600' : 'text-azul-700'}`}>
                <span className="capitalize">{c.dia}</span> <span className="font-display text-base font-extrabold">{c.num}</span>{f === hoy && <span className="ml-1 rounded-full bg-azul-600 px-1.5 text-[10px] text-white">hoy</span>}
              </th>); })}
          </tr>
        </thead>
        <tbody>
          {doctores.map((d) => {
            const [fondo, trazo] = colorDe(d.especialidad_codigo);
            return (
              <tr key={d.doctor_id} className="border-t border-azul-50">
                <th scope="row" className="sticky left-0 z-10 bg-white px-4 py-2.5 text-left align-top font-normal">
                  <span className="flex items-start gap-2"><span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: trazo }} />
                    <span className="flex min-w-0 flex-col"><span className="truncate font-semibold text-azul-900" title={d.nombre}>{d.nombre}</span>
                      <span className="truncate text-xs text-azul-500">{d.especialidad}{!d.activo && ' · inactivo'}</span></span></span>
                </th>
                {fechas.map((f) => {
                  const ds = diaSemana(f);
                  const suyos = turnos.filter((t) => t.doctor_id === d.doctor_id && t.dia_semana === ds);
                  const bloqueo = bloqueadoEn(excepciones, d.doctor_id, f);
                  const n = citas.filter((c) => c.doctor_id === d.doctor_id && c.fecha === f).length;
                  const clave = `${d.doctor_id}|${f}`;
                  const valido = arrastrando?.doctor_id === d.doctor_id;
                  return (
                    <td key={f} className={`h-[64px] border-l border-azul-50 p-1.5 align-top ${destino === clave && valido ? 'bg-dorado-50 outline-dashed outline-2 -outline-offset-2 outline-dorado-400' : ''}`}
                      style={bloqueo ? { background: RAYADO } : undefined}
                      onDragOver={(e) => { if (valido) { e.preventDefault(); setDestino(clave); } }} onDragLeave={() => setDestino(null)}
                      onDrop={(e) => { e.preventDefault(); soltar(d, f); }}
                      onClick={(e) => { if (editable && e.target === e.currentTarget) onNuevo(d, { dia_semana: ds }); }}
                      title={bloqueo ? `Bloqueado: ${bloqueo.motivo}` : editable && !suyos.length ? 'Clic para agregar un turno' : undefined}>
                      <div className="flex flex-col gap-1">
                        {suyos.map((t) => (
                          <button key={t.id} type="button" draggable={editable} onDragStart={(e) => { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', t.id); setArrastrando(t); }}
                            onDragEnd={() => { setArrastrando(null); setDestino(null); }} onClick={() => editable && onEditar(d, t)}
                            className={`flex w-full items-center justify-between gap-1 rounded-lg border-l-[3px] px-2 py-1 text-left text-xs font-semibold ${editable ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'} ${arrastrando?.id === t.id ? 'opacity-40' : ''}`}
                            style={{ background: fondo, borderColor: trazo, color: trazo }} aria-label={`Turno ${t.hora_inicio} a ${t.hora_fin}`}>
                            <span>{horaCorta(t.hora_inicio)}–{horaCorta(t.hora_fin)}</span>
                            <span className="font-normal opacity-70">{Math.round((aMin(t.hora_fin) - aMin(t.hora_inicio)) / 60 * 10) / 10}h</span>
                          </button>))}
                        {bloqueo && <span className="rounded bg-white/80 px-1.5 text-[11px] font-semibold text-azul-700">Bloqueado</span>}
                        {n > 0 && <span className="px-1 text-[11px] text-azul-600">{n} {n === 1 ? 'cita' : 'citas'}</span>}
                      </div>
                    </td>);
                })}
              </tr>);
          })}
        </tbody>
      </table>
    </div>
  );
}

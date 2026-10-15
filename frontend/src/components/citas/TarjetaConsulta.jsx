import { fechaHora } from '../../utils/formato.js';

const SIGNOS = [['tension_arterial', 'Tensión', ''], ['frecuencia_cardiaca', 'F. cardiaca', ' lpm'], ['frecuencia_respiratoria', 'F. respiratoria', ' rpm'],
  ['temperatura', 'Temperatura', ' °C'], ['saturacion', 'Saturación', ' %'], ['peso_kg', 'Peso', ' kg'], ['talla_cm', 'Talla', ' cm']];

// Una consulta de la historia clínica (la usan el afiliado y el doctor).
export default function TarjetaConsulta({ c }) {
  const signos = SIGNOS.filter(([k]) => c.signos_vitales?.[k] != null);
  return (
    <article className="tarjeta flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <span className="flex flex-col"><span className="font-display text-[17px] font-bold">{c.especialidad || 'Consulta'}</span><span className="text-sm text-azul-600">{c.doctor_nombre} · {fechaHora(c.fecha)}</span></span>
        <span className="rounded-lg bg-azul-50 px-2.5 py-1 font-mono text-xs font-semibold text-azul-800">{c.cie10}</span>
      </div>
      <p className="text-[15px]"><strong>Diagnóstico:</strong> {c.diagnostico}</p>
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs tracking-wide text-dorado-600">Motivo</dt><dd>{c.motivo}</dd></div>
        {c.enfermedad_actual && <div><dt className="text-xs tracking-wide text-dorado-600">Enfermedad actual</dt><dd>{c.enfermedad_actual}</dd></div>}
        {c.examen_fisico && <div><dt className="text-xs tracking-wide text-dorado-600">Examen físico</dt><dd>{c.examen_fisico}</dd></div>}
        <div><dt className="text-xs tracking-wide text-dorado-600">Tratamiento</dt><dd>{c.tratamiento}</dd></div>
        {c.observaciones && <div><dt className="text-xs tracking-wide text-dorado-600">Observaciones</dt><dd>{c.observaciones}</dd></div>}
      </dl>
      {signos.length > 0 && <div className="flex flex-wrap gap-2">{signos.map(([k, t, u]) => <span key={k} className="rounded-lg bg-fondo px-2.5 py-1 text-xs"><strong>{t}:</strong> {c.signos_vitales[k]}{u}</span>)}</div>}
    </article>
  );
}

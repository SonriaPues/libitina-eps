import { useState } from 'react';
import { Link } from 'react-router-dom';
import Encabezado from '../components/ui/Encabezado.jsx';
import { Chequeo } from '../components/ui/Controles.jsx';
import { SERVICIOS } from '../data/beneficios.js';

const EXCLUSIONES = ['Tratamientos cosméticos o estéticos sin relación con recuperar la salud', 'Tecnologías sin evidencia científica de seguridad o eficacia', 'Tratamientos experimentales o en fase de investigación', 'Servicios que deban prestarse en el exterior'];
const MIPRES = [['Tu médico lo prescribe', 'Lo registra en MIPRES, la plataforma del Ministerio de Salud.'], ['Libitina lo gestiona', 'Revisamos la prescripción y coordinamos la entrega con la IPS.'], ['Lo recibes', 'Te avisamos dónde y cuándo reclamarlo, sin trámites adicionales.']];

export default function Beneficios() {
  const [sel, setSel] = useState(0);
  const s = SERVICIOS[sel];
  return (
    <>
      <Encabezado migas={[{ texto: 'Afiliados', ruta: '/afiliacion' }, { texto: 'Plan de beneficios' }]} titulo="Plan de beneficios en salud" texto="Lo que cubre tu afiliación, lo que no, y qué hacer si necesitas algo que no está en el plan." />
      <section className="contenedor pt-14">
        <div className="mb-6 flex flex-col gap-2.5"><span className="antetitulo">Qué incluye</span><h2 className="text-3xl font-extrabold md:text-4xl">Elige un servicio para ver el detalle</h2></div>
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="grid content-start gap-2.5 sm:grid-cols-2 lg:col-span-5">
            {SERVICIOS.map((x, i) => (
              <button key={x.nombre} type="button" aria-pressed={sel === i} onClick={() => setSel(i)}
                className={`min-h-16 rounded-[14px] border-[1.5px] px-4 py-3.5 text-left font-display text-[15px] font-bold transition-colors ${sel === i ? 'border-dorado-400 bg-dorado-400 text-azul-950' : 'border-azul-100 bg-white text-azul-900 hover:border-azul-300'}`}>{x.nombre}</button>
            ))}
          </div>
          <div className="flex flex-col gap-4 rounded-3xl bg-azul-950 p-8 md:p-9 lg:col-span-7" aria-live="polite">
            <span className="text-xs tracking-wide text-dorado-400">Incluido en el plan</span>
            <h3 className="text-3xl font-extrabold text-white">{s.nombre}</h3>
            <p className="text-[17px] leading-relaxed text-azul-100">{s.desc}</p>
            <ul className="flex flex-col gap-2.5">{s.items.map((i) => <li key={i} className="flex gap-3 text-[15px] text-azul-200"><Chequeo />{i}</li>)}</ul>
            <p className="mt-auto border-t border-azul-800 pt-4 text-sm text-azul-200">{s.pago}</p>
          </div>
        </div>
      </section>
      <section className="contenedor pt-24">
        <div className="grid gap-10 lg:grid-cols-12">
          <div className="flex flex-col gap-3.5 lg:col-span-5"><span className="text-[13px] font-semibold tracking-[2px] text-red-700">Qué no cubre</span><h2 className="text-3xl font-extrabold leading-tight md:text-4xl">Lo que no se financia con recursos de la salud</h2><p className="leading-relaxed text-azul-700">La Ley 1751 de 2015 señala los casos que no se pagan con recursos públicos de salud.</p></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-7">{EXCLUSIONES.map((e) => <div key={e} className="rounded-2xl border border-red-100 bg-white p-5 text-[15px] leading-relaxed">{e}</div>)}</div>
        </div>
      </section>
      <section className="contenedor py-24">
        <div className="flex flex-col gap-7 rounded-[28px] border border-dorado-200 bg-dorado-50 p-8 md:p-11">
          <div className="flex flex-col gap-2.5"><span className="text-[13px] font-semibold tracking-[2px] text-dorado-700">Fuera del plan, pero necesario</span><h2 className="text-2xl font-extrabold md:text-[32px]">¿Tu médico te formuló algo que no está en el plan?</h2></div>
          <ol className="grid gap-4 md:grid-cols-3">
            {MIPRES.map(([t, d], i) => <li key={t} className="flex flex-col gap-2 rounded-[18px] bg-white p-6"><span className="font-display text-2xl font-extrabold text-dorado-500">0{i + 1}</span><span className="font-display text-[17px] font-bold">{t}</span><span className="text-[15px] leading-relaxed text-azul-700">{d}</span></li>)}
          </ol>
          <Link to="/medicamentos" className="self-start text-[15px] font-semibold text-azul-600">Consultar medicamentos cubiertos</Link>
        </div>
      </section>
    </>
  );
}

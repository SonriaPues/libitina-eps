import { useState } from 'react';
import Encabezado from '../components/ui/Encabezado.jsx';
import { Segmentado } from '../components/ui/Controles.jsx';
import { pesos } from '../utils/formato.js';

// Valores 2026: Circular Externa 048 de 2025 (MinSalud), UVB $12.110 (Resolución 3488 de 2025).
const CUOTAS = [5000, 20100, 52800];
const PCT = [0.115, 0.173, 0.23];
const TOPE_EVENTO = [373715, 1497644, 2995409];
const SUBSIDIADO = { pct: 0.1, tope: 651155 };

function calcular({ reg, rol, rango, tipo, valor }) {
  const r = Number(rango);
  if (tipo === 'ambulatorio') {
    return reg === 'subsidiado'
      ? { titulo: 'Cuota moderadora por servicio', valor: 0, nota: 'El régimen subsidiado no paga cuotas moderadoras.' }
      : { titulo: 'Cuota moderadora por servicio', valor: CUOTAS[r], nota: 'Valor fijo por cada consulta, examen o fórmula ambulatoria.' };
  }
  if (reg === 'contributivo' && rol === 'cotizante') return { titulo: 'Copago estimado', valor: 0, nota: 'El cotizante no paga copagos; solo sus beneficiarios.' };
  const pct = reg === 'contributivo' ? PCT[r] : SUBSIDIADO.pct;
  const tope = reg === 'contributivo' ? TOPE_EVENTO[r] : SUBSIDIADO.tope;
  const bruto = Math.max(0, Number(valor) || 0) * pct;
  const txt = `${String(Math.round(pct * 1000) / 10).replace('.', ',')} % del valor del servicio`;
  return { titulo: 'Copago estimado', valor: Math.min(bruto, tope), nota: bruto > tope ? `${txt}, limitado al tope por evento de ${pesos(tope)}.` : `${txt}.`, pideValor: true };
}

const Fila = ({ cols, celdas, cabecera }) => (
  <div className={`grid gap-3 py-3 ${cabecera ? 'border-b border-azul-100 text-xs tracking-wide text-azul-400' : 'border-b border-azul-50 text-[15px] last:border-0'}`} style={{ gridTemplateColumns: cols }}>
    {celdas.map((c, i) => <span key={i} className={!cabecera && i === celdas.length - 1 ? 'font-bold' : ''}>{c}</span>)}
  </div>
);

export default function Copagos() {
  const [f, setF] = useState({ reg: 'contributivo', rol: 'beneficiario', rango: '0', tipo: 'ambulatorio', valor: '1500000' });
  const set = (k) => (v) => setF((x) => ({ ...x, [k]: v }));
  const res = calcular(f);
  return (
    <>
      <Encabezado migas={[{ texto: 'Afiliados', ruta: '/afiliacion' }, { texto: 'Copagos y cuotas moderadoras' }]} titulo="Copagos y cuotas moderadoras 2026" texto="Calcula cuánto te corresponde pagar por un servicio según tu régimen y tu ingreso.">
        <div className="shrink-0 rounded-2xl border border-azul-700 px-5 py-4"><span className="block text-xs tracking-wide text-dorado-400">UVB 2026</span><span className="font-display text-2xl font-extrabold text-white">$12.110</span></div>
      </Encabezado>
      <div className="contenedor grid items-start gap-7 pt-11 lg:grid-cols-12">
        <section className="overflow-hidden rounded-[22px] border border-azul-100 bg-white lg:col-span-5" aria-labelledby="calc">
          <div className="flex flex-col gap-5 p-7">
            <h2 id="calc" className="text-[22px] font-extrabold">Calculadora</h2>
            <div className="flex flex-col gap-2"><span className="etiqueta">Régimen</span><Segmentado opciones={[['contributivo', 'Contributivo'], ['subsidiado', 'Subsidiado']]} valor={f.reg} onCambio={set('reg')} /></div>
            {f.reg === 'contributivo' && (
              <>
                <div className="flex flex-col gap-2"><span className="etiqueta">¿Quién recibe el servicio?</span><Segmentado opciones={[['cotizante', 'Cotizante'], ['beneficiario', 'Beneficiario']]} valor={f.rol} onCambio={set('rol')} /></div>
                <div className="flex flex-col gap-2"><label htmlFor="rango" className="etiqueta">Ingreso del cotizante</label>
                  <select id="rango" className="campo" value={f.rango} onChange={(e) => set('rango')(e.target.value)}>
                    <option value="0">Menos de 2 salarios mínimos</option><option value="1">Entre 2 y 5 salarios mínimos</option><option value="2">Más de 5 salarios mínimos</option>
                  </select></div>
              </>
            )}
            <div className="flex flex-col gap-2"><span className="etiqueta">Tipo de servicio</span><Segmentado opciones={[['ambulatorio', 'Consulta o examen'], ['hospitalario', 'Cirugía u hospitalización']]} valor={f.tipo} onCambio={set('tipo')} />
              <span className="text-[13px] text-azul-500">{f.tipo === 'ambulatorio' ? 'Consultas, laboratorio, imágenes y fórmulas ambulatorias.' : 'Procedimientos, cirugías y hospitalización.'}</span></div>
            {res.pideValor && <div className="flex flex-col gap-2"><label htmlFor="valor" className="etiqueta">Valor del servicio (COP)</label><input id="valor" type="number" min="0" step="1000" className="campo" value={f.valor} onChange={(e) => set('valor')(e.target.value)} /></div>}
          </div>
          <div className="flex flex-col gap-1.5 bg-azul-900 px-7 py-6" aria-live="polite">
            <span className="text-xs tracking-wide text-dorado-400">{res.titulo}</span>
            <span className="font-display text-4xl font-extrabold text-white">{pesos(res.valor)}</span>
            <span className="text-sm leading-relaxed text-azul-200">{res.nota}</span>
          </div>
        </section>
        <div className="flex flex-col gap-5 lg:col-span-7">
          <section className="tarjeta flex flex-col gap-3.5 p-7">
            <div className="flex flex-col gap-1"><h2 className="text-xl font-extrabold">Cuotas moderadoras · contributivo</h2><span className="text-sm text-azul-500">Valor fijo por consulta, examen o fórmula. La pagan cotizantes y beneficiarios.</span></div>
            <div className="overflow-x-auto"><div className="min-w-[420px]">
              <Fila cabecera cols="2fr 1fr 1fr" celdas={['Ingreso del cotizante', 'UVB', 'Valor']} />
              <Fila cols="2fr 1fr 1fr" celdas={['Menos de 2 SMLMV', '0,411', '$5.000']} />
              <Fila cols="2fr 1fr 1fr" celdas={['Entre 2 y 5 SMLMV', '1,66', '$20.100']} />
              <Fila cols="2fr 1fr 1fr" celdas={['Más de 5 SMLMV', '4,36', '$52.800']} />
            </div></div>
          </section>
          <section className="tarjeta flex flex-col gap-3.5 p-7">
            <div className="flex flex-col gap-1"><h2 className="text-xl font-extrabold">Copagos</h2><span className="text-sm text-azul-500">Porcentaje del valor del servicio. Lo pagan los beneficiarios del contributivo y los afiliados del subsidiado; el cotizante no paga copago.</span></div>
            <div className="overflow-x-auto"><div className="min-w-[520px]">
              <Fila cabecera cols="1.6fr .7fr 1fr 1fr" celdas={['Régimen e ingreso', '%', 'Tope evento', 'Tope año']} />
              <Fila cols="1.6fr .7fr 1fr 1fr" celdas={['Contributivo · menos de 2', '11,5 %', '$373.715', '$748.882']} />
              <Fila cols="1.6fr .7fr 1fr 1fr" celdas={['Contributivo · 2 a 5', '17,3 %', '$1.497.644', '$2.995.409']} />
              <Fila cols="1.6fr .7fr 1fr 1fr" celdas={['Contributivo · más de 5', '23 %', '$2.995.409', '$5.990.696']} />
              <Fila cols="1.6fr .7fr 1fr 1fr" celdas={['Subsidiado', '10 %', '$651.155', '$1.302.309']} />
            </div></div>
          </section>
        </div>
      </div>
      <section className="contenedor pt-11">
        <div className="flex flex-col gap-5 rounded-[22px] border border-dorado-200 bg-dorado-50 p-8">
          <h2 className="text-[22px] font-extrabold">No pagas copago en</h2>
          <ul className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-5">{['Promoción y prevención', 'Control prenatal, parto y puerperio', 'Enfermedades transmisibles', 'Enfermedades de alto costo', 'Atención inicial de urgencias'].map((x) => <li key={x} className="rounded-[14px] bg-white p-4 text-[15px] leading-snug">{x}</li>)}</ul>
        </div>
      </section>
      <p className="contenedor pb-24 pt-6 text-[13px] leading-relaxed text-azul-500">Valores vigentes desde el 1 de enero de 2026 según la Circular Externa 048 de 2025 del Ministerio de Salud, con la UVB fijada por la Resolución 3488 de 2025. El resultado de la calculadora es orientativo: los topes son acumulados por año y la EPS aplica las exenciones de cada caso.</p>
    </>
  );
}

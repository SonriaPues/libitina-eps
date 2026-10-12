import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Monograma } from '../components/ui/Marca.jsx';
import { Chips } from '../components/ui/Controles.jsx';

const MIEMBROS = [['Laura Camila Rodríguez', 'CC 1012345678', 'Cotizante'], ['Andrés Rodríguez', 'CC 80123456', 'Beneficiario · Cónyuge'], ['Tomás Rodríguez', 'RC 1098765432', 'Beneficiario · Hijo']];
const VENTAJAS = [['Siempre actualizado', 'Si cambias de IPS o de régimen, tu carné cambia solo.'], ['Código QR verificable', 'La IPS lo escanea y confirma tu afiliación al instante.'], ['Toda tu familia', 'Cambia entre tu carné y el de cada beneficiario.']];

export default function Carne() {
  const [sel, setSel] = useState(0);
  const [nombre, doc, tipo] = MIEMBROS[sel];
  return (
    <section className="bg-fondo px-5 py-16 md:px-10 md:py-20">
      <div className="mx-auto grid max-w-sitio items-center gap-14 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <span className="text-[13px] text-azul-500">Trámites › Carné digital</span>
          <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight md:text-[50px]">Tu carné, siempre en el celular</h1>
          <p className="max-w-[540px] text-lg leading-relaxed text-azul-700">Muestra tu carné digital en la IPS, en urgencias o en la farmacia. El de tu grupo familiar también está ahí.</p>
          <ul className="flex flex-col gap-3.5">{VENTAJAS.map(([t, d]) => (
            <li key={t} className="flex items-start gap-3.5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-azul-50 font-extrabold text-azul-600">✓</span><span className="flex flex-col"><span className="font-display text-[17px] font-bold">{t}</span><span className="text-[15px] text-azul-700">{d}</span></span></li>
          ))}</ul>
          <Link to="/iniciar-sesion" className="btn-primario mt-1.5 self-start px-7 py-4 text-base">Ver mi carné</Link>
        </div>
        <div className="flex flex-col items-center gap-5">
          <div className="w-[320px] rounded-[44px] bg-azul-950 p-3.5 shadow-2xl shadow-azul-950/25 sm:w-[340px]">
            <div className="flex min-h-[540px] flex-col gap-4 rounded-[32px] bg-white px-5 pb-7 pt-6">
              <span className="text-center font-display text-[17px] font-extrabold">Carné digital</span>
              <div className="flex flex-col gap-4 rounded-[22px] bg-azul-900 p-5" aria-live="polite">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2"><span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-white"><Monograma alto={28} /></span><span className="font-display text-sm font-extrabold text-white">LIBITINA <span className="text-dorado-400">EPS</span></span></span>
                  <span className="rounded-full bg-dorado-400 px-2.5 py-1 text-[11px] font-bold text-azul-950">Vigente</span>
                </div>
                <div className="flex flex-col"><span className="font-display text-xl font-extrabold text-white">{nombre}</span><span className="text-[13px] text-azul-200">{doc}</span></div>
                <dl className="grid grid-cols-2 gap-3">{[['Régimen', 'Contributivo'], ['Tipo', tipo], ['IPS', 'Sede Chapinero'], ['Afiliado desde', '22 sep 2026']].map(([k, v]) => (
                  <div key={k}><dt className="text-[10px] tracking-wide text-dorado-400">{k}</dt><dd className="text-[13px] text-white">{v}</dd></div>
                ))}</dl>
              </div>
              <div className="flex flex-col items-center gap-2"><span className="flex h-36 w-36 items-center justify-center rounded-[14px] border-2 border-dashed border-azul-200 text-[13px] text-azul-400">Código QR</span><span className="text-xs text-azul-500">Muéstralo en la IPS para verificar</span></div>
            </div>
          </div>
          <Chips opciones={MIEMBROS.map((m, i) => [i, m[0].split(' ')[0]])} valor={sel} onCambio={setSel} />
        </div>
      </div>
    </section>
  );
}

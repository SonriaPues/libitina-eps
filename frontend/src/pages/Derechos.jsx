import { useState } from 'react';
import { Link } from 'react-router-dom';
import Foto from '../components/ui/Foto.jsx';
import { Segmentado } from '../components/ui/Controles.jsx';
import { Icono } from '../components/ui/Iconos.jsx';
import { DERECHOS, DEBERES } from '../data/derechos.js';

export default function Derechos() {
  const [tab, setTab] = useState('derechos');
  const der = tab === 'derechos';
  return (
    <>
      <section className="bg-dorado-50 px-5 py-16 md:px-10">
        <div className="mx-auto grid max-w-sitio items-center gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <nav aria-label="Ruta" className="text-[13px] text-dorado-700"><Link to="/afiliacion">Afiliados</Link> › Derechos y deberes</nav>
            <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight md:text-[50px]">Tus derechos y deberes en salud</h1>
            <p className="max-w-[580px] text-lg leading-relaxed text-dorado-800">La salud es un derecho fundamental. Conocer lo que puedes exigir y lo que te corresponde hace que el sistema funcione mejor para todos.</p>
          </div>
          <div className="h-72 overflow-hidden rounded-[28px] rounded-tl-[160px] md:h-80 lg:col-span-5"><Foto src="/images/derechos/derechos-hero.jpg" alt="Médica explicando un diagnóstico a una familia" /></div>
        </div>
      </section>
      <section className="contenedor py-16">
        <div className="mb-7 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <Segmentado className="w-full md:w-[420px]" opciones={[['derechos', 'Mis derechos'], ['deberes', 'Mis deberes']]} valor={tab} onCambio={setTab} />
          <span className="text-sm text-azul-500">Basado en la Ley 1751 de 2015 y la Resolución 229 de 2020</span>
        </div>
        <h2 className="mb-7 text-3xl font-extrabold md:text-[34px]">{der ? 'Como afiliado tienes derecho a' : 'Como afiliado te comprometes a'}</h2>
        <ul className="grid gap-4 md:grid-cols-2">
          {(der ? DERECHOS : DEBERES).map(([t, d]) => (
            <li key={t} className="tarjeta flex gap-4 p-6">
              <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${der ? 'bg-azul-50 text-azul-600' : 'bg-dorado-100 text-dorado-700'}`}>{der ? <Icono.escudo width={20} height={20} /> : <Icono.corazon width={20} height={20} />}</span>
              <span className="flex flex-col gap-1.5"><span className="font-display text-[17px] font-bold">{t}</span><span className="text-[15px] leading-relaxed text-azul-700">{d}</span></span>
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-col items-start justify-between gap-6 rounded-[22px] bg-azul-950 p-8 md:flex-row md:items-center">
          <div className="flex flex-col gap-1.5"><span className="font-display text-xl font-bold text-white">¿Sientes que no se respetó alguno de tus derechos?</span><span className="text-[15px] text-azul-200">Cuéntanos qué pasó y te damos respuesta.</span></div>
          <Link to="/tramites/pqrsd" className="btn-dorado shrink-0">Radicar una PQRSD</Link>
        </div>
      </section>
    </>
  );
}

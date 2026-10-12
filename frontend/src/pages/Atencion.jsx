import { useState } from 'react';
import { Link } from 'react-router-dom';
import Foto from '../components/ui/Foto.jsx';
import { Chips, Acordeon } from '../components/ui/Controles.jsx';
import { Icono } from '../components/ui/Iconos.jsx';
import { FAQS } from '../data/faqs.js';
import { CONTACTO } from '../data/sitio.js';

export default function Atencion() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('');
  const [abierta, setAbierta] = useState(0);
  const t = q.trim().toLowerCase();
  const items = FAQS.map((f, i) => ({ ...f, id: i })).filter((f) => (!cat || f.cat === cat) && (!t || `${f.q} ${f.a}`.toLowerCase().includes(t)));
  const canal = 'tarjeta flex flex-col gap-2.5 p-6 hover:border-azul-300';

  return (
    <>
      <section className="bg-azul-950 px-5 pb-32 pt-14 md:px-10">
        <div className="mx-auto grid max-w-sitio items-center gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-7">
            <span className="text-[13px] font-semibold tracking-[2px] text-dorado-400">Atención al usuario</span>
            <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight text-white md:text-[50px]">Estamos para ayudarte</h1>
            <p className="max-w-[560px] text-lg leading-relaxed text-azul-200">Escríbenos, llámanos o encuentra aquí la respuesta a las preguntas más comunes de nuestros afiliados.</p>
          </div>
          <div className="hidden h-64 overflow-hidden rounded-3xl lg:col-span-5 lg:block"><Foto src="/images/atencion/atencion-hero.jpg" alt="Asesor de Libitina atendiendo una llamada" /></div>
        </div>
      </section>
      <div className="contenedor -mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <a href={`mailto:${CONTACTO.correo}`} className={canal}><span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-azul-50 text-azul-600"><Icono.correo /></span><span className="text-xs tracking-wide text-dorado-600">Correo</span><span className="font-display text-[17px] font-bold">{CONTACTO.correo}</span><span className="text-sm text-azul-500">Respuesta en días hábiles</span></a>
        <a href={`tel:${CONTACTO.telefono}`} className={canal}><span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-azul-50 text-azul-600"><Icono.telefono /></span><span className="text-xs tracking-wide text-dorado-600">Teléfono</span><span className="font-display text-[17px] font-bold">{CONTACTO.telefono}</span><span className="text-sm text-azul-500">{CONTACTO.horario}</span></a>
        <Link to="/red-de-ips" className={canal}><span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-azul-50 text-azul-600"><Icono.ubicacion /></span><span className="text-xs tracking-wide text-dorado-600">Presencial</span><span className="font-display text-[17px] font-bold">Nuestras sedes</span><span className="text-sm text-azul-500">Ver Red de IPS</span></Link>
        <Link to="/tramites/pqrsd" className="flex flex-col gap-2.5 rounded-[20px] bg-dorado-400 p-6 hover:bg-dorado-300"><span className="flex h-12 w-12 items-center justify-center rounded-[14px] bg-dorado-50 text-dorado-800"><Icono.mensaje /></span><span className="text-xs tracking-wide text-dorado-800">PQRSD</span><span className="font-display text-[17px] font-bold text-azul-950">Radica o consulta</span><span className="text-sm text-dorado-900">Peticiones, quejas y más</span></Link>
      </div>
      <section className="mx-auto flex max-w-[1000px] flex-col gap-7 px-5 pt-24">
        <div className="flex flex-col items-center gap-3 text-center"><span className="antetitulo">Preguntas frecuentes</span><h2 className="text-4xl font-extrabold md:text-[40px]">¿En qué te podemos ayudar?</h2></div>
        <label htmlFor="fq" className="sr-only">Buscar una pregunta</label>
        <input id="fq" type="search" className="campo h-14 rounded-[14px] text-base" placeholder="Escribe tu duda, por ejemplo: contraseña, copago, beneficiario" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="flex justify-center"><Chips opciones={[['', 'Todas'], ['Afiliación', 'Afiliación'], ['Portal y cuenta', 'Portal y cuenta'], ['Pagos', 'Pagos'], ['Trámites', 'Trámites']]} valor={cat} onCambio={(v) => { setCat(v); setAbierta(null); }} /></div>
        <div className="tarjeta px-7">
          {items.length ? <Acordeon items={items} abierto={abierta} onAbrir={setAbierta} conCategoria />
            : <p className="py-10 text-center text-base text-azul-500">No encontramos esa pregunta. Escríbenos por correo o <Link to="/tramites/pqrsd" className="font-semibold text-azul-600">radica una petición</Link>.</p>}
        </div>
      </section>
      <section className="mx-auto max-w-[1000px] px-5 pb-24 pt-16">
        <div className="flex items-start gap-4 rounded-[22px] border border-red-100 bg-red-50 p-7" role="note">
          <Icono.alerta className="mt-0.5 shrink-0 text-red-700" />
          <div className="flex flex-col gap-1"><span className="font-display text-lg font-bold text-red-900">¿Es una urgencia?</span><span className="text-[15px] leading-relaxed text-red-800">Ve directamente al servicio de urgencias más cercano. La atención inicial de urgencias no necesita autorización previa y no tiene copago.</span></div>
        </div>
      </section>
    </>
  );
}

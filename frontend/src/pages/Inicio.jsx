import { useState } from 'react';
import { Link } from 'react-router-dom';
import Foto from '../components/ui/Foto.jsx';
import { Acordeon } from '../components/ui/Controles.jsx';
import { Icono } from '../components/ui/Iconos.jsx';
import { FAQS } from '../data/faqs.js';
import { CONTACTO } from '../data/sitio.js';

const DESTACADOS = [
  { titulo: 'Consulta el estado de tu afiliación', ruta: '/tramites/estado-de-afiliacion', img: '/images/inicio/inicio-acceso-estado.jpg' },
  { titulo: 'Descarga tu certificado de afiliación', ruta: '/tramites/certificado', img: '/images/inicio/inicio-acceso-certificado.jpg' },
  { titulo: 'Encuentra tu IPS', ruta: '/red-de-ips', img: '/images/inicio/inicio-acceso-ips.jpg' },
];

const COLUMNAS = [
  ['Salud', [['Agendar cita', '/tramites/proximamente/cita'], ['Resultados de laboratorio', '/tramites/proximamente/resultados'], ['Entrega de medicamentos', '/tramites/proximamente/medicamentos'], ['Solicitar autorización', '/tramites/proximamente/autorizacion']]],
  ['Administrativos', [['Estado de afiliación', '/tramites/estado-de-afiliacion'], ['Certificado de afiliación', '/tramites/certificado'], ['Carné digital', '/tramites/carne-digital'], ['Radicar PQRSD', '/tramites/pqrsd']]],
  ['Consultas', [['Red de IPS', '/red-de-ips'], ['Copagos', '/copagos'], ['Medicamentos cubiertos', '/medicamentos']]],
];

const PASOS = [
  { num: '01', titulo: 'Llena tus datos y los de tu familia', texto: 'Tus datos personales y los de tus beneficiarios: cónyuge, hijos o padres.', img: '/images/inicio/inicio-paso-1.jpg' },
  { num: '02', titulo: 'Elige tu régimen e IPS', texto: 'Selecciona si eres contributivo o subsidiado y la IPS más cercana a ti.', img: '/images/inicio/inicio-paso-2.jpg' },
  { num: '03', titulo: 'Recibe la aprobación', texto: 'Revisamos tu solicitud y te avisamos por correo. Mientras tanto, sigue su estado en tu portal.', img: '/images/inicio/inicio-paso-3.jpg' },
];

// Cifras pendientes de definir: reemplaza por las reales.
const CIFRAS = [['[000]', 'Afiliados'], ['6', 'Sedes en la red'], ['3', 'Municipios'], ['[000]', 'Especialistas']];

export default function Inicio() {
  const [paso, setPaso] = useState(0);
  const [faq, setFaq] = useState(0);
  const faqs = FAQS.slice(0, 5).map((f, i) => ({ ...f, id: i }));

  return (
    <>
      {/* Hero dividido */}
      <section className="bg-azul-950 px-5 pb-40 pt-16 md:px-10">
        <div className="mx-auto grid max-w-sitio items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div className="flex flex-col gap-6">
            <span className="text-[13px] font-semibold tracking-[2px] text-dorado-400">Régimen contributivo y subsidiado</span>
            <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight text-white md:text-[58px]">Cuidamos de ti y de los tuyos, en cada etapa</h1>
            <p className="max-w-[500px] text-lg leading-relaxed text-azul-200">Afíliate en línea con tu grupo familiar, elige tu IPS y consulta el estado de tu solicitud cuando quieras.</p>
            <div className="mt-2 flex flex-wrap gap-3.5">
              <Link to="/inscripcion" className="btn-dorado px-8 py-4 text-base">Afíliate ahora</Link>
              <Link to="/iniciar-sesion" className="btn-borde-claro px-8 py-4 text-base">Soy afiliado</Link>
            </div>
          </div>
          <div className="h-[360px] overflow-hidden rounded-3xl md:h-[460px]">
            <Foto src="/images/inicio/inicio-hero.jpg" alt="Médica atendiendo a una niña acompañada de su mamá" />
          </div>
        </div>
      </section>

      {/* Accesos rápidos */}
      <section className="-mt-24 px-5 md:px-10">
        <div className="mx-auto flex max-w-sitio flex-col gap-9 rounded-3xl border border-azul-100 bg-white p-6 shadow-xl shadow-azul-950/5 md:p-9">
          <div className="grid gap-4 md:grid-cols-3">
            {DESTACADOS.map((d) => (
              <Link key={d.ruta} to={d.ruta} className="group relative flex min-h-[170px] flex-col justify-end overflow-hidden rounded-2xl p-6">
                <img src={d.img} alt="" className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <span className="absolute inset-0 bg-gradient-to-t from-azul-950/90 via-azul-900/65 to-azul-800/30" />
                <span className="relative flex flex-col gap-3">
                  <span className="font-display text-xl font-bold leading-snug text-white">{d.titulo}</span>
                  <span className="text-sm font-semibold text-dorado-400">Ver más</span>
                </span>
              </Link>
            ))}
          </div>
          <div className="grid gap-8 md:grid-cols-3 md:gap-10">
            {COLUMNAS.map(([titulo, enlaces]) => (
              <div key={titulo} className="flex flex-col">
                <h2 className="mb-1 border-b-[3px] border-dorado-400 pb-3 text-[17px] font-bold">{titulo}</h2>
                {enlaces.map(([t, r], i) => (
                  <Link key={r} to={r} className={`flex justify-between py-3.5 text-[15px] text-azul-900 hover:text-azul-600 ${i < enlaces.length - 1 ? 'border-b border-azul-50' : ''}`}>
                    {t}<span className="text-azul-400" aria-hidden="true">›</span>
                  </Link>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Cifras sobre foto */}
      <section className="px-5 pt-24 md:px-10">
        <div className="relative mx-auto max-w-sitio overflow-hidden rounded-[28px] px-8 py-16 md:px-14 md:py-20">
          <img src="/images/inicio/inicio-cifras-fondo.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-azul-950/80" />
          <div className="relative flex flex-col gap-11">
            <h2 className="max-w-[520px] text-3xl font-extrabold leading-tight text-white md:text-4xl">Una red que crece contigo</h2>
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4">
              {CIFRAS.map(([n, t]) => (
                <div key={t} className="flex flex-col gap-2 border-t-2 border-dorado-400 pt-5">
                  <span className="font-display text-4xl font-extrabold text-white md:text-[44px]">{n}</span>
                  <span className="text-[15px] text-azul-200">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Pasos con foto que cambia */}
      <section className="px-5 pt-28 md:px-10">
        <div className="mx-auto flex max-w-sitio flex-col gap-11">
          <div className="flex flex-col gap-3">
            <span className="antetitulo">Afiliación en línea</span>
            <h2 className="text-4xl font-extrabold md:text-[40px]">Afíliate en tres pasos</h2>
          </div>
          <div className="grid gap-10 lg:grid-cols-12">
            <div className="flex flex-col gap-2.5 lg:col-span-5">
              {PASOS.map((p, i) => (
                <button key={p.num} type="button" onClick={() => setPaso(i)} onMouseEnter={() => setPaso(i)} aria-pressed={paso === i}
                  className={`flex w-full items-start gap-5 rounded-2xl border px-6 py-5 text-left transition-colors ${paso === i ? 'border-azul-200 bg-azul-50' : 'border-transparent bg-white hover:bg-azul-50/50'}`}>
                  <span className={`font-display text-3xl font-extrabold ${paso === i ? 'text-dorado-500' : 'text-azul-200'}`}>{p.num}</span>
                  <span className="flex flex-col gap-1.5">
                    <span className="font-display text-lg font-bold text-azul-900">{p.titulo}</span>
                    <span className="text-[15px] leading-relaxed text-azul-700">{p.texto}</span>
                  </span>
                </button>
              ))}
              <Link to="/inscripcion" className="btn-primario mt-3.5 self-start">Empezar mi inscripción</Link>
            </div>
            <div className="h-[340px] overflow-hidden rounded-3xl md:h-[460px] lg:col-span-7">
              <img key={paso} src={PASOS[paso].img} alt={PASOS[paso].titulo} className="h-full w-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Contacto */}
      <section className="px-5 pt-28 md:px-10">
        <div className="mx-auto flex max-w-sitio flex-col items-start justify-between gap-8 rounded-3xl bg-azul-950 px-8 py-10 md:px-12 lg:flex-row lg:items-center">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[26px] font-extrabold text-white">¿Necesitas ayuda?</h2>
            <span className="text-[15px] text-azul-200">Escríbenos o llámanos, te respondemos.</span>
          </div>
          <div className="flex flex-wrap items-center gap-8 md:gap-10">
            <a href={`mailto:${CONTACTO.correo}`} className="flex flex-col gap-1"><span className="text-xs tracking-wide text-dorado-400">Correo</span><span className="font-display text-lg font-bold text-white">{CONTACTO.correo}</span></a>
            <a href={`tel:${CONTACTO.telefono}`} className="flex flex-col gap-1"><span className="text-xs tracking-wide text-dorado-400">Teléfono</span><span className="font-display text-lg font-bold text-white">{CONTACTO.telefono}</span></a>
            <div className="flex gap-2.5">
              <a href={CONTACTO.instagram} target="_blank" rel="noreferrer" aria-label="Instagram de la Universidad Católica de Colombia" className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-azul-400 text-white hover:bg-azul-800"><Icono.instagram width={20} height={20} /></a>
              <a href={CONTACTO.facebook} target="_blank" rel="noreferrer" aria-label="Facebook de la Universidad Católica de Colombia" className="flex h-12 w-12 items-center justify-center rounded-full border-[1.5px] border-azul-400 text-white hover:bg-azul-800"><Icono.facebook width={20} height={20} /></a>
            </div>
          </div>
        </div>
      </section>

      {/* Preguntas frecuentes */}
      <section className="px-5 pb-28 pt-28 md:px-10">
        <div className="mx-auto grid max-w-sitio gap-14 lg:grid-cols-12">
          <div className="flex flex-col gap-4 lg:col-span-5">
            <span className="antetitulo">Preguntas frecuentes</span>
            <h2 className="text-4xl font-extrabold leading-tight md:text-[40px]">Resolvemos tus dudas</h2>
            <p className="text-base leading-relaxed text-azul-700">Lo que más nos preguntan antes y después de afiliarse.</p>
            <div className="mt-2 h-72 overflow-hidden rounded-3xl"><Foto src="/images/inicio/inicio-faq.jpg" alt="Asesora de Libitina atendiendo desde su computador" /></div>
            <Link to="/atencion-al-usuario" className="text-[15px] font-semibold text-azul-600">Ver todas las preguntas</Link>
          </div>
          <div className="lg:col-span-7"><Acordeon items={faqs} abierto={faq} onAbrir={setFaq} /></div>
        </div>
      </section>
    </>
  );
}

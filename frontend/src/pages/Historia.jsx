import { Link } from 'react-router-dom';
import { HITOS } from '../data/historia.js';

export default function Historia() {
  return (
    <>
      <section className="bg-azul-950 px-5 py-16 md:px-10 md:py-20">
        <div className="mx-auto grid max-w-sitio items-center gap-12 lg:grid-cols-12">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <nav aria-label="Ruta" className="text-[13px] text-azul-200"><Link to="/nosotros" className="hover:text-white">Nosotros</Link> › Historia</nav>
            <h1 className="text-[44px] font-extrabold leading-[1.06] tracking-tight text-white md:text-[56px]">De la selva a la EPS</h1>
            <p className="max-w-[580px] text-lg leading-relaxed text-azul-200">La increíble y absolutamente verificada historia de Santiago Esguerra, el niño criado por una loba que terminó fundando una EPS.</p>
          </div>
          <div className="mx-auto h-[380px] w-full max-w-[380px] overflow-hidden rounded-[28px] rounded-t-[200px] lg:col-span-5">
            <img src="/images/historia/historia-retrato.jpg" alt="Ilustración de Santiago Esguerra, fundador de Libitina, con bata médica" className="h-full w-full object-cover object-top" />
          </div>
        </div>
      </section>
      <section className="contenedor relative py-24">
        <div className="absolute bottom-24 left-[42px] top-24 w-0.5 bg-azul-100 md:left-1/2 md:-ml-px" aria-hidden="true" />
        <ol className="relative flex flex-col gap-14">
          {HITOS.map((h, i) => {
            const izq = i % 2 === 0;
            return (
              <li key={h.anio} className="grid grid-cols-[84px_1fr] items-center gap-5 md:grid-cols-[1fr_96px_1fr] md:gap-0">
                <div className={`order-2 flex flex-col gap-3 rounded-[22px] border border-azul-100 bg-fondo p-6 md:p-8 ${izq ? 'md:order-1' : 'md:order-3'}`}>
                  <span className="text-[13px] font-semibold tracking-[2px] text-dorado-600">{h.etiqueta}</span>
                  <h2 className="text-2xl font-extrabold md:text-[26px]">{h.titulo}</h2>
                  <p className="text-base leading-[1.75] text-azul-700">{h.texto}</p>
                  <img src={`/images/historia/${h.img}.jpg`} alt="" loading="lazy" className="mt-2 aspect-[2/1] w-full rounded-2xl object-cover md:hidden" />
                </div>
                <div className="order-1 flex justify-center md:order-2">
                  <span className="flex h-[84px] w-[84px] items-center justify-center rounded-full border-[5px] border-white bg-azul-900 font-display text-lg font-extrabold text-dorado-400 shadow-[0_0_0_2px_#F6C220] md:h-[88px] md:w-[88px] md:text-xl">{h.anio}</span>
                </div>
                <img src={`/images/historia/${h.img}.jpg`} alt={`Ilustración: ${h.titulo}`} loading="lazy" className={`hidden aspect-[2/1] w-full rounded-[22px] object-cover md:block ${izq ? 'md:order-3' : 'md:order-1'}`} />
              </li>
            );
          })}
        </ol>
      </section>
      <section className="contenedor pb-24">
        <figure className="flex flex-col items-center gap-4 rounded-[28px] border border-dorado-200 bg-dorado-50 px-8 py-14 text-center md:px-16">
          <blockquote className="max-w-[860px] font-display text-2xl font-bold leading-snug md:text-[32px]">«La salud es como la manada: nadie se queda atrás, y el que se queda, aúlla hasta que lo encuentren.»</blockquote>
          <figcaption className="text-[15px] text-dorado-800">Santiago Esguerra, fundador y único miembro humano de la manada original</figcaption>
        </figure>
        <p className="mt-6 text-center text-[13px] text-azul-400">Historia de ficción con fines académicos y humorísticos. Ninguna loba, perezoso o panadería de Chapinero fue consultada.</p>
      </section>
    </>
  );
}

import { Link } from 'react-router-dom';
import Foto from '../components/ui/Foto.jsx';

const MISION = [['Brigadas por río y trocha', 'Equipos de salud que llegan en lancha, chiva, mula o a pie a las comunidades que no tienen un centro de salud cercano.'], ['Telemedicina rural', 'Consultas por conexión satelital desde puestos de salud en veredas y corregimientos, para no viajar días por una cita.'], ['Respeto por los saberes propios', 'Trabajo de la mano con médicos tradicionales, parteras y autoridades de comunidades indígenas, afrodescendientes y campesinas.']];
const VISION = [['Atención a menos de un día de camino', 'Un punto de atención o de telemedicina al alcance de cada afiliado, sin importar lo apartado de su vereda.'], ['Madres e infancia primero', 'Rutas de atención para gestantes y primera infancia pensadas para las zonas rurales dispersas.'], ['Historia clínica que funciona sin señal', 'Registros digitales que trabajan sin conexión en la selva y se sincronizan cuando vuelve la señal.']];
const VALORES = [['Cuidado', 'Ponemos a la persona y a su familia en el centro de cada decisión.'], ['Respeto', 'Tratamos a cada afiliado con dignidad y protegemos sus datos.'], ['Transparencia', 'Explicamos con claridad cada trámite, cobro y decisión.'], ['Cercanía', 'Estamos disponibles en línea y en nuestras sedes cuando nos necesitan.'], ['Excelencia', 'Buscamos mejorar cada día la calidad de nuestros servicios.'], ['Compromiso', 'Respondemos por la salud de nuestros afiliados como si fuera la nuestra.']];

const Lista = ({ items, color }) => (
  <ul className="mt-1.5 flex flex-col gap-2.5">{items.map(([t, d]) => (
    <li key={t} className="flex flex-col gap-1 rounded-2xl bg-fondo px-5 py-4" style={{ borderLeft: `3px solid ${color}` }}><span className="font-display text-[17px] font-bold">{t}</span><span className="text-[15px] leading-relaxed text-azul-700">{d}</span></li>
  ))}</ul>
);

export default function Nosotros() {
  return (
    <>
      <section className="contenedor flex flex-col items-center gap-7 pb-10 pt-20 text-center">
        <span className="antetitulo">Nosotros</span>
        <h1 className="max-w-[900px] text-[40px] font-extrabold leading-[1.08] tracking-tight md:text-[56px]">Cuidamos como se cuida a la familia</h1>
        <img src="/logo/logo.png" alt="Logo de Libitina EPS: la loba amamantando a dos niños" className="mt-3 w-full max-w-[760px]" />
        <p className="max-w-[760px] text-lg leading-relaxed text-azul-700">Nuestro símbolo es la loba que, según la leyenda de Roma, protegió y alimentó a Rómulo y Remo. Así entendemos la salud: una red que acoge, protege y acompaña a cada afiliado y a los suyos.</p>
      </section>
      <nav aria-label="Secciones de Nosotros" className="contenedor flex flex-wrap justify-center gap-2.5 pt-6">
        <a href="#mision" className="rounded-full bg-azul-900 px-5 py-3 text-[15px] font-semibold text-white">Misión y visión</a>
        <a href="#valores" className="rounded-full border-[1.5px] border-azul-200 px-5 py-3 text-[15px] font-semibold text-azul-700">Valores</a>
        <Link to="/nosotros/historia" className="rounded-full border-[1.5px] border-azul-200 px-5 py-3 text-[15px] font-semibold text-azul-700">Historia</Link>
      </nav>
      <section id="mision" className="contenedor flex scroll-mt-24 flex-col gap-20 pt-24">
        <div className="grid items-start gap-14 lg:grid-cols-12">
          <div className="h-[420px] overflow-hidden rounded-[28px] rounded-bl-[120px] md:h-[560px] lg:col-span-5"><Foto src="/images/nosotros/nosotros-mision.jpg" alt="Brigada de salud llegando en lancha a un caserío amazónico" /></div>
          <div className="flex flex-col gap-4 lg:col-span-7">
            <h2 className="text-4xl font-extrabold md:text-[38px]">Misión</h2>
            <p className="text-lg leading-relaxed text-azul-700">Llevar salud digna a cada rincón de Colombia, desde las ciudades hasta las veredas más apartadas, los resguardos y las riberas de la selva. Acompañamos a nuestros afiliados y a sus familias con una red de prestadores cercana, atención que sale a buscar a las personas donde viven y trámites claros y sencillos, respetando la diversidad y los saberes de cada territorio. Como la loba que protege a los suyos, no dejamos a nadie atrás por vivir lejos.</p>
            <Lista items={MISION} color="#F6C220" />
          </div>
        </div>
        <div className="grid items-start gap-14 lg:grid-cols-12">
          <div className="order-2 flex flex-col gap-4 lg:order-1 lg:col-span-7">
            <h2 className="text-4xl font-extrabold md:text-[38px]">Visión</h2>
            <p className="text-lg leading-relaxed text-azul-700">En 2030 seremos la EPS de referencia en salud rural de Colombia: la que llega primero a la Amazonía, el Pacífico, la Orinoquía y las montañas, y la que demuestra que vivir lejos de la ciudad no significa vivir lejos de la salud. Queremos que cada familia campesina, indígena y ribereña sienta que su EPS la conoce por su nombre.</p>
            <Lista items={VISION} color="#075699" />
          </div>
          <div className="order-1 h-[420px] overflow-hidden rounded-[28px] rounded-br-[120px] md:h-[560px] lg:order-2 lg:col-span-5"><Foto src="/images/nosotros/nosotros-vision.jpg" alt="Médica conversando con un campesino frente a un cafetal" /></div>
        </div>
      </section>
      <section id="valores" className="contenedor scroll-mt-24 py-28">
        <div className="flex flex-col gap-10 rounded-[32px] bg-azul-950 p-8 md:p-14">
          <h2 className="text-4xl font-extrabold text-white md:text-[40px]">Lo que nos guía</h2>
          <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{VALORES.map(([t, d]) => (
            <li key={t} className="flex flex-col gap-2.5 rounded-[20px] border border-azul-800 p-7"><h3 className="text-xl font-bold text-white">{t}</h3><p className="text-[15px] leading-relaxed text-azul-200">{d}</p></li>
          ))}</ul>
        </div>
      </section>
    </>
  );
}

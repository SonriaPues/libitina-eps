import { Link } from 'react-router-dom';
import Foto from '../components/ui/Foto.jsx';
import { Icono } from '../components/ui/Iconos.jsx';
import { Chequeo } from '../components/ui/Controles.jsx';

const QUIENES = [
  { icono: Icono.corazon, titulo: 'Cónyuge o compañero', texto: 'Tu esposo, esposa o compañero permanente. Solo uno.' },
  { icono: Icono.persona, titulo: 'Hijos menores de 25', texto: 'Hijos que dependan económicamente de ti.' },
  { icono: Icono.escudo, titulo: 'Hijos con incapacidad', texto: 'De cualquier edad, si tienen una incapacidad permanente.' },
  { icono: Icono.familia, titulo: 'Tus padres', texto: 'Solo si no tienes cónyuge ni hijos, y dependen de ti.', dorado: true },
];
const REQUISITOS = ['Tu documento de identidad vigente', 'Documento de cada beneficiario (cédula o registro civil)', 'Un correo electrónico que revises seguido', 'Tu dirección y número de celular', 'Subsidiado: tu clasificación en el Sisbén', 'Hijos con incapacidad: el certificado que la acredite'];

export default function Afiliacion() {
  return (
    <>
      <section className="bg-azul-50 px-5 py-16 md:px-10">
        <div className="mx-auto grid max-w-sitio items-center gap-14 lg:grid-cols-2">
          <div className="flex flex-col gap-5">
            <span className="antetitulo">Afiliación</span>
            <h1 className="text-[40px] font-extrabold leading-[1.08] tracking-tight md:text-[52px]">Afíliate a Libitina con toda tu familia</h1>
            <p className="max-w-[520px] text-lg leading-relaxed text-azul-700">Conoce los regímenes, a quién puedes incluir como beneficiario y qué necesitas para hacer tu inscripción en línea.</p>
            <div className="mt-1.5 flex flex-wrap gap-3.5">
              <Link to="/inscripcion" className="btn-primario px-8 py-4 text-base">Inscribirme ahora</Link>
              <a href="#requisitos" className="btn-borde px-8 py-4 text-base">Ver requisitos</a>
            </div>
          </div>
          <div className="h-[340px] overflow-hidden rounded-[28px] rounded-bl-[120px] md:h-[420px]"><Foto src="/images/afiliacion/afiliacion-hero.jpg" alt="Familia con dos hijos riendo en la sala de su casa" /></div>
        </div>
      </section>

      <section className="contenedor pt-24">
        <div className="mb-10 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div className="flex flex-col gap-3"><span className="antetitulo">Regímenes</span><h2 className="text-4xl font-extrabold md:text-[40px]">¿Cuál es tu régimen?</h2></div>
          <p className="max-w-[460px] text-base leading-relaxed text-azul-700">Depende de si tienes capacidad de pago. Ambos te dan acceso al plan de beneficios en salud.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          <article className="flex flex-col gap-5 rounded-3xl bg-azul-900 p-8 md:p-10">
            <span className="self-start rounded-full bg-dorado-400 px-3.5 py-1.5 text-[13px] font-semibold text-azul-950">Con capacidad de pago</span>
            <h3 className="text-3xl font-extrabold text-white">Régimen contributivo</h3>
            <p className="leading-relaxed text-azul-200">Para quienes aportan a salud: trabajadores con contrato, independientes y pensionados.</p>
            <ul className="flex flex-col gap-3 text-[15px] text-azul-100">
              {['El aporte se calcula sobre tu ingreso base de cotización', 'Pagas cuotas moderadoras según tu rango de ingreso', 'Tus beneficiarios quedan cubiertos con tu aporte'].map((t) => <li key={t} className="flex gap-2.5"><Chequeo />{t}</li>)}
            </ul>
            <Link to="/copagos" className="mt-2 text-[15px] font-semibold text-dorado-400">Consulta copagos y cuotas</Link>
          </article>
          <article className="flex flex-col gap-5 rounded-3xl border border-dorado-200 bg-dorado-50 p-8 md:p-10">
            <span className="self-start rounded-full bg-azul-600 px-3.5 py-1.5 text-[13px] font-semibold text-white">Sin capacidad de pago</span>
            <h3 className="text-3xl font-extrabold">Régimen subsidiado</h3>
            <p className="leading-relaxed text-azul-700">Para quienes no tienen capacidad de pago y están clasificados en el Sisbén.</p>
            <ul className="flex flex-col gap-3 text-[15px] text-azul-800">
              {['El Estado financia tu afiliación', 'No pagas cuotas moderadoras', 'Copagos con topes más bajos por evento y por año'].map((t) => <li key={t} className="flex gap-2.5"><Chequeo className="text-dorado-600" />{t}</li>)}
            </ul>
            <Link to="/copagos" className="mt-2 text-[15px] font-semibold text-azul-600">Consulta copagos</Link>
          </article>
        </div>
      </section>

      <section className="contenedor pt-28">
        <div className="mb-10 flex flex-col items-center gap-3 text-center"><span className="antetitulo">Grupo familiar</span><h2 className="text-4xl font-extrabold md:text-[40px]">¿A quién puedes afiliar?</h2></div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {QUIENES.map(({ icono: I, titulo, texto, dorado }) => (
            <div key={titulo} className="tarjeta flex flex-col gap-3.5 p-7">
              <span className={`flex h-[52px] w-[52px] items-center justify-center rounded-[14px] ${dorado ? 'bg-dorado-100 text-dorado-700' : 'bg-azul-50 text-azul-600'}`}><I /></span>
              <h3 className="text-lg font-bold">{titulo}</h3>
              <p className="text-[15px] leading-relaxed text-azul-700">{texto}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="requisitos" className="contenedor scroll-mt-24 pt-28">
        <div className="grid items-center gap-14 lg:grid-cols-12">
          <div className="h-[380px] overflow-hidden rounded-[28px] md:h-[460px] lg:col-span-5"><Foto src="/images/afiliacion/afiliacion-requisitos.jpg" alt="Manos organizando documentos sobre una mesa" /></div>
          <div className="flex flex-col gap-6 lg:col-span-7">
            <div className="flex flex-col gap-3"><span className="antetitulo">Requisitos</span><h2 className="text-4xl font-extrabold md:text-[40px]">Ten esto a la mano</h2></div>
            <ol className="grid gap-3.5 sm:grid-cols-2">
              {REQUISITOS.map((r, i) => (
                <li key={r} className="flex gap-3.5 rounded-2xl bg-fondo p-[18px]"><span className="font-display text-xl font-extrabold text-dorado-500">{String(i + 1).padStart(2, '0')}</span><span className="text-[15px] leading-relaxed">{r}</span></li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <section className="contenedor py-28">
        <div className="flex flex-col items-start justify-between gap-8 rounded-[28px] bg-azul-950 p-10 md:flex-row md:items-center md:p-14">
          <div className="flex flex-col gap-2.5"><h2 className="text-3xl font-extrabold text-white md:text-[34px]">¿Listo para afiliarte?</h2><span className="text-[17px] text-azul-200">La inscripción en línea toma unos minutos y la sigues desde tu portal.</span></div>
          <Link to="/inscripcion" className="btn-dorado shrink-0 px-9 py-[18px] text-base">Empezar mi inscripción</Link>
        </div>
      </section>
    </>
  );
}

import { Link, useParams, Navigate } from 'react-router-dom';
import { Chequeo } from '../components/ui/Controles.jsx';
import { PROXIMAMENTE } from '../data/proximamente.js';

const ALTERNATIVAS = [['Contactarnos', 'Escríbenos o llámanos y te orientamos.', '/atencion-al-usuario', 'Atención al usuario'], ['Ir a tu IPS', 'Haz el trámite en persona en tu sede asignada.', '/red-de-ips', 'Red de IPS'], ['Radicar una petición', 'Si es urgente para ti, déjalo por escrito.', '/tramites/pqrsd', 'PQRSD']];

export default function Proximamente() {
  const { servicio } = useParams();
  const s = PROXIMAMENTE[servicio];
  if (!s) return <Navigate to="/" replace />;
  return (
    <section className="contenedor py-16 md:py-20">
      <div className="grid items-center gap-14 lg:grid-cols-2">
        <div className="flex flex-col gap-5">
          <span className="self-start rounded-full bg-dorado-100 px-3.5 py-1.5 text-[13px] font-bold tracking-wide text-dorado-800">Próximamente</span>
          <h1 className="text-[40px] font-extrabold leading-tight tracking-tight md:text-5xl">{s.titulo}</h1>
          <p className="text-lg leading-relaxed text-azul-700">{s.intro}</p>
          <h2 className="mt-1 text-[15px] font-semibold text-dorado-600">Podrás</h2>
          <ul className="flex flex-col gap-2.5">{s.podras.map((p) => <li key={p} className="flex gap-3 text-base"><Chequeo className="text-azul-600" />{p}</li>)}</ul>
        </div>
        <div className="h-[360px] overflow-hidden rounded-[28px] rounded-t-[200px] md:h-[440px]"><img src={s.img} alt="" className="h-full w-full object-cover" /></div>
      </div>
      <div className="mt-16 flex flex-col gap-4">
        <h2 className="text-2xl font-extrabold">Mientras tanto, puedes</h2>
        <div className="grid gap-4 md:grid-cols-3">{ALTERNATIVAS.map(([t, d, r, e]) => (
          <Link key={r} to={r} className="tarjeta flex flex-col gap-2 p-6 hover:border-azul-300"><span className="font-display text-lg font-bold">{t}</span><span className="text-[15px] leading-relaxed text-azul-700">{d}</span><span className="text-sm font-semibold text-azul-600">{e}</span></Link>
        ))}</div>
      </div>
    </section>
  );
}

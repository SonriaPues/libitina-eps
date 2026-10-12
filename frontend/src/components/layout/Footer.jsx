import { Link } from 'react-router-dom';
import { Marca } from '../ui/Marca.jsx';

const col = (titulo, enlaces) => (
  <div className="flex flex-col gap-3 text-sm">
    <span className="font-semibold text-dorado-400">{titulo}</span>
    {enlaces.map(([t, r]) => (r.startsWith('http')
      ? <a key={t} href={r} target="_blank" rel="noreferrer" className="text-azul-100 hover:text-white">{t}</a>
      : <Link key={t} to={r} className="text-azul-100 hover:text-white">{t}</Link>))}
  </div>
);

export default function Footer() {
  return (
    <footer className="bg-azul-950 px-5 pb-10 pt-16 md:px-10">
      <div className="mx-auto flex max-w-sitio flex-col gap-11">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-4">
            <Marca alto={40} claro conPlaca texto="text-lg" />
            <p className="text-sm leading-relaxed text-azul-200">Entidad promotora de salud. Proyecto académico de la Universidad Católica de Colombia.</p>
          </div>
          {col('Afiliados', [['Afiliación', '/afiliacion'], ['Plan de beneficios', '/plan-de-beneficios'], ['Copagos', '/copagos'], ['Red de IPS', '/red-de-ips']])}
          {col('Trámites', [['Estado de afiliación', '/tramites/estado-de-afiliacion'], ['Certificado', '/tramites/certificado'], ['Radicar PQRSD', '/tramites/pqrsd']])}
          {col('Entidades reguladoras', [['Supersalud', 'https://www.supersalud.gov.co'], ['Ministerio de Salud', 'https://www.minsalud.gov.co'], ['ADRES', 'https://www.adres.gov.co']])}
        </div>
        <div className="flex flex-col justify-between gap-3 border-t border-azul-800 pt-6 text-[13px] text-azul-400 sm:flex-row">
          <span>© {new Date().getFullYear()} Libitina EPS</span>
          <span><Link to="/politica-de-datos" className="hover:text-white">Política de tratamiento de datos</Link></span>
        </div>
      </div>
    </footer>
  );
}

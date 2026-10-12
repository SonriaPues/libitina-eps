import { useState } from 'react';
import { Link } from 'react-router-dom';
import Encabezado from '../components/ui/Encabezado.jsx';
import Foto from '../components/ui/Foto.jsx';
import { Chips } from '../components/ui/Controles.jsx';
import { MEDICAMENTOS, GRUPOS } from '../data/medicamentos.js';

export default function Medicamentos() {
  const [q, setQ] = useState('');
  const [grupo, setGrupo] = useState('');
  const t = q.trim().toLowerCase();
  const lista = MEDICAMENTOS.filter((m) => (!grupo || m.grupo === grupo) && (!t || m.nombre.toLowerCase().includes(t)));
  return (
    <>
      <Encabezado migas={[{ texto: 'Afiliados', ruta: '/afiliacion' }, { texto: 'Medicamentos cubiertos' }]} titulo="Medicamentos cubiertos" texto="Consulta si tu medicamento está en el plan de beneficios o si tu médico debe formularlo por MIPRES.">
        <div className="w-full lg:w-[440px]"><label htmlFor="mq" className="sr-only">Buscar medicamento</label>
          <input id="mq" type="search" className="campo h-14 rounded-[14px] border-azul-700 text-base" placeholder="Busca por nombre, por ejemplo losartán" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </Encabezado>
      <div className="contenedor grid items-start gap-7 py-11 lg:grid-cols-12">
        <aside className="flex flex-col gap-4 lg:col-span-4">
          <div className="tarjeta flex flex-col gap-4 p-6">
            <h2 className="text-lg font-extrabold">Cómo leer el listado</h2>
            <p className="flex items-start gap-3 text-sm leading-relaxed text-azul-700"><span className="shrink-0 rounded-full bg-azul-100 px-2.5 py-1 text-xs font-bold text-azul-800">PBS</span>Incluido en el plan de beneficios. Tu médico lo formula y lo reclamas en tu punto de entrega.</p>
            <p className="flex items-start gap-3 text-sm leading-relaxed text-azul-700"><span className="shrink-0 rounded-full bg-dorado-100 px-2.5 py-1 text-xs font-bold text-dorado-800">MIPRES</span>No está en el plan de beneficios: tu médico lo prescribe en la plataforma MIPRES del Ministerio de Salud.</p>
          </div>
          <div className="flex flex-col gap-3 rounded-[22px] bg-azul-950 p-6">
            <h2 className="text-lg font-extrabold text-white">Para reclamarlo</h2>
            <p className="text-sm leading-relaxed text-azul-200">Lleva la fórmula médica vigente y tu documento de identidad al punto de entrega de tu IPS.</p>
            <Link to="/red-de-ips" className="text-sm font-semibold text-dorado-400">Ver puntos de entrega</Link>
          </div>
          <div className="h-56 overflow-hidden rounded-[22px]"><Foto src="/images/medicamentos/medicamentos-lateral.jpg" alt="Farmaceuta entregando medicamentos a un padre y su hija" /></div>
        </aside>
        <section className="flex flex-col gap-4 lg:col-span-8">
          <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
            <Chips opciones={[['', 'Todos'], ...GRUPOS.map((g) => [g, g])]} valor={grupo} onCambio={setGrupo} />
            <span className="shrink-0 text-sm text-azul-700" aria-live="polite">{lista.length === 1 ? '1 resultado' : `${lista.length} resultados`}</span>
          </div>
          <div className="overflow-x-auto rounded-[22px] border border-azul-100 bg-white">
            <table className="w-full min-w-[560px] text-left">
              <thead><tr className="border-b border-azul-50 text-xs tracking-wide text-azul-400"><th className="px-6 py-3.5 font-medium">Medicamento</th><th className="py-3.5 font-medium">Presentación</th><th className="py-3.5 font-medium">Grupo</th><th className="py-3.5 pr-6 font-medium">Cobertura</th></tr></thead>
              <tbody>
                {lista.map((m) => (
                  <tr key={m.nombre} className="border-b border-azul-50 last:border-0">
                    <td className="px-6 py-4 text-[15px] font-semibold">{m.nombre}</td><td className="py-4 text-sm text-azul-700">{m.presentacion}</td><td className="py-4 text-sm text-azul-700">{m.grupo}</td>
                    <td className="py-4 pr-6"><span className={`rounded-full px-2.5 py-1 text-xs font-bold ${m.cobertura === 'PBS' ? 'bg-azul-100 text-azul-800' : 'bg-dorado-100 text-dorado-800'}`}>{m.cobertura}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {lista.length === 0 && <p className="px-6 py-10 text-center text-[15px] text-azul-500">No encontramos ese medicamento en el listado. Pregúntale a tu médico o <Link to="/tramites/pqrsd" className="font-semibold text-azul-600">radica una petición</Link>.</p>}
          </div>
          <p className="text-[13px] leading-relaxed text-azul-500">Listado de ejemplo con fines demostrativos. La cobertura oficial la define el Ministerio de Salud en la resolución vigente del plan de beneficios.</p>
        </section>
      </div>
    </>
  );
}

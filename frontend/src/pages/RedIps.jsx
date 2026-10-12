import { useEffect, useState } from 'react';
import { Segmentado, Chips } from '../components/ui/Controles.jsx';
import { Icono } from '../components/ui/Iconos.jsx';
import { prestadoresApi } from '../api/servicios.js';

const SERVICIOS = ['Medicina general', 'Odontología', 'Laboratorio', 'Pediatría', 'Vacunación', 'Urgencias', 'Especialistas', 'Farmacia'];
const mapa = (i) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${i.direccion}, ${i.ciudad}, Colombia`)}`;

export default function RedIps() {
  const [ips, setIps] = useState([]);
  const [q, setQ] = useState('');
  const [ciudad, setCiudad] = useState('');
  const [servicio, setServicio] = useState('');
  const [modo, setModo] = useState('lista');
  useEffect(() => { prestadoresApi.ips().then(setIps); }, []);

  const t = q.trim().toLowerCase();
  const res = ips.filter((i) => (!ciudad || i.ciudad === ciudad) && (!servicio || i.servicios.includes(servicio)) && (!t || `${i.nombre} ${i.direccion}`.toLowerCase().includes(t)));
  const ciudades = [...new Set(ips.map((i) => i.ciudad))];
  const limpiar = () => { setQ(''); setCiudad(''); setServicio(''); };

  return (
    <div className="bg-fondo">
      <section className="bg-azul-950 px-5 pb-24 pt-14 md:px-10">
        <div className="mx-auto flex max-w-sitio flex-col gap-3.5">
          <span className="text-[13px] font-semibold tracking-[2px] text-dorado-400">Red de prestadores</span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-[46px]">Encuentra tu IPS</h1>
          <p className="max-w-[620px] text-[17px] leading-relaxed text-azul-200">Busca por nombre, dirección, ciudad o servicio y ubica la sede más cercana a ti.</p>
        </div>
      </section>
      <div className="contenedor -mt-12">
        <div className="grid gap-3.5 rounded-[18px] border border-azul-100 bg-white p-4 shadow-lg shadow-azul-950/5 md:grid-cols-12">
          <label htmlFor="q" className="sr-only">Buscar IPS</label>
          <input id="q" type="search" className="campo md:col-span-7" placeholder="Busca por nombre o dirección, por ejemplo Chapinero" value={q} onChange={(e) => setQ(e.target.value)} />
          <label htmlFor="ciudad" className="sr-only">Ciudad</label>
          <select id="ciudad" className="campo md:col-span-3" value={ciudad} onChange={(e) => setCiudad(e.target.value)}><option value="">Todas las ciudades</option>{ciudades.map((c) => <option key={c}>{c}</option>)}</select>
          <Segmentado className="md:col-span-2" opciones={[['lista', 'Lista'], ['mapa', 'Mapa']]} valor={modo} onCambio={setModo} />
        </div>
      </div>
      <div className="contenedor flex flex-col gap-6 pb-16 pt-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <Chips opciones={[['', 'Todos'], ...SERVICIOS.map((s) => [s, s])]} valor={servicio} onCambio={setServicio} />
          <span className="shrink-0 text-[15px] text-azul-700" aria-live="polite">{res.length === 1 ? '1 sede encontrada' : `${res.length} sedes encontradas`}</span>
        </div>
        {res.length === 0 && ips.length > 0 && (
          <div className="flex flex-col items-center gap-3 py-14 text-center"><h2 className="text-xl font-bold">No encontramos sedes con esos filtros</h2><button type="button" onClick={limpiar} className="btn-borde">Limpiar filtros</button></div>
        )}
        {modo === 'lista' && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {res.map((i) => (
              <article key={i.id} className="flex flex-col overflow-hidden rounded-[18px] border border-azul-100 bg-white">
                <img src={i.imagen} alt={`Fachada de la ${i.nombre}`} loading="lazy" className="h-40 w-full object-cover" />
                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div className="flex items-start justify-between gap-2.5"><h2 className="text-lg font-bold">{i.nombre}</h2><span className="shrink-0 rounded-full bg-dorado-100 px-2.5 py-1 text-xs font-semibold text-dorado-800">{i.ciudad}</span></div>
                  <span className="text-sm text-azul-700">{i.direccion}</span>
                  <span className="text-sm text-azul-700"><strong className="text-azul-900">Horario:</strong> {i.horario}</span>
                  <div className="flex flex-wrap gap-1.5">{i.servicios.map((s) => <span key={s} className="rounded-full bg-azul-50 px-2.5 py-1 text-xs text-azul-800">{s}</span>)}</div>
                  <a href={mapa(i)} target="_blank" rel="noreferrer" className="mt-auto border-t border-azul-50 pt-3.5 text-sm font-semibold text-azul-600">Cómo llegar</a>
                </div>
              </article>
            ))}
          </div>
        )}
        {modo === 'mapa' && res.length > 0 && (
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="flex max-h-[640px] flex-col gap-2.5 overflow-auto lg:col-span-4">{res.map((i) => (
              <a key={i.id} href={mapa(i)} target="_blank" rel="noreferrer" className="rounded-[14px] border border-azul-100 bg-white px-4 py-4 hover:border-azul-300"><span className="block font-display font-bold">{i.nombre}</span><span className="text-[13px] text-azul-700">{i.direccion} · {i.ciudad}</span></a>
            ))}</div>
            {/* Para un mapa interactivo real, integra una librería como Leaflet con las coordenadas de cada sede. */}
            <div className="flex min-h-[420px] flex-col items-center justify-center gap-2.5 rounded-[18px] bg-azul-100 p-8 text-center text-azul-800 lg:col-span-8">
              <Icono.mapa width={36} height={36} />
              <span className="font-semibold">Mapa de sedes</span>
              <span className="max-w-sm text-sm text-azul-600">Toca una sede de la lista para abrir su ubicación en Google Maps.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

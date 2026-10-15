import { Link } from 'react-router-dom';
import { PanelAfiliado, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta } from '../../components/ui/Controles.jsx';
import { Cargando, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import { tramitesApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fecha } from '../../utils/formato.js';

export const TIPOS_PQRSD = { peticion: 'Petición', queja: 'Queja', reclamo: 'Reclamo', sugerencia: 'Sugerencia', denuncia: 'Denuncia' };
export const ESTADO_PQRSD = { pendiente: ['Radicada', 'dorado'], en_proceso: ['En gestión', 'azul'], respondida: ['Respondida', 'verde'], cerrado: ['Respondida', 'verde'] };

export default function MisPqrsd() {
  const lista = useDatos(() => tramitesApi.misPqrsd());
  return (
    <PanelAfiliado>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Trámites" titulo="Mis PQRSD"><Link to="/tramites/pqrsd" className="btn-primario">Radicar una PQRSD</Link></TituloPanel>
        {lista.error && <Alerta>{lista.error}</Alerta>}
        {lista.cargando && <Cargando />}
        {lista.datos?.length === 0 && <Vacio titulo="No has radicado PQRSD" texto="Las que radiques con tu sesión iniciada aparecerán aquí con su respuesta." />}
        <div className="flex flex-col gap-3">{lista.datos?.map((p) => { const [t, tono] = ESTADO_PQRSD[p.estado] ?? [p.estado, 'azul']; return (
          <article key={p.radicado} className="tarjeta flex flex-col gap-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><span className="flex flex-col"><span className="font-display text-lg font-extrabold">{p.asunto}</span>
              <span className="text-sm text-azul-600">{TIPOS_PQRSD[p.tipo]} · {p.radicado} · radicada el {fecha(p.creado_en)}</span></span><Insignia tono={tono}>{t}</Insignia></div>
            <p className="text-[15px] text-azul-800">{p.descripcion}</p>
            {p.respuesta ? <div className="rounded-xl border-l-4 border-dorado-400 bg-azul-50 px-4 py-3"><span className="text-xs tracking-wide text-dorado-700">Respuesta · {fecha(p.respondida_en)}</span><p className="text-[15px]">{p.respuesta}</p></div>
              : <span className="text-sm text-azul-600">Te responderemos a más tardar el <strong>{fecha(p.fecha_limite)}</strong>.</span>}
          </article>); })}</div>
      </div>
    </PanelAfiliado>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelAfiliado, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta } from '../../components/ui/Controles.jsx';
import { Cargando, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import { Icono } from '../../components/ui/Iconos.jsx';
import { afiliadosApi, tramitesApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fecha, fechaHora } from '../../utils/formato.js';

export default function Certificados() {
  const af = useDatos(() => afiliadosApi.miAfiliacion());
  const lista = useDatos(() => tramitesApi.misCertificados());
  const [ocupado, setOcupado] = useState(false);
  const [error, setError] = useState('');

  async function expedir() {
    setOcupado(true); setError('');
    try { const c = await tramitesApi.expedirCertificado(); await tramitesApi.descargarCertificado(c); lista.recargar(); } catch (e) { setError(e.message); } finally { setOcupado(false); }
  }
  const descargar = (c) => tramitesApi.descargarCertificado(c).catch((e) => setError(e.message));

  return (
    <PanelAfiliado>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Trámites" titulo="Certificados de afiliación">
          {af.datos?.estado === 'activo' && <button type="button" onClick={expedir} disabled={ocupado} className="btn-dorado"><Icono.descarga width={18} height={18} />{ocupado ? 'Generando…' : 'Generar certificado'}</button>}
        </TituloPanel>
        <p className="max-w-3xl text-[15px] leading-relaxed text-azul-700">El certificado incluye a tu grupo familiar, tu régimen y tu IPS. Es válido por 30 días y trae un código QR para que cualquier entidad compruebe que es auténtico en la página de <Link to="/tramites/verificar-certificado" className="font-semibold text-azul-600">verificación</Link>.</p>
        {af.datos && af.datos.estado !== 'activo' && <Alerta tipo="aviso">El certificado se expide cuando tu afiliación está activa.</Alerta>}
        {(error || lista.error) && <Alerta>{error || lista.error}</Alerta>}
        {lista.cargando && <Cargando />}
        {lista.datos?.length === 0 && <Vacio titulo="Aún no has generado certificados" texto="Genera el primero con el botón de arriba: se descarga en PDF al instante." />}
        <div className="grid gap-3 md:grid-cols-2">{lista.datos?.map((c) => (
          <article key={c.id} className="tarjeta flex flex-col gap-4 p-5">
            <div className="flex items-start justify-between gap-3"><span className="flex flex-col"><span className="font-display text-lg font-extrabold">{c.radicado}</span><span className="text-sm text-azul-600">Expedido el {fechaHora(c.generado_en)}</span></span>
              <Insignia tono={c.vigente ? 'verde' : 'rojo'}>{c.vigente ? 'Vigente' : 'Vencido'}</Insignia></div>
            <div className="flex items-center justify-between gap-3 rounded-xl bg-azul-50 px-4 py-3">
              <span className="flex flex-col"><span className="text-xs tracking-wide text-dorado-700">Código de verificación</span><span className="font-mono text-lg font-bold">{c.codigo}</span></span>
              <span className="text-right text-sm text-azul-700">Válido hasta<br /><strong>{fecha(c.vigente_hasta)}</strong></span>
            </div>
            <button type="button" onClick={() => descargar(c)} className="btn-borde self-start px-4 py-2.5"><Icono.descarga width={18} height={18} />Descargar PDF</button>
          </article>))}</div>
      </div>
    </PanelAfiliado>
  );
}

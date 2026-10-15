import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import Encabezado from '../components/ui/Encabezado.jsx';
import { Alerta, Campo } from '../components/ui/Controles.jsx';
import { tramitesApi } from '../api/servicios.js';
import { fecha } from '../utils/formato.js';

// Pública: una empresa, un colegio o un banco comprueban que un certificado es auténtico.
export default function VerificarCertificado() {
  const [params] = useSearchParams();
  const [codigo, setCodigo] = useState(params.get('codigo') ?? '');
  const [r, setR] = useState(null);
  const [error, setError] = useState('');

  const verificar = async (e) => {
    e?.preventDefault();
    if (codigo.trim().length < 8) return setError('Escribe el código que aparece en el certificado (ej.: K7QM-4XPA).');
    setError(''); setR(null);
    try { setR(await tramitesApi.verificarCertificado(codigo.trim().toUpperCase())); } catch (err) { setError(err.message); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (params.get('codigo')) verificar(); }, []);

  return (
    <>
      <Encabezado migas={[{ texto: 'Trámites' }, { texto: 'Verificar certificado' }]} titulo="Verificar un certificado" texto="Comprueba que un certificado de afiliación de Libitina EPS es auténtico y sigue vigente. Escribe el código o escanea el QR del documento." />
      <section className="contenedor flex max-w-3xl flex-col gap-5 py-12">
        <form onSubmit={verificar} className="tarjeta flex flex-col gap-3 p-6 sm:flex-row sm:items-end">
          <Campo etiqueta="Código de verificación" className="flex-1">{(i) => <input id={i} className="campo font-mono text-lg uppercase" placeholder="XXXX-XXXX" maxLength={9} value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} />}</Campo>
          <button type="submit" className="btn-primario h-12 px-8">Verificar</button>
        </form>
        {error && <Alerta>{error}</Alerta>}
        {r && !r.valido && <Alerta>No existe un certificado con ese código. Revisa que lo hayas escrito bien: si el documento no aparece aquí, no fue expedido por Libitina EPS.</Alerta>}
        {r?.valido && (
          <div className={`flex flex-col gap-4 rounded-[20px] border p-6 ${r.vigente ? 'border-emerald-200 bg-emerald-50' : 'border-dorado-200 bg-dorado-50'}`} role="status">
            <span className="font-display text-2xl font-extrabold">{r.vigente ? '✓ Certificado auténtico y vigente' : 'Certificado auténtico, pero vencido'}</span>
            <dl className="grid gap-3 sm:grid-cols-2">
              {[['Titular', r.titular], ['Documento', r.documento], ['Régimen', r.regimen], ['Beneficiarios incluidos', r.beneficiarios], ['Radicado', r.radicado], ['Expedido', fecha(r.expedido)], ['Válido hasta', fecha(r.vigente_hasta)]].map(([k, v]) => (
                <div key={k}><dt className="text-xs tracking-wide text-azul-700">{k}</dt><dd className="font-semibold capitalize">{v}</dd></div>))}
            </dl>
            <p className="text-sm text-azul-700">Por privacidad, el nombre y el documento se muestran parcialmente. Compáralos con el certificado que tienes en la mano.</p>
          </div>
        )}
      </section>
    </>
  );
}

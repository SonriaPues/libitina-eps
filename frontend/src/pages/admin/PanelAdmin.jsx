import { useEffect, useState } from 'react';
import PanelLayout from '../../components/layout/PanelLayout.jsx';
import { Alerta } from '../../components/ui/Controles.jsx';
import { afiliadosApi } from '../../api/servicios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { nombreIps } from '../../data/ips.js';
import { estado, PARENTESCOS, fecha, nombreCompleto } from '../../utils/formato.js';
import { prestadoresApi } from '../../api/servicios.js';
import { IPS } from '../../data/ips.js';

const FILTROS = [['pendiente', 'Pendientes'], ['activo', 'Aprobadas'], ['rechazado', 'Rechazadas'], ['', 'Todas']];

export default function PanelAdmin() {
  const { usuario } = useAuth();
  const [todas, setTodas] = useState([]);
  const [filtro, setFiltro] = useState('pendiente');
  const [selId, setSelId] = useState(null);
  const [rechazando, setRechazando] = useState(false);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [ips, setIps] = useState(IPS);
  useEffect(() => { prestadoresApi.ips().then(setIps); }, []);

  const cargar = () => afiliadosApi.solicitudes().then((l) => { setTodas(l); setSelId((s) => s ?? l.find((x) => x.estado === 'pendiente')?.id ?? l[0]?.id); }).catch((e) => setError(e.message));
  useEffect(() => { cargar(); }, []);

  const lista = todas.filter((a) => !filtro || a.estado === filtro);
  const sel = todas.find((a) => a.id === selId);
  const cuenta = (e) => todas.filter((a) => a.estado === e).length;

  async function decidir(accion) {
    if (accion === 'rechazar' && motivo.trim().length < 10) return setError('Explica el motivo del rechazo con al menos 10 caracteres: el solicitante lo recibirá por correo.');
    setOcupado(true); setError('');
    try {
      const act = accion === 'aprobar' ? await afiliadosApi.aprobar(sel.id) : await afiliadosApi.rechazar(sel.id, motivo.trim());
      setTodas(todas.map((a) => (a.id === act.id ? act : a))); setRechazando(false); setMotivo('');
    } catch (e) { setError(e.message); } finally { setOcupado(false); }
  }

  return (
    <PanelLayout oscuro menu={[{ texto: 'Afiliaciones', activo: true, contador: cuenta('pendiente'), ruta: '/admin' }, { texto: 'Red de IPS', ruta: '/red-de-ips' }]}>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-col gap-1.5"><span className="antetitulo">Administración</span><h1 className="text-3xl font-extrabold">Solicitudes de afiliación</h1></div>
          <span className="text-sm text-azul-700">Sesión: {usuario?.correo}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[['Pendientes', cuenta('pendiente'), 'text-dorado-700'], ['Aprobadas', cuenta('activo'), 'text-azul-600'], ['Rechazadas', cuenta('rechazado'), 'text-red-700']].map(([t, n, c]) => (
            <div key={t} className="tarjeta flex flex-col gap-1.5 px-5 py-5"><span className="text-sm text-azul-700">{t}</span><span className={`font-display text-4xl font-extrabold ${c}`}>{n}</span></div>
          ))}
        </div>
        {error && <Alerta>{error}</Alerta>}
        <div className="grid gap-5 xl:grid-cols-12">
          <section className="overflow-hidden rounded-[18px] border border-azul-100 bg-white xl:col-span-7">
            <div className="flex gap-1.5 overflow-x-auto border-b border-azul-50 p-3.5" role="tablist">
              {FILTROS.map(([v, t]) => <button key={t} type="button" role="tab" aria-selected={filtro === v} onClick={() => setFiltro(v)} className={`h-10 shrink-0 rounded-[10px] px-4 text-sm font-semibold ${filtro === v ? 'bg-azul-900 text-white' : 'text-azul-700 hover:bg-azul-50'}`}>{t}</button>)}
            </div>
            {lista.length === 0 && <p className="px-6 py-10 text-center text-[15px] text-azul-500">No hay solicitudes en este estado.</p>}
            <ul>{lista.map((a) => (
              <li key={a.id}>
                <button type="button" onClick={() => { setSelId(a.id); setRechazando(false); setMotivo(''); setError(''); }} aria-current={a.id === selId}
                  className={`grid w-full grid-cols-[2fr_1fr_auto] items-center gap-3 border-b border-azul-50 px-5 py-4 text-left md:grid-cols-[2fr_1.2fr_1fr_auto] ${a.id === selId ? 'bg-azul-50 shadow-[inset_4px_0_0_#F6C220]' : 'hover:bg-fondo'}`}>
                  <span className="flex flex-col"><span className="text-[15px] font-semibold">{a.nombres} {a.apellidos}</span><span className="text-[13px] text-azul-500">{a.tipo_documento} {a.numero_documento} · {a.beneficiarios.length} benef.</span></span>
                  <span className="hidden text-sm text-azul-700 md:block">{a.regimen === 'contributivo' ? 'Contributivo' : 'Subsidiado'}</span>
                  <span className="text-sm text-azul-700">{fecha(a.creado_en)}</span>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${estado(a.estado).clase}`}>{estado(a.estado).texto}</span>
                </button>
              </li>
            ))}</ul>
          </section>
          {sel && (
            <section className="tarjeta flex flex-col gap-5 p-6 xl:col-span-5">
              <div className="flex items-start justify-between gap-3"><div className="flex flex-col gap-1"><h2 className="text-xl font-extrabold">{sel.nombres} {sel.apellidos}</h2><span className="text-sm text-azul-500">{sel.tipo_documento} {sel.numero_documento} · {sel.email}</span></div><span className={`rounded-full px-3 py-1 text-xs font-semibold ${estado(sel.estado).clase}`}>{estado(sel.estado).texto}</span></div>
              <dl className="grid grid-cols-2 gap-3.5">{[['Régimen', sel.regimen === 'contributivo' ? 'Contributivo' : 'Subsidiado'], ['IPS', nombreIps(sel.ips_id, ips)], ['Celular', sel.telefono], ['Residencia', `${sel.ciudad} · ${sel.zona}`], ['Afiliación', sel.regimen === 'contributivo' ? `${sel.tipo_cotizante} · categoría ${sel.categoria}` : `Sisbén ${sel.grupo_sisben}`], ...(sel.empleador_nombre ? [['Empleador', `${sel.empleador_nombre} · NIT ${sel.empleador_nit}`]] : [])].map(([k, v]) => <div key={k}><dt className="text-xs tracking-wide text-dorado-600">{k}</dt><dd className="text-[15px]">{v}</dd></div>)}</dl>
              <div className="flex flex-col gap-2"><span className="text-xs tracking-wide text-dorado-600">Beneficiarios</span>
                {sel.beneficiarios.length === 0 && <span className="text-sm text-azul-500">Sin beneficiarios</span>}
                {sel.beneficiarios.map((b) => <div key={b.numero_documento} className="flex justify-between gap-3 rounded-[10px] bg-fondo px-3 py-2.5 text-sm"><span className="font-semibold">{nombreCompleto(b)}</span><span className="text-azul-500">{PARENTESCOS[b.parentesco]} · {b.tipo_documento} {b.numero_documento}</span></div>)}
              </div>
              {sel.estado === 'rechazado' && sel.motivo_rechazo && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-900"><strong>Motivo del rechazo:</strong> {sel.motivo_rechazo}</p>}
              {sel.estado === 'pendiente' && (rechazando ? (
                <div className="flex flex-col gap-3">
                  <label htmlFor="motivo" className="etiqueta">Motivo del rechazo (se enviará por correo)</label>
                  <textarea id="motivo" className="campo h-auto min-h-[96px] py-3" placeholder="Explica qué debe corregir el solicitante" value={motivo} onChange={(e) => { setMotivo(e.target.value); setError(''); }} />
                  <div className="flex justify-end gap-2.5"><button type="button" onClick={() => { setRechazando(false); setMotivo(''); }} className="btn border-[1.5px] border-azul-200 text-azul-600">Cancelar</button><button type="button" disabled={ocupado} onClick={() => decidir('rechazar')} className="btn bg-red-700 font-bold text-white hover:bg-red-800">Confirmar rechazo</button></div>
                </div>
              ) : (
                <div className="mt-auto flex justify-end gap-2.5"><button type="button" onClick={() => setRechazando(true)} className="btn border-[1.5px] border-red-300 font-bold text-red-700 hover:bg-red-50">Rechazar</button><button type="button" disabled={ocupado} onClick={() => decidir('aprobar')} className="btn-primario font-bold">Aprobar afiliación</button></div>
              ))}
              {sel.estado !== 'pendiente' && <span className="mt-auto text-sm text-azul-500">Se envió un correo al solicitante con la decisión.</span>}
            </section>
          )}
        </div>
      </div>
    </PanelLayout>
  );
}

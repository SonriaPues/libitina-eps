import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelAfiliado } from '../../components/layout/Paneles.jsx';
import { EstadoCita } from '../../components/ui/Piezas.jsx';
import { Icono } from '../../components/ui/Iconos.jsx';
import { Alerta } from '../../components/ui/Controles.jsx';
import { afiliadosApi, authApi, prestadoresApi, citasApi } from '../../api/servicios.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { IPS, nombreIps } from '../../data/ips.js';
import { estado, PARENTESCOS, fechaHora, iniciales, nombreCompleto, fechaLarga, hora12 } from '../../utils/formato.js';

const TARJETA = {
  pendiente: { titulo: 'Tu solicitud está en revisión', texto: 'Un administrador está revisando tus datos y los de tu grupo familiar. Te avisaremos por correo cuando haya una respuesta.', caja: 'border-dorado-200 bg-dorado-50', icono: 'bg-dorado-100', marca: '…' },
  activo: { titulo: 'Tu afiliación está activa', texto: 'Ya puedes usar los servicios de salud en tu IPS asignada y descargar tu certificado de afiliación.', caja: 'border-azul-200 bg-azul-50', icono: 'bg-azul-100', marca: '✓' },
  rechazado: { titulo: 'Tu solicitud fue rechazada', texto: 'Revisa el motivo, corrige los datos y vuelve a enviarla. No tienes que inscribirte de nuevo.', caja: 'border-red-200 bg-red-50', icono: 'bg-red-100', marca: '!' },
};

export default function PortalAfiliado() {
  const { usuario } = useAuth();
  const [a, setA] = useState(null);
  const [ips, setIps] = useState(IPS);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [proximas, setProximas] = useState([]);

  useEffect(() => {
    afiliadosApi.miAfiliacion().then(setA).catch((e) => setError(e.message));
    prestadoresApi.ips().then(setIps);
    citasApi.mias().then((m) => setProximas(m.proximas)).catch(() => {});   // en modo demostración no hay citas
  }, []);

  const reenviarVerificacion = () => authApi.reenviarVerificacion().then((r) => setAviso(r.mensaje)).catch((e) => setAviso(e.message));
  const tarjeta = a ? TARJETA[a.estado] ?? TARJETA.pendiente : null;


  return (
    <PanelAfiliado>
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-col gap-1"><span className="text-[15px] text-azul-500">Hola,</span><h1 className="text-3xl font-extrabold">{usuario?.nombre}</h1></div>
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-azul-600 font-bold text-white" aria-hidden="true">{iniciales(usuario?.nombre)}</span>
        </div>
        {usuario && usuario.email_verificado === false && (
          <div className="flex flex-col justify-between gap-3 rounded-2xl border border-azul-200 bg-white px-5 py-4 sm:flex-row sm:items-center">
            <span className="text-[15px] text-azul-800">Confirma tu correo con el enlace que te enviamos a <strong>{usuario.correo}</strong>.</span>
            <button type="button" onClick={reenviarVerificacion} className="shrink-0 text-sm font-semibold text-azul-600">Reenviar enlace</button>
          </div>
        )}
        {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
        {error && <Alerta>{error}</Alerta>}
        {!a && !error && <p className="text-azul-500">Cargando tu información…</p>}
        {a && (
          <>
            <section className={`rounded-[20px] border p-6 md:p-7 ${tarjeta.caja}`}>
              <div className="flex flex-col gap-5 md:flex-row md:items-start">
                <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-[14px] text-2xl font-extrabold ${tarjeta.icono}`} aria-hidden="true">{tarjeta.marca}</span>
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-3"><h2 className="text-[22px] font-extrabold">{tarjeta.titulo}</h2><span className={`rounded-full px-3 py-1 text-[13px] font-semibold ${estado(a.estado).clase}`}>{estado(a.estado).texto}</span></div>
                  <p className="max-w-[720px] text-[15px] leading-relaxed text-azul-700">{tarjeta.texto}</p>
                  {a.estado === 'rechazado' && a.motivo_rechazo && (
                    <div className="mt-1.5 flex flex-col gap-1 rounded-xl border border-red-200 bg-white px-4 py-3.5"><span className="text-xs tracking-wide text-red-700">Motivo del rechazo</span><span className="text-[15px] text-red-950">{a.motivo_rechazo}</span></div>
                  )}
                </div>
                {a.estado === 'rechazado' && <Link to="/inscripcion?corregir=1" className="btn-primario shrink-0">Corregir y reenviar</Link>}
                {a.estado === 'activo' && <Link to="/portal/citas?agendar=1" className="btn-dorado shrink-0">Agendar una cita</Link>}
              </div>
            </section>

            {a.estado === 'activo' && (
              <section className="tarjeta flex flex-col gap-3 p-6">
                <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-bold">Próximas citas</h2><Link to="/portal/citas" className="text-sm font-semibold text-azul-600">Ver todas</Link></div>
                {proximas.length === 0 && <span className="text-[15px] text-azul-600">No tienes citas próximas. <Link to="/portal/citas?agendar=1" className="font-semibold text-azul-600">Agenda una</Link>.</span>}
                <div className="grid gap-3 md:grid-cols-2">{proximas.slice(0, 2).map((c) => (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-xl bg-azul-50 px-4 py-3">
                    <span className="flex flex-col"><span className="font-semibold">{c.especialidad} · {c.paciente.split(' ')[0]}</span><span className="text-sm capitalize text-azul-700">{fechaLarga(c.fecha)}, {hora12(c.hora)} · {c.doctor}</span></span>
                    <EstadoCita estado={c.estado} />
                  </div>))}</div>
              </section>
            )}

            <div className="grid gap-5 lg:grid-cols-3">
              <section className="tarjeta flex flex-col gap-4 p-6">
                <h2 className="text-lg font-bold">Mi afiliación</h2>
                <dl className="flex flex-col gap-3.5">{[
                  ['Régimen', a.regimen === 'contributivo' ? `Contributivo · categoría ${a.categoria}` : `Subsidiado · Sisbén ${a.grupo_sisben}`],
                  ['IPS asignada', nombreIps(a.ips_id, ips)], ['Documento', `${a.tipo_documento} ${a.numero_documento}`],
                  ['Residencia', `${a.ciudad}, ${a.departamento} · zona ${a.zona}`], ['Correo', a.email], ['Celular', a.telefono],
                ].map(([k, v]) => <div key={k}><dt className="text-xs tracking-wide text-dorado-600">{k}</dt><dd className="text-[15px]">{v}</dd></div>)}</dl>
              </section>
              <section className="tarjeta flex flex-col gap-3.5 p-6">
                <div className="flex items-center justify-between"><h2 className="text-lg font-bold">Grupo familiar</h2><span className="text-sm text-azul-500">{a.beneficiarios.length === 1 ? '1 beneficiario' : `${a.beneficiarios.length} beneficiarios`}</span></div>
                {a.beneficiarios.length === 0 && <p className="text-sm text-azul-500">No tienes beneficiarios registrados.</p>}
                {a.beneficiarios.map((b) => (
                  <div key={b.id} className="flex items-center gap-3.5 rounded-xl bg-fondo p-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-azul-100 text-sm font-bold text-azul-800" aria-hidden="true">{iniciales(nombreCompleto(b))}</span>
                    <span className="flex flex-col"><span className="text-[15px] font-semibold">{nombreCompleto(b)}</span><span className="text-[13px] text-azul-500">{PARENTESCOS[b.parentesco]} · {b.tipo_documento} {b.numero_documento}</span></span>
                  </div>
                ))}
              </section>
              <section className="tarjeta flex flex-col gap-4 p-6">
                <h2 className="text-lg font-bold">Historial de la solicitud</h2>
                <ol className="flex flex-col">{a.historial.map((h, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span className="flex flex-col items-center"><span className={`mt-1 h-3.5 w-3.5 rounded-full ${h.estado === 'rechazado' ? 'bg-red-600' : h.estado === 'activo' ? 'bg-azul-600' : 'bg-dorado-500'}`} />{i < a.historial.length - 1 && <span className="w-0.5 flex-1 bg-azul-100" />}</span>
                    <span className="flex flex-col gap-0.5 pb-5"><span className="text-[15px] font-semibold">{h.detalle.split(':')[0]}</span><span className="text-[13px] text-azul-500">{fechaHora(h.fecha)}</span></span>
                  </li>
                ))}</ol>
              </section>
            </div>
          </>
        )}
      </div>
    </PanelAfiliado>
  );
}

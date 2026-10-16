import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelDoctor, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta } from '../../components/ui/Controles.jsx';
import { Cargando, EstadoCita } from '../../components/ui/Piezas.jsx';
import { Icono } from '../../components/ui/Iconos.jsx';
import { citasApi, redApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaLarga, hora12, hoyIso, sumarDias } from '../../utils/formato.js';

const lunesDe = (iso) => { const d = new Date(`${iso}T12:00:00`); return sumarDias(iso, -((d.getDay() + 6) % 7)); };
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const saludo = (h) => (h < 12 ? 'Buenos días' : h < 19 ? 'Buenas tardes' : 'Buenas noches');
const minutosHasta = (fecha, hora) => Math.round((new Date(`${fecha}T${hora}:00`) - new Date()) / 60000);
const enCuanto = (m) => (m <= 0 ? 'ahora' : m < 60 ? `en ${m} min` : m < 1440 ? `en ${Math.floor(m / 60)} h ${m % 60 ? `${m % 60} min` : ''}` : `en ${Math.round(m / 1440)} días`);

// Inicio del portal del doctor: su próxima cita, el día de hoy y la semana de un vistazo.
export default function InicioDoctor() {
  const hoy = hoyIso();
  const lunes = lunesDe(hoy);
  const perfil = useDatos(() => redApi.miPerfil());
  const semana = useDatos(() => citasApi.agendaDoctor(lunes, sumarDias(lunes, 6)), [lunes]);
  const mes = useDatos(() => citasApi.agendaDoctor(sumarDias(hoy, -30), hoy), [hoy]);
  const proximas = useDatos(() => citasApi.agendaDoctor(hoy, sumarDias(hoy, 30)), [hoy]);
  const [, refrescar] = useState(0);
  useEffect(() => { const t = setInterval(() => refrescar((x) => x + 1), 60000); return () => clearInterval(t); }, []);

  const citasSemana = semana.datos ?? [];
  const deHoy = citasSemana.filter((c) => c.fecha === hoy && c.estado !== 'cancelada');
  const siguiente = (proximas.datos ?? []).find((c) => c.estado === 'confirmada' && minutosHasta(c.fecha, c.hora_fin ?? c.hora) > 0);
  const pasadas = (mes.datos ?? []).filter((c) => ['realizada', 'no_asistio'].includes(c.estado));
  const asistencia = pasadas.length ? Math.round((pasadas.filter((c) => c.estado === 'realizada').length / pasadas.length) * 100) : null;
  const porDia = DIAS.map((dia, i) => {
    const f = sumarDias(lunes, i); const lista = citasSemana.filter((c) => c.fecha === f && c.estado !== 'cancelada');
    return { dia, fecha: f, total: lista.length, atendidas: lista.filter((c) => c.estado === 'realizada').length };
  });
  const maximo = Math.max(4, ...porDia.map((d) => d.total));
  const p = perfil.datos;
  const titulo = p ? `${saludo(new Date().getHours())}, ${p.nombre.split(' ')[0]}` : 'Portal del doctor';

  return (
    <PanelDoctor>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo={p ? `${p.especialidad} · ${fechaLarga(hoy)}` : fechaLarga(hoy)} titulo={titulo}>
          <Link to="/doctor/agenda" className="btn-primario"><Icono.calendario width={18} height={18} />Ver mi agenda</Link>
        </TituloPanel>
        {(semana.error || perfil.error) && <Alerta>{semana.error || perfil.error}</Alerta>}

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="flex flex-col justify-between gap-4 rounded-[22px] bg-azul-950 p-6 text-white lg:col-span-2">
            <span className="text-sm font-semibold tracking-wide text-dorado-400">Próxima cita</span>
            {proximas.cargando && <span className="text-azul-200">Buscando…</span>}
            {!proximas.cargando && !siguiente && <div className="flex flex-col gap-1"><span className="font-display text-2xl font-extrabold">Sin citas pendientes</span><span className="text-azul-200">Cuando agenden en tus turnos aparecerán aquí.</span></div>}
            {siguiente && (
              <>
                <div className="flex flex-col gap-1">
                  <span className="font-display text-3xl font-extrabold">{hora12(siguiente.hora)}</span>
                  <span className="text-azul-200 first-letter:uppercase">{siguiente.fecha === hoy ? 'Hoy' : fechaLarga(siguiente.fecha)} · {enCuanto(minutosHasta(siguiente.fecha, siguiente.hora))}</span>
                </div>
                <div className="flex flex-col gap-0.5 border-t border-white/10 pt-4"><span className="text-lg font-bold">{siguiente.paciente}</span>
                  <span className="line-clamp-2 text-sm text-azul-200">{siguiente.motivo}</span></div>
                <Link to={`/doctor/citas/${siguiente.id}`} className="btn-dorado self-start">{siguiente.fecha <= hoy ? 'Atender' : 'Ver detalle'}</Link>
              </>
            )}
          </section>

          <div className="grid grid-cols-2 gap-4 lg:col-span-3">
            {[['Citas hoy', deHoy.length, 'text-azul-900'], ['Por atender hoy', deHoy.filter((c) => c.estado === 'confirmada').length, 'text-azul-600'],
              ['Atendidas hoy', deHoy.filter((c) => c.estado === 'realizada').length, 'text-emerald-700'],
              ['Asistencia (30 días)', asistencia === null ? '—' : `${asistencia} %`, 'text-dorado-700']].map(([t, n, color]) => (
              <div key={t} className="tarjeta flex flex-col gap-1 px-5 py-4"><span className="text-sm text-azul-700">{t}</span><span className={`font-display text-3xl font-extrabold ${color}`}>{n}</span></div>))}
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <section className="tarjeta flex flex-col gap-4 p-6 lg:col-span-3" aria-labelledby="titulo-semana">
            <div className="flex items-baseline justify-between gap-3"><h2 id="titulo-semana" className="text-lg font-bold">Citas de esta semana</h2>
              <span className="text-sm text-azul-500">{citasSemana.filter((c) => c.estado !== 'cancelada').length} en total</span></div>
            <div className="grid h-48 grid-cols-7 items-end gap-3 border-b border-azul-100 pb-0" role="img"
              aria-label={porDia.map((d) => `${d.dia}: ${d.total} citas`).join(', ')}>
              {porDia.map((d) => (
                <div key={d.dia} className="group relative flex h-full flex-col items-center justify-end gap-1.5" title={`${d.dia}: ${d.total} citas, ${d.atendidas} atendidas`}>
                  <span className="text-xs font-semibold text-azul-700">{d.total || ''}</span>
                  <div className={`w-full max-w-[44px] rounded-t-[4px] transition-colors ${d.fecha === hoy ? 'bg-dorado-400' : 'bg-azul-600 group-hover:bg-azul-700'}`}
                    style={{ height: `${(d.total / maximo) * 100}%`, minHeight: d.total ? 6 : 0 }} />
                </div>))}
            </div>
            <div className="grid grid-cols-7 gap-3 text-center text-xs text-azul-600">{porDia.map((d) => <span key={d.dia} className={d.fecha === hoy ? 'font-bold text-azul-900' : ''}>{d.dia}</span>)}</div>
            <span className="text-xs text-azul-500">La barra dorada es hoy. Pasa el cursor sobre un día para ver cuántas atendiste.</span>
          </section>

          <section className="tarjeta flex flex-col gap-3 p-6 lg:col-span-2">
            <h2 className="text-lg font-bold">Hoy</h2>
            {semana.cargando && <Cargando />}
            {!semana.cargando && deHoy.length === 0 && <span className="text-sm text-azul-600">No tienes citas hoy.</span>}
            <ul className="flex flex-col divide-y divide-azul-50">{deHoy.map((c) => (
              <li key={c.id}><Link to={`/doctor/citas/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-azul-600">
                <span className="flex items-center gap-3"><span className="w-[72px] font-display text-sm font-bold">{hora12(c.hora)}</span><span className="text-sm">{c.paciente}</span></span>
                <EstadoCita estado={c.estado} /></Link></li>))}</ul>
          </section>
        </div>
      </div>
    </PanelDoctor>
  );
}

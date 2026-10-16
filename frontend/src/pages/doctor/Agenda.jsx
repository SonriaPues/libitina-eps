import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelDoctor, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta, Segmentado } from '../../components/ui/Controles.jsx';
import CalendarioDoctor from '../../components/horarios/CalendarioDoctor.jsx';
import { Cargando, EstadoCita, Vacio } from '../../components/ui/Piezas.jsx';
import { citasApi, redApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaLarga, hora12, hoyIso, sumarDias } from '../../utils/formato.js';

// Lunes de la semana de una fecha
const lunesDe = (iso) => { const d = new Date(`${iso}T12:00:00`); return sumarDias(iso, -((d.getDay() + 6) % 7)); };

export default function Agenda() {
  const [lunes, setLunes] = useState(lunesDe(hoyIso()));
  const perfil = useDatos(() => redApi.miPerfil());
  const agenda = useDatos(() => citasApi.agendaDoctor(lunes, sumarDias(lunes, 6)), [lunes]);
  const malla = useDatos(() => citasApi.mallaDoctor(lunes), [lunes]);
  const [vista, setVista] = useState('calendario');
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  const citas = agenda.datos ?? [];
  const hoy = hoyIso();
  const conteo = (e) => citas.filter((c) => c.estado === e).length;

  return (
    <PanelDoctor>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo={perfil.datos ? `${perfil.datos.especialidad}` : 'Portal del doctor'} titulo={perfil.datos ? `Hola, ${perfil.datos.nombre}` : 'Mi agenda'}>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setLunes(sumarDias(lunes, -7))} className="btn border-[1.5px] border-azul-200 px-3 py-2 text-azul-700" aria-label="Semana anterior">‹</button>
            <button type="button" onClick={() => setLunes(lunesDe(hoy))} className="btn border-[1.5px] border-azul-200 px-4 py-2 text-azul-700">Hoy</button>
            <button type="button" onClick={() => setLunes(sumarDias(lunes, 7))} className="btn border-[1.5px] border-azul-200 px-3 py-2 text-azul-700" aria-label="Semana siguiente">›</button>
          </div>
        </TituloPanel>
        {(agenda.error || perfil.error) && <Alerta>{agenda.error || perfil.error}</Alerta>}
        <div className="grid gap-3 sm:grid-cols-3">
          {[['Por atender', conteo('confirmada'), 'text-azul-600'], ['Atendidas', conteo('realizada'), 'text-emerald-700'], ['No asistieron', conteo('no_asistio'), 'text-dorado-700']].map(([t, n, c]) => (
            <div key={t} className="tarjeta flex flex-col gap-1 px-5 py-4"><span className="text-sm text-azul-700">{t} esta semana</span><span className={`font-display text-3xl font-extrabold ${c}`}>{n}</span></div>))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold first-letter:uppercase">Semana del {fechaLarga(dias[0])} al {fechaLarga(dias[6])}</h2>
          <Segmentado className="w-[260px]" opciones={[['calendario', 'Calendario'], ['lista', 'Lista']]} valor={vista} onCambio={setVista} />
        </div>
        {agenda.cargando && <Cargando />}
        {vista === 'calendario' && malla.datos && <CalendarioDoctor datos={malla.datos} fechas={dias} />}
        {vista === 'calendario' && malla.datos && <span className="-mt-3 text-sm text-azul-600">El fondo azul es tu turno. Haz clic en una cita para ver la historia del paciente y atenderla.</span>}
        {vista === 'lista' && !agenda.cargando && citas.length === 0 && <Vacio titulo="Sin citas esta semana" texto="Cuando los afiliados agenden en tus turnos, aparecerán aquí." />}
        {vista === 'lista' && <div className="flex flex-col gap-4">{dias.map((d) => { const delDia = citas.filter((c) => c.fecha === d); if (!delDia.length) return null; return (
          <section key={d} className="flex flex-col gap-2">
            <h2 className={`text-[15px] font-bold capitalize ${d === hoy ? 'text-azul-600' : 'text-azul-900'}`}>{fechaLarga(d)}{d === hoy && ' · hoy'}</h2>
            <div className="overflow-hidden rounded-[16px] border border-azul-100 bg-white">{delDia.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-azul-50 px-4 py-3 last:border-0">
                <span className="flex items-center gap-4"><span className="w-20 font-display font-bold">{hora12(c.hora)}</span>
                  <span className="flex flex-col"><span className="font-semibold">{c.paciente}</span><span className="text-sm text-azul-600">{c.paciente_documento} · {c.motivo}</span></span></span>
                <span className="flex items-center gap-3"><EstadoCita estado={c.estado} />
                  {['confirmada', 'realizada'].includes(c.estado) && <Link to={`/doctor/citas/${c.id}`} className={c.estado === 'confirmada' && d <= hoy ? 'btn-primario px-4 py-2' : 'btn-borde px-4 py-2'}>{c.estado === 'confirmada' && d <= hoy ? 'Atender' : 'Ver'}</Link>}</span>
              </div>))}</div>
          </section>); })}</div>}
      </div>
    </PanelDoctor>
  );
}

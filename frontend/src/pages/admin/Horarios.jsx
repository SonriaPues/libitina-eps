import { useEffect, useMemo, useState } from 'react';
import { PanelAdministrador, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta, Campo, Segmentado } from '../../components/ui/Controles.jsx';
import { Cargando, Vacio } from '../../components/ui/Piezas.jsx';
import MallaSemana from '../../components/horarios/MallaSemana.jsx';
import GanttDia from '../../components/horarios/GanttDia.jsx';
import DialogoTurno from '../../components/horarios/DialogoTurno.jsx';
import { colorDe } from '../../components/horarios/comun.js';
import { citasApi, redApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaLarga, hoyIso, sumarDias } from '../../utils/formato.js';

const lunesDe = (iso) => { const d = new Date(`${iso}T12:00:00`); return sumarDias(iso, -((d.getDay() + 6) % 7)); };

// Malla de horarios del administrador: semana por sede y día tipo Gantt, editables arrastrando.
export default function Horarios() {
  const sedes = useDatos(() => redApi.sedes());
  const [sede, setSede] = useState('');
  const [vista, setVista] = useState('semana');
  const [fecha, setFecha] = useState(hoyIso());
  const [especialidad, setEspecialidad] = useState('');
  const [dialogo, setDialogo] = useState(null);       // { doctor, turno?, inicial? }
  const [aviso, setAviso] = useState(null);           // { tipo, texto }

  useEffect(() => { if (!sede && sedes.datos?.length) setSede(sedes.datos[0].id); }, [sedes.datos, sede]);
  const desde = vista === 'semana' ? lunesDe(fecha) : fecha;
  const clave = `${sede}|${desde}|${vista}`;
  const malla = useDatos(() => (sede ? citasApi.malla(sede, desde, vista === 'semana' ? 7 : 1).then((m) => ({ ...m, clave })) : Promise.resolve(null)), [clave]);
  const fechas = Array.from({ length: 7 }, (_, i) => sumarDias(desde, i));

  const datos = useMemo(() => {
    if (!malla.datos || malla.datos.clave !== clave) return null;     // aún no llega la sede o la fecha elegida
    const docs = malla.datos.doctores.filter((d) => !especialidad || d.especialidad_codigo === especialidad);
    return { ...malla.datos, doctores: docs };
  }, [malla.datos, clave, especialidad]);
  const especialidades = useMemo(() => [...new Map((malla.datos?.clave === clave ? malla.datos.doctores : []).map((d) => [d.especialidad_codigo, d.especialidad])).entries()], [malla.datos, clave]);

  const avisar = (tipo, texto) => { setAviso({ tipo, texto }); if (tipo === 'exito') setTimeout(() => setAviso(null), 3500); };
  const accion = async (fn, exito) => {
    try { await fn(); avisar('exito', exito); malla.recargar(); } catch (e) { avisar('error', e.message); malla.recargar(); throw e; }
  };
  const mover = (t, nuevo) => accion(() => citasApi.moverTurno(t.id, nuevo), 'Turno actualizado.').catch(() => {});
  const crear = (doctor, nuevo) => accion(() => citasApi.crearTurno(doctor.doctor_id, { ...nuevo, punto_atencion_id: sede }), 'Turno creado.');
  const nombreSede = sedes.datos?.find((s) => s.id === sede)?.nombre ?? '';

  // Totales de la vista: turnos, horas de atención y citas
  const resumen = useMemo(() => {
    if (!datos) return null;
    const ids = new Set(datos.doctores.map((d) => d.doctor_id));
    const dias = vista === 'semana' ? fechas : [fecha];
    const semana = dias.map((f) => (new Date(`${f}T12:00:00`).getDay() + 6) % 7);
    const turnos = datos.turnos.filter((t) => ids.has(t.doctor_id) && semana.includes(t.dia_semana));
    const horas = turnos.reduce((a, t) => a + (Number(t.hora_fin.slice(0, 2)) * 60 + Number(t.hora_fin.slice(3)) - Number(t.hora_inicio.slice(0, 2)) * 60 - Number(t.hora_inicio.slice(3))) / 60, 0);
    return { profesionales: datos.doctores.length, turnos: turnos.length, horas, citas: datos.citas.filter((c) => ids.has(c.doctor_id)).length };
  }, [datos, vista, fecha]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <PanelAdministrador>
      <div className="flex flex-col gap-5">
        <TituloPanel antetitulo="Administración" titulo="Horarios por sede">
          <Segmentado className="w-[260px]" opciones={[['semana', 'Semana'], ['dia', 'Día']]} valor={vista} onCambio={setVista} />
        </TituloPanel>

        <div className="flex flex-wrap items-end gap-3">
          <Campo etiqueta="Sede" className="w-full sm:w-64">{(id) => <select id={id} className="campo" value={sede} onChange={(e) => { setSede(e.target.value); setEspecialidad(''); }}>
            {(sedes.datos ?? []).map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>}</Campo>
          <Campo etiqueta="Especialidad" className="w-full sm:w-56">{(id) => <select id={id} className="campo" value={especialidad} onChange={(e) => setEspecialidad(e.target.value)}>
            <option value="">Todas</option>{especialidades.map(([c, n]) => <option key={c} value={c}>{n}</option>)}</select>}</Campo>
          <div className="flex items-center gap-2 sm:ml-auto">
            <button type="button" aria-label="Anterior" onClick={() => setFecha(sumarDias(fecha, vista === 'semana' ? -7 : -1))} className="btn border-[1.5px] border-azul-200 px-3 py-2 text-azul-700">‹</button>
            <button type="button" onClick={() => setFecha(hoyIso())} className="btn border-[1.5px] border-azul-200 px-4 py-2 text-azul-700">Hoy</button>
            <button type="button" aria-label="Siguiente" onClick={() => setFecha(sumarDias(fecha, vista === 'semana' ? 7 : 1))} className="btn border-[1.5px] border-azul-200 px-3 py-2 text-azul-700">›</button>
            {vista === 'dia' && <input type="date" aria-label="Fecha" className="campo h-11 w-auto" value={fecha} onChange={(e) => e.target.value && setFecha(e.target.value)} />}
          </div>
        </div>

        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-bold first-letter:uppercase">{nombreSede} · {vista === 'semana' ? `semana del ${fechaLarga(fechas[0])} al ${fechaLarga(fechas[6])}` : fechaLarga(fecha)}</h2>
          {resumen && <span className="text-sm text-azul-600">{resumen.profesionales} profesionales · {resumen.turnos} turnos · {Math.round(resumen.horas)} h de atención · {resumen.citas} citas</span>}
        </div>

        {aviso && <Alerta tipo={aviso.tipo}>{aviso.texto}</Alerta>}
        {(sedes.error || malla.error) && <Alerta>{sedes.error || malla.error}</Alerta>}
        {!datos && sede && !malla.error && <Cargando texto="Cargando la malla…" />}
        {datos && !datos.doctores.length && <Vacio titulo="Sin profesionales en esta sede" texto="Crea doctores en 'Doctores y agendas' con esta sede como principal, o asígnales turnos aquí." />}
        {datos?.doctores.length > 0 && (vista === 'semana'
          ? <MallaSemana datos={datos} fechas={fechas} editable onMover={mover}
              onNuevo={(doctor, inicial) => setDialogo({ doctor, inicial })} onEditar={(doctor, turno) => setDialogo({ doctor, turno })} />
          : <GanttDia datos={datos} fecha={fecha} editable onCambiar={mover}
              onCrear={(doctor, nuevo, abrir) => (abrir ? setDialogo({ doctor, inicial: nuevo }) : crear(doctor, nuevo).catch(() => {}))}
              onEditar={(doctor, turno) => setDialogo({ doctor, turno })} />)}

        {datos?.doctores.length > 0 && (
          <div className="flex flex-col gap-2 text-sm text-azul-600">
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">{especialidades.map(([c, n]) => { const [f, t] = colorDe(c); return (
              <span key={c} className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm border-l-[3px]" style={{ background: f, borderColor: t }} />{n}</span>); })}
              {vista === 'dia' && <><span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-dorado-400" />Cita por atender</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-4 rounded-sm bg-emerald-500" />Atendida</span></>}
              <span className="flex items-center gap-1.5"><span className="h-3 w-5 rounded-sm" style={{ background: 'repeating-linear-gradient(135deg,#F3F5F8 0 4px,#E4E9EF 4px 8px)' }} />Día bloqueado</span></div>
            <span>{vista === 'semana'
              ? 'Arrastra un turno a otro día para moverlo. Haz clic en un turno para cambiar sus horas o quitarlo, o en un espacio vacío para crear uno.'
              : 'Arrastra una barra para moverla y sus bordes para estirarla. Arrastra sobre un espacio vacío para crear un turno, o haz clic para elegir las horas. Los cambios aplican a ese día de todas las semanas.'}
              {' '}Si un cambio deja citas agendadas por fuera, no se aplica.</span>
          </div>
        )}
      </div>

      {dialogo && <DialogoTurno doctor={dialogo.doctor} turno={dialogo.turno} inicial={dialogo.inicial} onCerrar={() => setDialogo(null)}
        onGuardar={(f) => (dialogo.turno ? accion(() => citasApi.moverTurno(dialogo.turno.id, f), 'Turno actualizado.') : crear(dialogo.doctor, f))}
        onQuitar={() => accion(() => citasApi.borrarTurno(dialogo.turno.id), 'Turno quitado.')} />}
    </PanelAdministrador>
  );
}

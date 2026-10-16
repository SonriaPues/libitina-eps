import { useState } from 'react';
import { Alerta, Campo } from '../ui/Controles.jsx';
import { DIAS_SEMANA } from '../../utils/formato.js';
import { OPCIONES_HORA } from './comun.js';

// Crear o editar un turno desde las mallas (clic sobre un espacio vacío o sobre un turno).
export default function DialogoTurno({ doctor, turno, inicial, onGuardar, onQuitar, onCerrar }) {
  const [f, setF] = useState({ dia_semana: turno?.dia_semana ?? inicial?.dia_semana ?? 0, hora_inicio: turno?.hora_inicio ?? inicial?.hora_inicio ?? '07:00',
    hora_fin: turno?.hora_fin ?? inicial?.hora_fin ?? '13:00' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const correr = async (fn) => { setEnviando(true); setError(''); try { await fn(); onCerrar(); } catch (e) { setError(e.message); } finally { setEnviando(false); } };
  const guardar = (e) => { e.preventDefault(); if (f.hora_fin <= f.hora_inicio) return setError('La hora de fin debe ser posterior a la de inicio.'); correr(() => onGuardar({ ...f, dia_semana: Number(f.dia_semana) })); };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-azul-950/40 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCerrar()}>
      <form onSubmit={guardar} role="dialog" aria-modal="true" aria-label={turno ? 'Editar turno' : 'Nuevo turno'} className="flex w-full max-w-md flex-col gap-4 rounded-[20px] bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-0.5"><h2 className="text-xl font-extrabold">{turno ? 'Editar turno' : 'Nuevo turno'}</h2>
          <span className="text-sm text-azul-600">{doctor.nombre} · {doctor.especialidad}</span></div>
        <Campo etiqueta="Día">{(id) => <select id={id} className="campo" value={f.dia_semana} onChange={(e) => setF({ ...f, dia_semana: e.target.value })}>
          {DIAS_SEMANA.map((d, i) => <option key={d} value={i}>{d}</option>)}</select>}</Campo>
        <div className="grid grid-cols-2 gap-3">
          <Campo etiqueta="Desde">{(id) => <select id={id} className="campo" value={f.hora_inicio} onChange={(e) => setF({ ...f, hora_inicio: e.target.value })}>
            {OPCIONES_HORA.slice(0, -1).map((h) => <option key={h}>{h}</option>)}</select>}</Campo>
          <Campo etiqueta="Hasta">{(id) => <select id={id} className="campo" value={f.hora_fin} onChange={(e) => setF({ ...f, hora_fin: e.target.value })}>
            {OPCIONES_HORA.slice(1).map((h) => <option key={h}>{h}</option>)}</select>}</Campo>
        </div>
        {error && <Alerta>{error}</Alerta>}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          {turno ? <button type="button" disabled={enviando} onClick={() => correr(onQuitar)} className="text-sm font-semibold text-red-700 hover:underline">Quitar turno</button> : <span />}
          <span className="flex gap-2"><button type="button" onClick={onCerrar} className="btn-borde px-5">Cancelar</button>
            <button type="submit" disabled={enviando} className="btn-primario px-6">{enviando ? 'Guardando…' : 'Guardar'}</button></span>
        </div>
      </form>
    </div>
  );
}

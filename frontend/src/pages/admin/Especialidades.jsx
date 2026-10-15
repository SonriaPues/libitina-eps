import { useState } from 'react';
import { PanelAdministrador, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta, Campo } from '../../components/ui/Controles.jsx';
import { Cargando, Insignia } from '../../components/ui/Piezas.jsx';
import { redApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';

const NUEVA = { nombre: '', descripcion: '', requiere_remision: true, duracion_cita_min: 20 };

export default function Especialidades() {
  const lista = useDatos(() => redApi.especialidades(true));
  const [nueva, setNueva] = useState(NUEVA);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  const editar = (e, cambios, msg) => redApi.editarEspecialidad(e.id, cambios).then(() => { setAviso(msg); setError(''); lista.recargar(); }).catch((err) => setError(err.message));

  async function crear(ev) {
    ev.preventDefault();
    if (nueva.nombre.trim().length < 3) return setError('Escribe el nombre de la especialidad.');
    try { await redApi.crearEspecialidad({ ...nueva, nombre: nueva.nombre.trim(), duracion_cita_min: Number(nueva.duracion_cita_min) });
      setAviso(`Creamos ${nueva.nombre.trim()}. Ya puedes asignarla a los doctores.`); setNueva(NUEVA); setError(''); lista.recargar();
    } catch (err) { setError(err.message); }
  }

  return (
    <PanelAdministrador>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Administración" titulo="Especialidades" />
        <p className="max-w-3xl text-[15px] leading-relaxed text-azul-700">Medicina general y odontología se agendan directamente. Las demás exigen una remisión vigente de medicina general, como en el sistema de salud colombiano. La duración define el tamaño de los cupos en la agenda.</p>
        {error && <Alerta>{error}</Alerta>}
        {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
        {lista.cargando && !lista.datos && <Cargando />}
        <div className="grid items-start gap-5 xl:grid-cols-3">
          <div className="overflow-x-auto rounded-[18px] border border-azul-100 bg-white xl:col-span-2">
            {lista.datos && <table className="w-full min-w-[620px] text-left text-sm">
              <thead className="bg-azul-50 text-azul-700"><tr>{['Especialidad', 'Acceso', 'Duración', 'Doctores', 'Estado'].map((t) => <th key={t} className="px-4 py-3 font-semibold">{t}</th>)}</tr></thead>
              <tbody>{lista.datos.map((e) => { const base = e.codigo === 'medicina_general'; return (
                <tr key={e.id} className="border-t border-azul-50">
                  <td className="px-4 py-3"><span className="block font-semibold">{e.nombre}</span>{e.descripcion && <span className="text-xs text-azul-600">{e.descripcion}</span>}</td>
                  <td className="px-4 py-3"><select aria-label={`Acceso a ${e.nombre}`} disabled={base} className="campo h-9 w-40" value={e.requiere_remision ? 'si' : 'no'}
                    onChange={(ev) => editar(e, { requiere_remision: ev.target.value === 'si' }, `${e.nombre}: ${ev.target.value === 'si' ? 'ahora exige remisión' : 'ahora se agenda directo'}.`)}>
                    <option value="no">Directa</option><option value="si">Con remisión</option></select></td>
                  <td className="px-4 py-3"><select aria-label={`Duración de ${e.nombre}`} className="campo h-9 w-28" value={e.duracion_cita_min}
                    onChange={(ev) => editar(e, { duracion_cita_min: Number(ev.target.value) }, `Las citas de ${e.nombre} ahora duran ${ev.target.value} minutos.`)}>
                    {[10, 15, 20, 30, 40, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select></td>
                  <td className="px-4 py-3">{e.doctores}</td>
                  <td className="px-4 py-3">{base ? <Insignia tono="verde">Activa</Insignia> : (
                    <button type="button" onClick={() => editar(e, { activa: !e.activa }, `${e.nombre} quedó ${e.activa ? 'desactivada' : 'activa'}.`)}>
                      <Insignia tono={e.activa ? 'verde' : 'rojo'}>{e.activa ? 'Activa' : 'Inactiva'}</Insignia></button>)}</td>
                </tr>); })}</tbody>
            </table>}
          </div>
          <form onSubmit={crear} className="tarjeta flex flex-col gap-4 p-6">
            <h2 className="text-lg font-extrabold">Nueva especialidad</h2>
            <Campo etiqueta="Nombre">{(i) => <input id={i} className="campo" placeholder="Ej.: Neumología" value={nueva.nombre} onChange={(e) => setNueva({ ...nueva, nombre: e.target.value })} />}</Campo>
            <Campo etiqueta="Descripción (opcional)">{(i) => <input id={i} className="campo" value={nueva.descripcion} onChange={(e) => setNueva({ ...nueva, descripcion: e.target.value })} />}</Campo>
            <div className="grid grid-cols-2 gap-3">
              <Campo etiqueta="Acceso">{(i) => <select id={i} className="campo" value={nueva.requiere_remision ? 'si' : 'no'} onChange={(e) => setNueva({ ...nueva, requiere_remision: e.target.value === 'si' })}><option value="si">Con remisión</option><option value="no">Directa</option></select>}</Campo>
              <Campo etiqueta="Duración">{(i) => <select id={i} className="campo" value={nueva.duracion_cita_min} onChange={(e) => setNueva({ ...nueva, duracion_cita_min: e.target.value })}>{[10, 15, 20, 30, 40, 45, 60].map((m) => <option key={m} value={m}>{m} min</option>)}</select>}</Campo>
            </div>
            <button type="submit" className="btn-primario self-end px-6">Crear</button>
          </form>
        </div>
      </div>
    </PanelAdministrador>
  );
}

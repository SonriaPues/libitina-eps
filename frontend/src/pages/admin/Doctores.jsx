import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelAdministrador, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta, Campo } from '../../components/ui/Controles.jsx';
import { Cargando, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import { Icono } from '../../components/ui/Iconos.jsx';
import { citasApi, redApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { correoValido, soloNumeros } from '../../utils/validaciones.js';
import { hoyIso } from '../../utils/formato.js';

const NUEVO = { tipo_documento: 'CC', numero_documento: '', nombres: '', apellidos: '', correo: '', especialidad_id: '', tarjeta_profesional: '',
  universidad: '', anio_graduacion: '', sede_principal_id: '', tipo_vinculacion: 'planta', fecha_ingreso: hoyIso() };
const ESTADOS = { activo: ['Activo', 'verde'], vacaciones: ['Vacaciones', 'dorado'], inactivo: ['Inactivo', 'rojo'] };

export default function Doctores() {
  const datos = useDatos(() => Promise.all([redApi.doctores(), redApi.especialidades(true), redApi.sedes(), citasApi.doctoresAdmin()])
    .then(([doctores, esps, sedes, agenda]) => ({ doctores, esps, sedes, agenda })));
  const [form, setForm] = useState(null);       // null | NUEVO
  const [filtro, setFiltro] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const d = datos.datos;
  const set = (k, fn = (v) => v) => (e) => setForm({ ...form, [k]: fn(e.target.value) });
  const agendaDe = (uid) => d?.agenda.find((a) => a.doctor_id === uid);
  const lista = (d?.doctores ?? []).filter((x) => !filtro || x.especialidad_id === filtro);

  async function crear(e) {
    e.preventDefault();
    const faltan = ['numero_documento', 'nombres', 'apellidos', 'correo', 'especialidad_id', 'tarjeta_profesional', 'universidad', 'anio_graduacion'].filter((k) => !String(form[k]).trim());
    if (faltan.length) return setError('Completa todos los campos del doctor.');
    if (!correoValido(form.correo)) return setError('El correo no es válido.');
    setEnviando(true); setError('');
    try {
      const nuevo = await redApi.crearDoctor({ ...form, anio_graduacion: Number(form.anio_graduacion), sede_principal_id: form.sede_principal_id || null });
      setAviso(`Creamos el perfil de ${nuevo.nombre} y le enviamos a ${nuevo.email} el enlace para crear su contraseña. Ahora define sus turnos.`);
      setForm(null); datos.recargar();
    } catch (err) { setError(err.message); } finally { setEnviando(false); }
  }

  async function cambiar(doc, cambios, mensaje) {
    setError(''); setAviso('');
    try { await redApi.editarDoctor(doc.id, cambios); setAviso(mensaje); datos.recargar(); } catch (err) { setError(err.message); }
  }
  const reenviar = (doc) => redApi.reenviarAcceso(doc.id).then((r) => setAviso(r.mensaje)).catch((err) => setError(err.message));

  return (
    <PanelAdministrador>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Administración" titulo="Doctores y agendas">
          {!form && <button type="button" onClick={() => { setForm(NUEVO); setAviso(''); setError(''); }} className="btn-primario"><Icono.mas width={18} height={18} />Nuevo doctor</button>}
        </TituloPanel>
        {datos.error && <Alerta>{datos.error}</Alerta>}
        {aviso && <Alerta tipo="exito">{aviso}</Alerta>}
        {datos.cargando && !d && <Cargando />}

        {form && d && (
          <form onSubmit={crear} className="tarjeta flex flex-col gap-5 p-6" noValidate>
            <div className="flex items-center justify-between"><h2 className="text-xl font-extrabold">Nuevo doctor</h2><button type="button" onClick={() => setForm(null)} className="text-sm font-semibold text-azul-600">Cerrar</button></div>
            <div className="grid gap-4 md:grid-cols-3">
              <Campo etiqueta="Nombres">{(i) => <input id={i} className="campo" value={form.nombres} onChange={set('nombres')} />}</Campo>
              <Campo etiqueta="Apellidos">{(i) => <input id={i} className="campo" value={form.apellidos} onChange={set('apellidos')} />}</Campo>
              <Campo etiqueta="Correo" ayuda="Ahí le llega el enlace para crear su contraseña.">{(i) => <input id={i} type="email" className="campo" value={form.correo} onChange={set('correo', (v) => v.trim())} />}</Campo>
              <Campo etiqueta="Tipo de documento">{(i) => <select id={i} className="campo" value={form.tipo_documento} onChange={set('tipo_documento')}>{['CC', 'CE', 'PPT', 'PA'].map((t) => <option key={t}>{t}</option>)}</select>}</Campo>
              <Campo etiqueta="Número de documento">{(i) => <input id={i} className="campo" inputMode="numeric" value={form.numero_documento} onChange={set('numero_documento', soloNumeros)} />}</Campo>
              <Campo etiqueta="Tarjeta profesional">{(i) => <input id={i} className="campo" value={form.tarjeta_profesional} onChange={set('tarjeta_profesional')} />}</Campo>
              <Campo etiqueta="Especialidad">{(i) => <select id={i} className="campo" value={form.especialidad_id} onChange={set('especialidad_id')}><option value="">Selecciona</option>{d.esps.filter((e) => e.activa).map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>}</Campo>
              <Campo etiqueta="Sede principal">{(i) => <select id={i} className="campo" value={form.sede_principal_id} onChange={set('sede_principal_id')}><option value="">Sin sede fija</option>{d.sedes.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select>}</Campo>
              <Campo etiqueta="Vinculación">{(i) => <select id={i} className="campo" value={form.tipo_vinculacion} onChange={set('tipo_vinculacion')}><option value="planta">Planta</option><option value="contratista">Contratista</option></select>}</Campo>
              <Campo etiqueta="Universidad" className="md:col-span-2">{(i) => <input id={i} className="campo" value={form.universidad} onChange={set('universidad')} />}</Campo>
              <Campo etiqueta="Año de graduación">{(i) => <input id={i} type="number" min="1960" max="2100" className="campo" value={form.anio_graduacion} onChange={set('anio_graduacion')} />}</Campo>
              <Campo etiqueta="Fecha de ingreso">{(i) => <input id={i} type="date" className="campo" value={form.fecha_ingreso} onChange={set('fecha_ingreso')} />}</Campo>
            </div>
            {error && <Alerta>{error}</Alerta>}
            <button type="submit" disabled={enviando} className="btn-primario self-end px-8">{enviando ? 'Creando…' : 'Crear doctor'}</button>
          </form>
        )}

        {d && !form && error && <Alerta>{error}</Alerta>}
        {d && (
          <>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => setFiltro('')} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${!filtro ? 'bg-azul-900 text-white' : 'bg-white text-azul-700 ring-1 ring-azul-100'}`}>Todas ({d.doctores.length})</button>
              {d.esps.filter((e) => e.doctores).map((e) => <button key={e.id} type="button" onClick={() => setFiltro(e.id)} className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${filtro === e.id ? 'bg-azul-900 text-white' : 'bg-white text-azul-700 ring-1 ring-azul-100'}`}>{e.nombre} ({e.doctores})</button>)}
            </div>
            {lista.length === 0 && <Vacio titulo="Todavía no hay doctores" texto="Crea el primero con el botón Nuevo doctor. Le llegará un correo para crear su contraseña." />}
            <div className="overflow-x-auto rounded-[18px] border border-azul-100 bg-white">
              {lista.length > 0 && <table className="w-full min-w-[860px] text-left text-sm">
                <thead className="bg-azul-50 text-azul-700"><tr>{['Doctor', 'Especialidad', 'Agenda', 'Estado', ''].map((t) => <th key={t} className="px-4 py-3 font-semibold">{t}</th>)}</tr></thead>
                <tbody>{lista.map((doc) => { const ag = agendaDe(doc.usuario_id); const [t, tono] = ESTADOS[doc.estado]; return (
                  <tr key={doc.id} className="border-t border-azul-50 align-middle">
                    <td className="px-4 py-3"><span className="block font-semibold">{doc.nombre}</span><span className="text-xs text-azul-600">{doc.email} · TP {doc.tarjeta_profesional}</span></td>
                    <td className="px-4 py-3"><select aria-label={`Especialidad de ${doc.nombre}`} className="campo h-10 w-48" value={doc.especialidad_id ?? ''}
                      onChange={(e) => cambiar(doc, { especialidad_id: e.target.value }, `Actualizamos la especialidad de ${doc.nombre}.`)}>
                      {d.esps.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></td>
                    <td className="px-4 py-3">{ag ? <span>{ag.turnos} turnos · {ag.citas_proximas} citas próximas</span> : <span className="text-azul-500">Sincronizando…</span>}</td>
                    <td className="px-4 py-3"><Insignia tono={tono}>{t}</Insignia></td>
                    <td className="px-4 py-3"><span className="flex flex-wrap justify-end gap-1.5">
                      <Link to={`/admin/doctores/${doc.usuario_id}/agenda`} className="rounded-lg px-3 py-1.5 font-semibold text-azul-600 hover:bg-azul-50">Agenda</Link>
                      <select aria-label={`Estado de ${doc.nombre}`} className="campo h-9 w-36 text-sm" value={doc.estado}
                        onChange={(e) => cambiar(doc, { estado: e.target.value }, e.target.value === 'inactivo' ? `${doc.nombre} ya no puede iniciar sesión ni recibir citas.` : `Estado de ${doc.nombre}: ${ESTADOS[e.target.value][0].toLowerCase()}.`)}>
                        <option value="activo">Activo</option><option value="vacaciones">Vacaciones</option><option value="inactivo">Inactivo</option></select>
                      {doc.estado !== 'inactivo' && <button type="button" onClick={() => reenviar(doc)} className="rounded-lg px-3 py-1.5 font-semibold text-azul-600 hover:bg-azul-50" title="Enviar de nuevo el enlace para crear la contraseña">Reenviar acceso</button>}
                    </span></td>
                  </tr>); })}</tbody>
              </table>}
            </div>
            <p className="text-sm text-azul-600"><strong>Vacaciones:</strong> el doctor entra al portal pero no recibe citas nuevas. <strong>Inactivo:</strong> no puede iniciar sesión.</p>
          </>
        )}
      </div>
    </PanelAdministrador>
  );
}

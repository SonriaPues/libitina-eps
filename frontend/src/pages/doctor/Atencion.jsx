import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { PanelDoctor } from '../../components/layout/Paneles.jsx';
import { Alerta, Campo } from '../../components/ui/Controles.jsx';
import { Cargando, Dato, EstadoCita, Insignia } from '../../components/ui/Piezas.jsx';
import TarjetaConsulta from '../../components/citas/TarjetaConsulta.jsx';
import BuscadorCie10 from '../../components/historia/BuscadorCie10.jsx';
import DocumentosCita from '../../components/historia/DocumentosCita.jsx';
import { citasApi, historiaApi, redApi, tramitesApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { edadDe, fechaLarga, hora12 } from '../../utils/formato.js';

const CONSULTA0 = { motivo_consulta: '', enfermedad_actual: '', examen_fisico: '', diagnostico_cie10: '', diagnostico_desc: '', tratamiento: '', observaciones: '' };
const SIGNOS = [['tension_arterial', 'Tensión arterial', '120/80', 'text'], ['frecuencia_cardiaca', 'F. cardiaca (lpm)', '72', 'number'],
  ['frecuencia_respiratoria', 'F. respiratoria (rpm)', '16', 'number'], ['temperatura', 'Temperatura (°C)', '36.5', 'number'],
  ['saturacion', 'Saturación (%)', '98', 'number'], ['peso_kg', 'Peso (kg)', '70', 'number'], ['talla_cm', 'Talla (cm)', '170', 'number']];
const SEVERIDAD = { severa: 'rojo', moderada: 'dorado', leve: 'azul' };
const sinVacios = (o) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null));

export default function Atencion() {
  const { id } = useParams();
  const cita = useDatos(() => citasApi.citaDoctor(id), [id]);
  const c = cita.datos;
  const historia = useDatos(() => (c ? historiaApi.paciente(c.afiliado_id, id) : Promise.resolve(null)), [c?.afiliado_id]);
  const rems = useDatos(() => tramitesApi.remisionesDeCita(id), [id]);
  const esps = useDatos(() => redApi.especialidades());
  const [f, setF] = useState(CONSULTA0);
  const [signos, setSignos] = useState({});
  const [rem, setRem] = useState({ especialidad_codigo: '', descripcion_clinica: '' });
  const [alergia, setAlergia] = useState({ agente: '', tipo: 'medicamento', severidad: 'moderada', reaccion: '' });
  const [antecedente, setAntecedente] = useState({ tipo: 'personal', descripcion: '' });
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const h = historia.datos;
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const accion = async (fn, exito, despues) => {
    setEnviando(true); setError(''); setAviso('');
    try { await fn(); setAviso(exito); despues?.(); } catch (e) { setError(e.message); } finally { setEnviando(false); }
  };

  function registrar(e) {
    e.preventDefault();
    if (!f.motivo_consulta.trim() || !f.diagnostico_cie10.trim() || !f.diagnostico_desc.trim() || !f.tratamiento.trim())
      return setError('Completa el motivo, el diagnóstico (código y descripción) y el tratamiento.');
    const s = sinVacios(signos);
    ['frecuencia_cardiaca', 'frecuencia_respiratoria', 'saturacion'].forEach((k) => { if (s[k]) s[k] = parseInt(s[k], 10); });
    ['temperatura', 'peso_kg', 'talla_cm'].forEach((k) => { if (s[k]) s[k] = parseFloat(s[k]); });
    accion(() => historiaApi.registrarConsulta({ cita_id: id, ...sinVacios(f), signos_vitales: s }),
      'Consulta registrada. La cita quedó como atendida.', () => { cita.recargar(); historia.recargar(); setRem({ ...rem, descripcion_clinica: f.motivo_consulta }); });
  }

  if (cita.error) return <PanelDoctor><Alerta>{cita.error}</Alerta></PanelDoctor>;
  if (!c) return <PanelDoctor><Cargando /></PanelDoctor>;
  const p = c.paciente_detalle;
  const ultima = h?.consultas?.find((x) => x.cita_id === id);
  const conRemision = (esps.datos ?? []).filter((e) => e.requiere_remision);

  return (
    <PanelDoctor>
      <div className="flex flex-col gap-6">
        <Link to="/doctor/agenda" className="text-sm font-semibold text-azul-600">‹ Volver a la agenda</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-1"><span className="antetitulo">{c.especialidad} · {fechaLarga(c.fecha)}, {hora12(c.hora)}</span><h1 className="text-3xl font-extrabold">{c.paciente}</h1></div>
          <span className="flex items-center gap-3"><EstadoCita estado={c.estado} />
            {c.estado === 'confirmada' && <button type="button" disabled={enviando} onClick={() => accion(() => citasApi.noAsistio(id), 'Marcamos la inasistencia.', cita.recargar)} className="btn border-[1.5px] border-dorado-400 px-4 py-2 text-dorado-800">No asistió</button>}</span>
        </div>
        {error && <Alerta>{error}</Alerta>}
        {aviso && <Alerta tipo="exito">{aviso}</Alerta>}

        <div className="grid items-start gap-5 xl:grid-cols-5">
          {/* Paciente e historia */}
          <aside className="flex flex-col gap-4 xl:col-span-2">
            <section className="tarjeta flex flex-col gap-4 p-5"><h2 className="font-bold">Paciente</h2>
              <dl className="grid grid-cols-2 gap-3"><Dato k="Documento" v={p.documento} /><Dato k="Edad" v={`${edadDe(p.fecha_nacimiento)} años`} />
                <Dato k="Sexo" v={p.sexo} /><Dato k="Régimen" v={p.regimen} /><Dato k="Motivo de la cita" v={c.motivo} /></dl></section>
            {historia.cargando && <Cargando texto="Abriendo la historia clínica…" />}
            {historia.error && <Alerta>{historia.error}</Alerta>}
            {h && (
              <>
                <section className={`flex flex-col gap-2 rounded-[18px] border p-5 ${h.alergias.length ? 'border-red-200 bg-red-50' : 'border-azul-100 bg-white'}`}><h2 className="font-bold">Alergias</h2>
                  {h.alergias.length === 0 && <span className="text-sm text-azul-600">No hay alergias registradas.</span>}
                  {h.alergias.map((a) => <div key={a.id} className="flex items-center justify-between gap-2 text-sm"><span><strong>{a.agente}</strong>{a.reaccion && ` · ${a.reaccion}`}</span><Insignia tono={SEVERIDAD[a.severidad]}>{a.severidad}</Insignia></div>)}
                </section>
                <section className="tarjeta flex flex-col gap-2 p-5"><h2 className="font-bold">Antecedentes</h2>
                  {h.antecedentes.length === 0 && <span className="text-sm text-azul-600">No hay antecedentes registrados.</span>}
                  {h.antecedentes.map((a) => <p key={a.id} className="text-sm"><strong className="capitalize">{a.tipo}:</strong> {a.descripcion}</p>)}
                </section>
                <section className="flex flex-col gap-3"><h2 className="font-bold">Consultas anteriores</h2>
                  {h.consultas.filter((x) => x.cita_id !== id).length === 0 && <span className="text-sm text-azul-600">Es la primera atención del paciente en Libitina.</span>}
                  {h.consultas.filter((x) => x.cita_id !== id).map((x) => <TarjetaConsulta key={x.id} c={x} />)}
                </section>
                <p className="text-xs text-azul-500">Este acceso a la historia quedó registrado con tu usuario, la fecha y el motivo (Resolución 1995 de 1999).</p>
              </>
            )}
          </aside>

          {/* Atención */}
          <div className="flex flex-col gap-5 xl:col-span-3">
            {c.puede_atender && (
              <form onSubmit={registrar} className="tarjeta flex flex-col gap-5 p-6" noValidate>
                <h2 className="text-xl font-extrabold">Registrar la consulta</h2>
                <Campo etiqueta="Motivo de consulta">{(i) => <textarea id={i} className="campo h-auto min-h-[70px] py-3" value={f.motivo_consulta} onChange={set('motivo_consulta')} />}</Campo>
                <Campo etiqueta="Enfermedad actual (opcional)">{(i) => <textarea id={i} className="campo h-auto min-h-[70px] py-3" value={f.enfermedad_actual} onChange={set('enfermedad_actual')} />}</Campo>
                <fieldset className="flex flex-col gap-2"><legend className="etiqueta mb-2">Signos vitales (opcionales)</legend>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{SIGNOS.map(([k, t, ph, tipo]) => (
                    <Campo key={k} etiqueta={t}>{(i) => <input id={i} type={tipo} step="any" className="campo" placeholder={ph} value={signos[k] ?? ''} onChange={(e) => setSignos({ ...signos, [k]: e.target.value })} />}</Campo>))}</div>
                </fieldset>
                <Campo etiqueta="Examen físico (opcional)">{(i) => <textarea id={i} className="campo h-auto min-h-[70px] py-3" value={f.examen_fisico} onChange={set('examen_fisico')} />}</Campo>
                <BuscadorCie10 codigo={f.diagnostico_cie10} descripcion={f.diagnostico_desc} onCambio={(codigo, desc) => setF((x) => ({ ...x, diagnostico_cie10: codigo, diagnostico_desc: desc }))} />
                <Campo etiqueta="Tratamiento y plan">{(i) => <textarea id={i} className="campo h-auto min-h-[90px] py-3" value={f.tratamiento} onChange={set('tratamiento')} />}</Campo>
                <Campo etiqueta="Observaciones (opcional)">{(i) => <textarea id={i} className="campo h-auto min-h-[60px] py-3" value={f.observaciones} onChange={set('observaciones')} />}</Campo>
                <button type="submit" disabled={enviando} className="btn-primario self-end px-8">{enviando ? 'Guardando…' : 'Guardar consulta'}</button>
              </form>
            )}
            {c.estado === 'confirmada' && !c.puede_atender && <Alerta tipo="aviso">La consulta se registra el día de la cita.</Alerta>}
            {ultima && <div className="flex flex-col gap-2"><h2 className="font-bold">Consulta de esta cita</h2><TarjetaConsulta c={ultima} /></div>}
            {ultima && <DocumentosCita citaId={id} fechaCita={String(c.fecha).slice(0, 10)} />}

            {(c.estado === 'realizada' || c.puede_atender) && (
              <section className="tarjeta flex flex-col gap-4 p-6">
                <h2 className="text-lg font-extrabold">Remitir a un especialista</h2>
                {rems.datos?.map((r) => <div key={r.id} className="flex items-center justify-between rounded-xl bg-azul-50 px-4 py-2.5 text-sm"><span><strong>{r.especialidad}</strong> · vence el {fechaLarga(r.vence)}</span><Insignia tono="verde">{r.estado}</Insignia></div>)}
                <div className="grid gap-3 sm:grid-cols-2">
                  <Campo etiqueta="Especialidad">{(i) => <select id={i} className="campo" value={rem.especialidad_codigo} onChange={(e) => setRem({ ...rem, especialidad_codigo: e.target.value })}>
                    <option value="">Selecciona</option>{conRemision.map((e) => <option key={e.codigo} value={e.codigo}>{e.nombre}</option>)}</select>}</Campo>
                  <Campo etiqueta="Diagnóstico que la justifica" ayuda="Se toma de la consulta si ya la registraste.">{(i) => <input id={i} className="campo" readOnly value={ultima ? `${ultima.cie10} · ${ultima.diagnostico}` : f.diagnostico_cie10 ? `${f.diagnostico_cie10.toUpperCase()} · ${f.diagnostico_desc}` : ''} />}</Campo>
                </div>
                <Campo etiqueta="Motivo de la remisión">{(i) => <textarea id={i} className="campo h-auto min-h-[70px] py-3" value={rem.descripcion_clinica} onChange={(e) => setRem({ ...rem, descripcion_clinica: e.target.value })} />}</Campo>
                <button type="button" disabled={enviando || !rem.especialidad_codigo || !(ultima || f.diagnostico_cie10)} className="btn-dorado self-end px-6"
                  onClick={() => accion(() => tramitesApi.emitirRemision({ cita_id: id, especialidad_codigo: rem.especialidad_codigo, descripcion_clinica: rem.descripcion_clinica,
                    diagnostico_cie10: ultima?.cie10 ?? f.diagnostico_cie10, diagnostico_desc: ultima?.diagnostico ?? f.diagnostico_desc }),
                  'Remisión emitida. Le avisamos al paciente por correo para que agende.', () => { rems.recargar(); setRem({ especialidad_codigo: '', descripcion_clinica: '' }); })}>Emitir remisión</button>
              </section>
            )}

            {['confirmada', 'realizada'].includes(c.estado) && (
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="tarjeta flex flex-col gap-3 p-5"><h2 className="font-bold">Registrar alergia</h2>
                  <Campo etiqueta="Agente">{(i) => <input id={i} className="campo" placeholder="Ej.: Penicilina" value={alergia.agente} onChange={(e) => setAlergia({ ...alergia, agente: e.target.value })} />}</Campo>
                  <div className="grid gap-3">
                    <Campo etiqueta="Tipo">{(i) => <select id={i} className="campo" value={alergia.tipo} onChange={(e) => setAlergia({ ...alergia, tipo: e.target.value })}>{['medicamento', 'alimento', 'ambiental', 'otro'].map((t) => <option key={t}>{t}</option>)}</select>}</Campo>
                    <Campo etiqueta="Severidad">{(i) => <select id={i} className="campo" value={alergia.severidad} onChange={(e) => setAlergia({ ...alergia, severidad: e.target.value })}>{['leve', 'moderada', 'severa'].map((t) => <option key={t}>{t}</option>)}</select>}</Campo>
                  </div>
                  <Campo etiqueta="Reacción (opcional)">{(i) => <input id={i} className="campo" value={alergia.reaccion} onChange={(e) => setAlergia({ ...alergia, reaccion: e.target.value })} />}</Campo>
                  <button type="button" disabled={enviando || alergia.agente.trim().length < 2} className="btn-borde self-end px-4 py-2.5"
                    onClick={() => accion(() => historiaApi.agregarAlergia(c.afiliado_id, id, sinVacios(alergia)), 'Alergia registrada.', () => { historia.recargar(); setAlergia({ ...alergia, agente: '', reaccion: '' }); })}>Guardar alergia</button>
                </section>
                <section className="tarjeta flex flex-col gap-3 p-5"><h2 className="font-bold">Registrar antecedente</h2>
                  <Campo etiqueta="Tipo">{(i) => <select id={i} className="campo" value={antecedente.tipo} onChange={(e) => setAntecedente({ ...antecedente, tipo: e.target.value })}>
                    {[['personal', 'Personal'], ['familiar', 'Familiar'], ['quirurgico', 'Quirúrgico'], ['farmacologico', 'Farmacológico'], ['toxicologico', 'Toxicológico'], ['ginecobstetrico', 'Ginecobstétrico']].map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>}</Campo>
                  <Campo etiqueta="Descripción">{(i) => <textarea id={i} className="campo h-auto min-h-[96px] py-3" value={antecedente.descripcion} onChange={(e) => setAntecedente({ ...antecedente, descripcion: e.target.value })} />}</Campo>
                  <button type="button" disabled={enviando || antecedente.descripcion.trim().length < 3} className="btn-borde self-end px-4 py-2.5"
                    onClick={() => accion(() => historiaApi.agregarAntecedente(c.afiliado_id, id, antecedente), 'Antecedente registrado.', () => { historia.recargar(); setAntecedente({ ...antecedente, descripcion: '' }); })}>Guardar antecedente</button>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </PanelDoctor>
  );
}

import { useState } from 'react';
import { Alerta, Campo } from '../ui/Controles.jsx';
import { Insignia } from '../ui/Piezas.jsx';
import { Icono } from '../ui/Iconos.jsx';
import { historiaApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaLarga, sumarDias } from '../../utils/formato.js';

const MEDICAMENTOS = ['Acetaminofén 500 mg', 'Ibuprofeno 400 mg', 'Naproxeno 250 mg', 'Losartán 50 mg', 'Enalapril 10 mg', 'Amlodipino 5 mg',
  'Hidroclorotiazida 25 mg', 'Metformina 850 mg', 'Glibenclamida 5 mg', 'Atorvastatina 20 mg', 'Omeprazol 20 mg', 'Esomeprazol 40 mg',
  'Amoxicilina 500 mg', 'Cefalexina 500 mg', 'Azitromicina 500 mg', 'Nitrofurantoína 100 mg', 'Loratadina 10 mg', 'Cetirizina 10 mg',
  'Salbutamol inhalador 100 mcg', 'Beclometasona inhalador 250 mcg', 'Levotiroxina 50 mcg', 'Sertralina 50 mg', 'Fluoxetina 20 mg',
  'Metocarbamol 750 mg', 'Diclofenaco gel 1 %', 'Sales de rehidratación oral', 'Hierro (sulfato ferroso) 300 mg', 'Ácido fólico 1 mg'];
const PRESENTACIONES = ['Tableta', 'Cápsula', 'Jarabe', 'Suspensión', 'Inhalador', 'Crema', 'Gel', 'Gotas', 'Sobre', 'Ampolla'];
const VIAS = ['Oral', 'Tópica', 'Inhalada', 'Oftálmica', 'Ótica', 'Intramuscular', 'Sublingual'];
const TIPOS = [['enfermedad_general', 'Enfermedad general'], ['accidente_comun', 'Accidente común'], ['accidente_laboral', 'Accidente de trabajo'], ['enfermedad_laboral', 'Enfermedad laboral']];
const nuevoMed = () => ({ medicamento: '', presentacion: 'Tableta', dosis: '1 tableta', frecuencia: 'cada 8 horas', duracion: '5 días', via: 'Oral', cantidad: 15 });

// Fórmula médica e incapacidad de una cita (después de registrar la consulta).
export default function DocumentosCita({ citaId, fechaCita }) {
  const docs = useDatos(() => historiaApi.documentosCita(citaId), [citaId]);
  const [meds, setMeds] = useState([nuevoMed()]);
  const [indicaciones, setIndicaciones] = useState('');
  const [inc, setInc] = useState({ tipo: 'enfermedad_general', dias: 3, fecha_inicio: fechaCita, observaciones: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const d = docs.datos;
  const setMed = (i, k) => (e) => setMeds(meds.map((m, j) => (j === i ? { ...m, [k]: k === 'cantidad' ? Number(e.target.value) : e.target.value } : m)));

  const enviar = async (fn) => { setEnviando(true); setError(''); try { await fn(); docs.recargar(); } catch (e) { setError(e.message); } finally { setEnviando(false); } };
  const expedirFormula = () => {
    const lista = meds.filter((m) => m.medicamento.trim());
    if (!lista.length) return setError('Agrega al menos un medicamento.');
    return enviar(() => historiaApi.expedirFormula({ cita_id: citaId, medicamentos: lista, indicaciones: indicaciones.trim() || null }));
  };
  const expedirIncapacidad = () => enviar(() => historiaApi.expedirIncapacidad({ cita_id: citaId, ...inc, dias: Number(inc.dias), observaciones: inc.observaciones.trim() || null }));
  const descargar = (tipo, doc) => historiaApi.descargarDocumento(tipo, doc).catch((e) => setError(e.message));

  if (!d) return null;
  return (
    <div className="flex flex-col gap-5">
      {error && <Alerta>{error}</Alerta>}
      <datalist id="medicamentos-frecuentes">{MEDICAMENTOS.map((m) => <option key={m} value={m} />)}</datalist>

      <section className="tarjeta flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Fórmula médica</h2>
          {d.formula && <Insignia tono="verde">Expedida · {d.formula.codigo}</Insignia>}</div>
        {d.formula ? (
          <>
            <ul className="flex flex-col divide-y divide-azul-50 rounded-xl border border-azul-100">{d.formula.medicamentos.map((m, i) => (
              <li key={i} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-2.5 text-sm"><span><strong>{m.medicamento}</strong> <span className="text-azul-500">· {m.presentacion}</span></span>
                <span className="text-azul-700">{m.dosis} {m.frecuencia} · {m.duracion} · {m.via} · cant. {m.cantidad}</span></li>))}</ul>
            {d.formula.indicaciones && <p className="text-sm"><strong>Indicaciones:</strong> {d.formula.indicaciones}</p>}
            <div className="flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-azul-600">Válida hasta el {fechaLarga(d.formula.vigente_hasta)}. El paciente la descarga desde su portal.</span>
              <button type="button" onClick={() => descargar('formula', d.formula)} className="btn-borde px-4 py-2.5"><Icono.descarga width={18} height={18} />Descargar PDF</button></div>
          </>
        ) : (
          <>
            {meds.map((m, i) => (
              <div key={i} className="flex flex-col gap-3 rounded-xl border border-azul-100 p-4">
                <div className="flex items-center justify-between"><span className="text-sm font-bold text-azul-700">Medicamento {i + 1}</span>
                  {meds.length > 1 && <button type="button" onClick={() => setMeds(meds.filter((_, j) => j !== i))} className="text-sm font-semibold text-red-700">Quitar</button>}</div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Campo etiqueta="Medicamento y concentración" className="sm:col-span-2">{(x) => <input id={x} list="medicamentos-frecuentes" className="campo" placeholder="Ej.: Losartán 50 mg" value={m.medicamento} onChange={setMed(i, 'medicamento')} />}</Campo>
                  <Campo etiqueta="Presentación">{(x) => <select id={x} className="campo" value={m.presentacion} onChange={setMed(i, 'presentacion')}>{PRESENTACIONES.map((p) => <option key={p}>{p}</option>)}</select>}</Campo>
                  <Campo etiqueta="Dosis">{(x) => <input id={x} className="campo" value={m.dosis} onChange={setMed(i, 'dosis')} />}</Campo>
                  <Campo etiqueta="Frecuencia">{(x) => <input id={x} className="campo" value={m.frecuencia} onChange={setMed(i, 'frecuencia')} />}</Campo>
                  <Campo etiqueta="Duración">{(x) => <input id={x} className="campo" value={m.duracion} onChange={setMed(i, 'duracion')} />}</Campo>
                  <Campo etiqueta="Vía">{(x) => <select id={x} className="campo" value={m.via} onChange={setMed(i, 'via')}>{VIAS.map((v) => <option key={v}>{v}</option>)}</select>}</Campo>
                  <Campo etiqueta="Cantidad total">{(x) => <input id={x} type="number" min={1} max={999} className="campo" value={m.cantidad} onChange={setMed(i, 'cantidad')} />}</Campo>
                </div>
              </div>))}
            {meds.length < 10 && <button type="button" onClick={() => setMeds([...meds, nuevoMed()])} className="self-start rounded-xl border-[1.5px] border-dashed border-azul-200 px-4 py-2 text-sm font-semibold text-azul-600 hover:border-azul-400">+ Agregar medicamento</button>}
            <Campo etiqueta="Indicaciones (opcional)">{(x) => <textarea id={x} className="campo h-auto min-h-[60px] py-3" maxLength={1000} placeholder="Ej.: tomar con las comidas; suspender si aparece brote" value={indicaciones} onChange={(e) => setIndicaciones(e.target.value)} />}</Campo>
            <button type="button" disabled={enviando} onClick={expedirFormula} className="btn-primario self-end px-6">{enviando ? 'Expidiendo…' : 'Expedir fórmula'}</button>
          </>
        )}
      </section>

      <section className="tarjeta flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between gap-3"><h2 className="text-lg font-extrabold">Incapacidad médica</h2>
          {d.incapacidad && <Insignia tono="verde">Expedida · {d.incapacidad.codigo}</Insignia>}</div>
        {d.incapacidad ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[15px]"><strong>{d.incapacidad.dias} {d.incapacidad.dias === 1 ? 'día' : 'días'}</strong> · {d.incapacidad.tipo_texto} · del {fechaLarga(d.incapacidad.fecha_inicio)} al {fechaLarga(d.incapacidad.fecha_fin)}</span>
            <button type="button" onClick={() => descargar('incapacidad', d.incapacidad)} className="btn-borde px-4 py-2.5"><Icono.descarga width={18} height={18} />Descargar PDF</button>
          </div>
        ) : !d.puede_incapacidad ? (
          <p className="text-sm text-azul-600">{d.motivo_incapacidad}</p>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Campo etiqueta="Origen">{(x) => <select id={x} className="campo" value={inc.tipo} onChange={(e) => setInc({ ...inc, tipo: e.target.value })}>{TIPOS.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</select>}</Campo>
              <Campo etiqueta="Desde" ayuda="El día de la consulta o hasta 3 días antes.">{(x) => <input id={x} type="date" className="campo" min={sumarDias(fechaCita, -3)} max={fechaCita} value={inc.fecha_inicio} onChange={(e) => setInc({ ...inc, fecha_inicio: e.target.value })} />}</Campo>
              <Campo etiqueta="Días (1 a 30)">{(x) => <input id={x} type="number" min={1} max={30} className="campo" value={inc.dias} onChange={(e) => setInc({ ...inc, dias: e.target.value })} />}</Campo>
            </div>
            {inc.fecha_inicio && inc.dias > 0 && <span className="text-sm text-azul-600">Hasta el {fechaLarga(sumarDias(inc.fecha_inicio, Number(inc.dias) - 1))}, inclusive.</span>}
            <Campo etiqueta="Observaciones (opcional)">{(x) => <input id={x} className="campo" maxLength={500} placeholder="Ej.: reposo relativo, evitar cargar peso" value={inc.observaciones} onChange={(e) => setInc({ ...inc, observaciones: e.target.value })} />}</Campo>
            <button type="button" disabled={enviando} onClick={expedirIncapacidad} className="btn-dorado self-end px-6">{enviando ? 'Expidiendo…' : 'Expedir incapacidad'}</button>
          </>
        )}
      </section>
    </div>
  );
}

import { useState } from 'react';
import { PanelAfiliado, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta } from '../../components/ui/Controles.jsx';
import { Cargando, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import TarjetaConsulta from '../../components/citas/TarjetaConsulta.jsx';
import { afiliadosApi, historiaApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { edadDe, fechaHora, PARENTESCOS } from '../../utils/formato.js';

const SEVERIDAD = { severa: 'rojo', moderada: 'dorado', leve: 'azul' };
const ANTECEDENTES = { personal: 'Personal', familiar: 'Familiar', quirurgico: 'Quirúrgico', farmacologico: 'Farmacológico', toxicologico: 'Toxicológico', ginecobstetrico: 'Ginecobstétrico' };

export default function HistoriaClinica() {
  const af = useDatos(() => afiliadosApi.miAfiliacion());
  const [persona, setPersona] = useState(null);
  const personas = af.datos ? [{ ...af.datos, rol: 'Tú' },
    ...af.datos.beneficiarios.filter((b) => edadDe(b.fecha_nacimiento) < 18).map((b) => ({ ...b, rol: PARENTESCOS[b.parentesco] }))] : [];
  const id = persona ?? personas[0]?.id;
  const historia = useDatos(() => (id ? Promise.all([historiaApi.mia(id), historiaApi.accesos(id)]) : Promise.resolve(null)), [id]);
  const [h, accesos] = historia.datos ?? [null, []];

  return (
    <PanelAfiliado>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Mi salud" titulo="Historia clínica" />
        <p className="max-w-3xl text-[15px] leading-relaxed text-azul-700">Aquí ves lo que los profesionales registran en cada atención. La información está cifrada y cada vez que alguien la consulta queda registrado, incluso cuando la ves tú. Las historias de los beneficiarios mayores de edad son reservadas: solo ellos pueden verlas.</p>
        {personas.length > 1 && (
          <div className="flex flex-wrap gap-2">{personas.map((p) => (
            <button key={p.id} type="button" aria-pressed={id === p.id} onClick={() => setPersona(p.id)}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${id === p.id ? 'bg-azul-600 text-white' : 'border-[1.5px] border-azul-200 text-azul-800'}`}>{p.nombres.split(' ')[0]} · {p.rol}</button>))}</div>
        )}
        {(af.error || historia.error) && <Alerta>{af.error || historia.error}</Alerta>}
        {historia.cargando && <Cargando />}
        {h && !h.existe && <Vacio titulo="Todavía no hay registros" texto="La historia clínica se abre en la primera atención con un profesional de Libitina." />}
        {h?.existe && (
          <div className="grid items-start gap-5 xl:grid-cols-3">
            <div className="flex flex-col gap-4 xl:col-span-2">
              <h2 className="text-lg font-bold">Consultas</h2>
              {h.consultas.map((c) => <TarjetaConsulta key={c.id} c={c} />)}
            </div>
            <aside className="flex flex-col gap-4">
              <section className="tarjeta flex flex-col gap-3 p-5"><h2 className="font-bold">Alergias</h2>
                {h.alergias.length === 0 && <span className="text-sm text-azul-500">Sin alergias registradas.</span>}
                {h.alergias.map((a) => <div key={a.id} className="flex items-center justify-between gap-3"><span><span className="font-semibold">{a.agente}</span>{a.reaccion && <span className="block text-xs text-azul-600">{a.reaccion}</span>}</span><Insignia tono={SEVERIDAD[a.severidad]}>{a.severidad}</Insignia></div>)}
              </section>
              <section className="tarjeta flex flex-col gap-3 p-5"><h2 className="font-bold">Antecedentes</h2>
                {h.antecedentes.length === 0 && <span className="text-sm text-azul-500">Sin antecedentes registrados.</span>}
                {h.antecedentes.map((a) => <div key={a.id} className="flex flex-col gap-0.5"><span className="text-xs tracking-wide text-dorado-600">{ANTECEDENTES[a.tipo]}</span><span className="text-sm">{a.descripcion}</span></div>)}
              </section>
              <section className="tarjeta flex flex-col gap-3 p-5"><h2 className="font-bold">Quién ha consultado esta historia</h2>
                <ul className="flex flex-col gap-2.5">{accesos.slice(0, 10).map((a, i) => (
                  <li key={i} className="flex flex-col border-b border-azul-50 pb-2 text-sm last:border-0"><span className="font-semibold">{a.rol === 'doctor' ? 'Profesional de la salud' : a.rol === 'afiliado' ? 'Afiliado' : 'Administración'} · {a.accion}</span>
                    <span className="text-xs text-azul-600">{a.justificacion}</span><span className="text-xs text-azul-500">{fechaHora(a.fecha)}</span></li>))}</ul>
              </section>
            </aside>
          </div>
        )}
      </div>
    </PanelAfiliado>
  );
}

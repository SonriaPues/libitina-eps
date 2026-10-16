import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { PanelDoctor, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta } from '../../components/ui/Controles.jsx';
import { Cargando, Vacio } from '../../components/ui/Piezas.jsx';
import { citasApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaLarga, hora12 } from '../../utils/formato.js';

// Pacientes que el doctor ha atendido o tiene agendados. La historia se abre desde una cita (queda auditado).
export default function Pacientes() {
  const [texto, setTexto] = useState('');
  const [q, setQ] = useState('');
  useEffect(() => { const t = setTimeout(() => setQ(texto), 300); return () => clearTimeout(t); }, [texto]);
  const lista = useDatos(() => citasApi.misPacientes(q), [q]);
  const pacientes = lista.datos ?? [];

  return (
    <PanelDoctor>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Portal del doctor" titulo="Mis pacientes">
          <input type="search" aria-label="Buscar paciente" className="campo w-full sm:w-80" placeholder="Buscar por nombre o documento" value={texto} onChange={(e) => setTexto(e.target.value)} />
        </TituloPanel>
        {lista.error && <Alerta>{lista.error}</Alerta>}
        {lista.cargando && !lista.datos && <Cargando />}
        {lista.datos && pacientes.length === 0 && <Vacio titulo={q ? 'Sin resultados' : 'Todavía no tienes pacientes'} texto={q ? 'Prueba con otro nombre o número de documento.' : 'Aquí aparecerán las personas que agenden contigo.'} />}
        {pacientes.length > 0 && (
          <div className="overflow-x-auto rounded-[18px] border border-azul-100 bg-white">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-azul-50/70 text-azul-700"><tr>{['Paciente', 'Atenciones', 'Última atención', 'Próxima cita', ''].map((t) => <th key={t} className="px-4 py-3 font-semibold">{t}</th>)}</tr></thead>
              <tbody>{pacientes.map((p) => (
                <tr key={p.afiliado_id} className="border-t border-azul-50">
                  <td className="px-4 py-3"><span className="flex flex-col"><span className="font-semibold">{p.nombre}</span><span className="text-xs text-azul-500">{p.documento}</span></span></td>
                  <td className="px-4 py-3">{p.atenciones}{p.inasistencias > 0 && <span className="ml-2 rounded-full bg-dorado-100 px-2 py-0.5 text-xs text-dorado-800">{p.inasistencias} sin asistir</span>}</td>
                  <td className="px-4 py-3 first-letter:uppercase">{p.ultima ? fechaLarga(p.ultima.fecha) : '—'}</td>
                  <td className="px-4 py-3 first-letter:uppercase">{p.proxima ? `${fechaLarga(p.proxima.fecha)}, ${hora12(p.proxima.hora)}` : '—'}</td>
                  <td className="px-4 py-3 text-right">{p.abrir_cita_id && <Link to={`/doctor/citas/${p.abrir_cita_id}`} className="btn-borde px-3 py-2 text-sm">Ver historia</Link>}</td>
                </tr>))}</tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-azul-500">Por reserva de la historia clínica, solo ves pacientes con los que tienes o tuviste una cita, y cada apertura queda registrada.</p>
      </div>
    </PanelDoctor>
  );
}

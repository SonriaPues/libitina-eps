import { useState } from 'react';
import { PanelDoctor, TituloPanel } from '../../components/layout/Paneles.jsx';
import { Alerta, Segmentado } from '../../components/ui/Controles.jsx';
import { Cargando, Insignia, Vacio } from '../../components/ui/Piezas.jsx';
import { tramitesApi } from '../../api/servicios.js';
import { useDatos } from '../../utils/useDatos.js';
import { fechaLarga } from '../../utils/formato.js';

const TONO = { vigente: 'verde', usada: 'azul', vencida: 'rojo' };
const TEXTO = { vigente: 'Vigente', usada: 'Ya agendada', vencida: 'Vencida' };

// Remisiones que firmó el doctor y qué pasó con cada una.
export default function Remisiones() {
  const datos = useDatos(() => tramitesApi.remisionesEmitidas());
  const [filtro, setFiltro] = useState('todas');
  const todas = datos.datos ?? [];
  const lista = filtro === 'todas' ? todas : todas.filter((r) => r.estado === filtro);
  const cuenta = (e) => todas.filter((r) => r.estado === e).length;

  return (
    <PanelDoctor>
      <div className="flex flex-col gap-6">
        <TituloPanel antetitulo="Portal del doctor" titulo="Remisiones emitidas" />
        <Segmentado className="max-w-xl" opciones={[['todas', `Todas (${todas.length})`], ['vigente', `Vigentes (${cuenta('vigente')})`], ['usada', `Agendadas (${cuenta('usada')})`], ['vencida', `Vencidas (${cuenta('vencida')})`]]} valor={filtro} onCambio={setFiltro} />
        {datos.error && <Alerta>{datos.error}</Alerta>}
        {datos.cargando && <Cargando />}
        {datos.datos && lista.length === 0 && <Vacio titulo="No hay remisiones aquí" texto="Las remisiones se emiten desde la atención de una cita, después de registrar la consulta." />}
        <div className="grid gap-3 md:grid-cols-2">{lista.map((r) => (
          <article key={r.id} className="tarjeta flex flex-col gap-2 p-5">
            <div className="flex items-start justify-between gap-3"><span className="flex flex-col"><span className="text-lg font-bold">{r.especialidad}</span><span className="text-sm text-azul-600">{r.paciente}</span></span>
              <Insignia tono={TONO[r.estado]}>{TEXTO[r.estado]}</Insignia></div>
            <span className="text-sm"><strong>Diagnóstico:</strong> {r.diagnostico}</span>
            <span className="text-xs text-azul-500 first-letter:uppercase">Emitida el {fechaLarga(String(r.emitida).slice(0, 10))} · vence el {fechaLarga(r.vence)} · {r.radicado}</span>
          </article>))}</div>
      </div>
    </PanelDoctor>
  );
}

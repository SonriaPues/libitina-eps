import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { BASE } from '../../api/client.js';
import { CAPAS, CATEGORIAS, DETALLE_ENLACES, ENLACES, FLUJOS, NODOS } from '../../data/arquitectura.js';

// Topología de microservicios (solo administrador, sin enlace desde ningún menú).
// Estado real: consulta /api/v1/health cada 15 s. Los recorridos de la consola son simulados.
const ANCHO = 1300, ALTO = 760, NW = 160, NH = 50;
const hora = () => new Date().toLocaleTimeString('es-CO', { hour12: false });
const COLOR_ESTADO = { ok: '#3DD68C', caido: '#F26D6D', desconocido: '#6B7A8C' };

export default function Microservicios() {
  const [pos, setPos] = useState(() => Object.fromEntries(NODOS.map((n) => [n.id, { x: n.x, y: n.y }])));
  const [vista, setVista] = useState({ x: 0, y: 0, k: 1 });
  const [foco, setFoco] = useState(null);
  const [conexion, setConexion] = useState(null);      // enlace elegido: muestra por qué existe y qué procesos lo usan
  const [ocultas, setOcultas] = useState(new Set());
  const [salud, setSalud] = useState({});
  const [activo, setActivo] = useState(null);           // enlace iluminado por la simulación
  const [corriendo, setCorriendo] = useState(false);
  const [log, setLog] = useState([]);
  const svg = useRef(null);
  const arrastre = useRef(null);
  const consola = useRef(null);
  const cancelar = useRef(false);

  const escribir = useCallback((texto, tipo = 'info') => setLog((l) => [...l.slice(-199), { t: hora(), texto, tipo }]), []);

  // ---------- Estado real ----------
  const revisar = useCallback(async () => {
    try {
      const r = await fetch(`${BASE}/health`, { cache: 'no-store' });
      const d = await r.json();
      const s = { gateway: 'ok', nginx: 'ok' };
      Object.entries(d.servicios || {}).forEach(([k, v]) => { s[k] = v === 'ok' ? 'ok' : 'caido'; });
      setSalud(s);
      const caidos = Object.entries(d.servicios || {}).filter(([, v]) => v !== 'ok').map(([k]) => k);
      escribir(caidos.length ? `health · ${caidos.length} sin responder: ${caidos.join(', ')}` : 'health · gateway y 7 servicios responden 200', caidos.length ? 'error' : 'ok');
    } catch {
      setSalud({ gateway: 'caido' });
      escribir('health · el gateway no responde', 'error');
    }
  }, [escribir]);

  useEffect(() => {
    escribir('$ docker compose ps  ·  16 contenedores · redes publica, salida, interna, datos, clinica');
    revisar();
    const id = setInterval(revisar, 15000);
    return () => clearInterval(id);
  }, [revisar, escribir]);

  useEffect(() => { consola.current?.scrollTo(0, consola.current.scrollHeight); }, [log]);
  useEffect(() => {
    const tecla = (e) => { if (e.key === 'Escape') { setFoco(null); setConexion(null); } };
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  const estadoDe = (n) => {
    if (n.salud) return salud[n.salud] ?? 'desconocido';
    if (n.id === 'nginx') return salud.nginx ?? 'desconocido';
    return 'desconocido';
  };

  // ---------- Simulación ----------
  const simular = async (clave) => {
    if (corriendo) return;
    const f = FLUJOS[clave];
    cancelar.current = false; setCorriendo(true); setFoco(null);
    escribir(`── Simulación: ${f.nombre} ──`, 'titulo');
    for (const [enlace, texto] of f.pasos) {
      if (cancelar.current) break;
      const [de, a] = enlace.split('>');
      setActivo(enlace);
      escribir(`${de} → ${a}  ${texto}`);
      await new Promise((r) => setTimeout(r, 1100));
    }
    escribir(cancelar.current ? 'simulación detenida' : `✓ ${f.nombre}: recorrido completo`, cancelar.current ? 'error' : 'ok');
    setActivo(null); setCorriendo(false);
  };

  // ---------- Lienzo: arrastrar, mover, zoom ----------
  const aLienzo = (e) => {
    const r = svg.current.getBoundingClientRect();
    const escala = ANCHO / r.width;
    return { x: ((e.clientX - r.left) * escala - vista.x) / vista.k, y: ((e.clientY - r.top) * escala - vista.y) / vista.k, escala };
  };
  const bajar = (e, id) => {
    e.stopPropagation();
    const p = aLienzo(e);
    arrastre.current = id ? { id, dx: p.x - pos[id].x, dy: p.y - pos[id].y, movido: false } : { fondo: true, x: e.clientX, y: e.clientY, vx: vista.x, vy: vista.y, movido: false };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const mover = (e) => {
    const a = arrastre.current;
    if (!a) return;
    a.movido = true;
    if (a.fondo) {
      const escala = ANCHO / svg.current.getBoundingClientRect().width;
      setVista((v) => ({ ...v, x: a.vx + (e.clientX - a.x) * escala, y: a.vy + (e.clientY - a.y) * escala }));
    } else {
      const p = aLienzo(e);
      setPos((ps) => ({ ...ps, [a.id]: { x: p.x - a.dx, y: p.y - a.dy } }));
    }
  };
  const soltar = () => {
    const a = arrastre.current;
    if (a && !a.movido) { setFoco(a.fondo ? null : (f) => (f === a.id ? null : a.id)); setConexion(null); }
    arrastre.current = null;
  };
  const rueda = (e) => {
    const p = aLienzo(e);
    setVista((v) => {
      const k = Math.min(2.5, Math.max(0.4, v.k * (e.deltaY < 0 ? 1.1 : 0.9)));
      return { k, x: v.x + p.x * (v.k - k), y: v.y + p.y * (v.k - k) };
    });
  };
  useEffect(() => {
    const el = svg.current;
    const evitar = (e) => e.preventDefault();
    el.addEventListener('wheel', evitar, { passive: false });
    return () => el.removeEventListener('wheel', evitar);
  }, []);

  const visibles = ENLACES.filter((l) => !ocultas.has(l.tipo));
  const vecinos = useMemo(() => {
    if (!foco) return null;
    const s = new Set([foco]);
    ENLACES.forEach((l) => { if (l.de === foco) s.add(l.a); if (l.a === foco) s.add(l.de); });
    return s;
  }, [foco]);
  const nodoFoco = NODOS.find((n) => n.id === foco);
  const enActivo = activo ? activo.split('>') : conexion ? conexion.split('>') : [];
  const nombre = (id) => NODOS.find((n) => n.id === id)?.nombre ?? id;
  const resumen = Object.values(salud).filter((v) => v === 'ok').length;

  return (
    <div className="flex min-h-screen flex-col bg-[#0B1622] font-sans text-[#D6E2EE]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-5 py-3">
        <div>
          <h1 className="font-display text-[17px] font-bold text-white">Libitina EPS · Topología de microservicios</h1>
          <p className="font-mono text-[11.5px] text-[#8FA3B8]">VM Azure · Ubuntu · docker compose · 16 contenedores · 18 componentes · 6 redes</p>
        </div>
        <div className="flex items-center gap-3 font-mono text-[11.5px]">
          <span className="rounded border border-white/15 px-2 py-1">ESTADO REAL · {resumen}/9 en línea</span>
          <span className="rounded border border-dorado-400/40 px-2 py-1 text-dorado-300">FLUJOS SIMULADOS</span>
          <Link to="/admin" className="rounded bg-white/10 px-3 py-1 hover:bg-white/20">Volver al panel</Link>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 px-5 py-2 text-[12px]">
        <span className="mr-1 text-[#8FA3B8]">Tráfico / protocolo:</span>
        {Object.entries(CATEGORIAS).map(([k, c]) => (
          <button key={k} type="button" onClick={() => setOcultas((o) => { const n = new Set(o); n.has(k) ? n.delete(k) : n.add(k); return n; })}
            className={`flex items-center gap-1.5 rounded border px-2 py-1 ${ocultas.has(k) ? 'border-white/10 opacity-40' : 'border-white/20'}`}>
            <span className="h-[3px] w-4 rounded" style={{ background: c.color }} />{c.nombre}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-3 text-[#8FA3B8]">
          {[['ok', 'en línea'], ['caido', 'sin respuesta'], ['desconocido', 'sin sonda']].map(([k, t]) => (
            <span key={k} className="flex items-center gap-1"><span className="h-2 w-2 rounded-full" style={{ background: COLOR_ESTADO[k] }} />{t}</span>
          ))}
        </span>
      </div>

      <div className="grid flex-1 grid-cols-1 lg:grid-cols-[1fr_340px]">
        <div className="relative min-h-[420px]">
          <svg ref={svg} viewBox={`0 0 ${ANCHO} ${ALTO}`} className="h-full w-full cursor-grab touch-none select-none active:cursor-grabbing"
            onPointerDown={(e) => bajar(e, null)} onPointerMove={mover} onPointerUp={soltar} onWheel={rueda}>
            <defs>
              <marker id="flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M1 1L9 5L1 9" fill="none" stroke="context-stroke" strokeWidth="1.6" />
              </marker>
            </defs>
            <g transform={`translate(${vista.x} ${vista.y}) scale(${vista.k})`}>
              {visibles.map((l) => {
                const a = pos[l.de], b = pos[l.a];
                const encendido = activo === l.id || conexion === l.id;
                const apagado = (vecinos && !(l.de === foco || l.a === foco)) || ((activo || conexion) && !encendido);
                const mx = (a.x + b.x) / 2;
                const d = `M${a.x} ${a.y} C${mx} ${a.y} ${mx} ${b.y} ${b.x} ${b.y}`;
                return (
                  <g key={l.id}>
                  <path d={d} fill="none" stroke="transparent" strokeWidth="12" className="cursor-pointer"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={() => { setConexion(l.id); if (!vecinos || !(l.de === foco || l.a === foco)) setFoco(l.de); }} />
                  <path d={d} fill="none" pointerEvents="none"
                    stroke={CATEGORIAS[l.tipo].color} strokeWidth={encendido ? 3.2 : 1.2} markerEnd="url(#flecha)"
                    strokeDasharray={l.tipo === 'cola' || l.tipo === 'externo' ? '5 4' : undefined}
                    opacity={encendido ? 1 : apagado ? 0.08 : 0.55} className={encendido ? 'flujo-activo' : undefined} />
                  </g>
                );
              })}
              {NODOS.map((n) => {
                const p = pos[n.id];
                const est = estadoDe(n);
                const apagado = (vecinos && !vecinos.has(n.id)) || ((activo || conexion) && !enActivo.includes(n.id));
                const resaltado = foco === n.id || enActivo.includes(n.id);
                return (
                  <g key={n.id} transform={`translate(${p.x - NW / 2} ${p.y - NH / 2})`} opacity={apagado ? 0.25 : 1}
                    onPointerDown={(e) => bajar(e, n.id)} className="cursor-pointer">
                    <rect width={NW} height={NH} rx="7" fill={n.capa === 'datos' ? '#0F2A2A' : n.id === 'historia' || n.id === 'db-clinica' ? '#2A1A1A' : '#13243A'}
                      stroke={resaltado ? '#F6C220' : n.contenedor ? '#3A5878' : '#55606C'} strokeWidth={resaltado ? 2 : 1}
                      strokeDasharray={n.contenedor ? undefined : '4 3'} />
                    <circle cx={NW - 12} cy={12} r="4.5" fill={COLOR_ESTADO[est]} />
                    <text x="12" y="21" fill="#FFFFFF" fontSize="13" fontWeight="600">{n.nombre}</text>
                    <text x="12" y="38" fill="#8FA3B8" fontSize="10.5" fontFamily="ui-monospace, monospace">{n.sub}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div className="pointer-events-none absolute bottom-2 left-3 font-mono text-[11px] text-[#6B7A8C]">
            Arrastra para mover · rueda para zoom · clic en un nodo o en una línea · Esc o clic en vacío para limpiar · zoom {Math.round(vista.k * 100)}%
          </div>
          <button type="button" onClick={() => { setVista({ x: 0, y: 0, k: 1 }); setPos(Object.fromEntries(NODOS.map((n) => [n.id, { x: n.x, y: n.y }]))); }}
            className="absolute right-3 top-3 rounded border border-white/15 bg-[#0B1622] px-2 py-1 text-[11.5px] hover:bg-white/10">Restablecer vista</button>
        </div>

        <aside className="border-t border-white/10 p-4 text-[13px] lg:border-l lg:border-t-0">
          {nodoFoco ? (
            <div className="space-y-3">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-wider text-[#8FA3B8]">{CAPAS[nodoFoco.capa]} · {nodoFoco.contenedor ? 'contenedor' : 'externo'}</p>
                <h2 className="font-display text-[18px] font-bold text-white">{nodoFoco.nombre}</h2>
              </div>
              <dl className="grid grid-cols-3 gap-2 font-mono text-[11.5px]">
                {[['Puerto', nodoFoco.puerto], ['Protocolo', nodoFoco.protocolo], ['Estado', { ok: 'en línea', caido: 'sin respuesta', desconocido: 'sin sonda' }[estadoDe(nodoFoco)]]].map(([k, v]) => (
                  <div key={k} className="rounded border border-white/10 p-2"><dt className="text-[#6B7A8C]">{k}</dt><dd className="text-white">{v}</dd></div>
                ))}
              </dl>
              <Bloque titulo="Rol en la infraestructura"><p>{nodoFoco.rol}</p></Bloque>
              {nodoFoco.redes.length > 0 && <Bloque titulo="Redes Docker"><p className="font-mono">{nodoFoco.redes.join(' · ')}</p></Bloque>}
              <Bloque titulo="Capas de seguridad"><ul className="list-disc space-y-1 pl-4">{nodoFoco.seguridad.map((s) => <li key={s}>{s}</li>)}</ul></Bloque>
              {nodoFoco.tablas.length > 0 && <Bloque titulo="Esquemas y tablas"><ul className="space-y-1 font-mono text-[11.5px]">{nodoFoco.tablas.map((s) => <li key={s}>{s}</li>)}</ul></Bloque>}
              <Bloque titulo="Conexiones directas · clic para ver por qué">
                <ul className="space-y-1 font-mono text-[11.5px]">
                  {ENLACES.filter((l) => l.de === foco || l.a === foco).map((l) => {
                    const abierta = conexion === l.id;
                    const det = DETALLE_ENLACES[l.id];
                    return (
                      <li key={l.id}>
                        <button type="button" onClick={() => setConexion(abierta ? null : l.id)}
                          className={`flex w-full items-center gap-2 rounded px-1.5 py-1 text-left hover:bg-white/10 ${abierta ? 'bg-white/10 text-white' : ''}`}>
                          <span className="h-[3px] w-3 shrink-0 rounded" style={{ background: CATEGORIAS[l.tipo].color }} />
                          <span className="flex-1">{l.de === foco ? `→ ${nombre(l.a)}` : `← ${nombre(l.de)}`}</span>
                          <span className="text-[#6B7A8C]">{abierta ? '−' : '+'}</span>
                        </button>
                        {abierta && det && (
                          <div className="mb-2 ml-5 mt-1 space-y-2 border-l border-white/15 pl-3 font-sans text-[12.5px]">
                            <p className="font-mono text-[11px] text-[#8FA3B8]">{nombre(l.de)} → {nombre(l.a)} · {CATEGORIAS[l.tipo].nombre}</p>
                            <p><span className="text-[#8FA3B8]">Por qué: </span>{det.por}</p>
                            <ul className="list-disc space-y-1 pl-4 text-[#D6E2EE]">{det.procesos.map((x) => <li key={x}>{x}</li>)}</ul>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </Bloque>
            </div>
          ) : (
            <div className="space-y-3 text-[#8FA3B8]">
              <h2 className="font-display text-[16px] font-bold text-white">Detalle del nodo</h2>
              <p>Haz clic en un nodo para ver su capa, puerto, redes, capas de seguridad, tablas y conexiones.</p>
              <p>Haz clic en una línea, o en una conexión del panel, para ver por qué existe y qué procesos la usan.</p>
            </div>
          )}
          <div className="mt-5 space-y-2 border-t border-white/10 pt-4">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-[#8FA3B8]">Simular flujo end-to-end</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(FLUJOS).map(([k, f]) => (
                <button key={k} type="button" disabled={corriendo} onClick={() => simular(k)}
                  className="rounded border border-dorado-400/40 px-2 py-2 text-left text-[12.5px] text-dorado-200 hover:bg-dorado-400/10 disabled:opacity-40">{f.nombre}</button>
              ))}
            </div>
            {corriendo && <button type="button" onClick={() => { cancelar.current = true; }} className="w-full rounded border border-white/15 py-1.5 text-[12px] hover:bg-white/10">Detener</button>}
          </div>
        </aside>
      </div>

      <section className="border-t border-white/10 bg-[#070F18]">
        <div className="flex items-center justify-between px-5 py-1.5 font-mono text-[11px] text-[#6B7A8C]">
          <span>STDOUT · TTY · docker compose logs --tail=50</span>
          <button type="button" onClick={revisar} className="hover:text-white">revisar estado ahora</button>
        </div>
        <div ref={consola} className="h-44 overflow-y-auto px-5 pb-3 font-mono text-[12px] leading-relaxed">
          {log.map((l, i) => (
            <div key={i} className={{ ok: 'text-[#3DD68C]', error: 'text-[#F26D6D]', titulo: 'text-dorado-300', info: 'text-[#C2D0DE]' }[l.tipo]}>
              <span className="text-[#56677A]">{l.t}</span>  {l.texto}
            </div>
          ))}
        </div>
      </section>
      <style>{'@keyframes flujo{to{stroke-dashoffset:-18}} .flujo-activo{stroke-dasharray:6 3;animation:flujo .6s linear infinite}'}</style>
    </div>
  );
}

function Bloque({ titulo, children }) {
  return (
    <div>
      <h3 className="mb-1 font-mono text-[11px] uppercase tracking-wider text-[#8FA3B8]">{titulo}</h3>
      <div className="text-[#D6E2EE]">{children}</div>
    </div>
  );
}

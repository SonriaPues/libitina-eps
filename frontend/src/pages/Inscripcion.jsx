import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Marca } from '../components/ui/Marca.jsx';
import { Campo, Alerta, Segmentado } from '../components/ui/Controles.jsx';
import { afiliadosApi, prestadoresApi } from '../api/servicios.js';
import { useAuth } from '../context/AuthContext.jsx';
import { IPS, nombreIps } from '../data/ips.js';
import { DEPARTAMENTOS, SEXOS, ETNIAS, DISCAPACIDADES, CATEGORIAS, SISBEN } from '../data/formulario.js';
import { validarBeneficiarios, edad } from '../utils/beneficiarios.js';
import { correoValido, claveSegura, soloNumeros } from '../utils/validaciones.js';
import { PARENTESCOS, nombreCompleto } from '../utils/formato.js';
import { titularDePrueba, afiliacionDePrueba, beneficiariosDePrueba, cuentaDePrueba } from '../utils/datosPrueba.js';

const TITULOS = { datos: 'Cuéntanos quién eres', regimen: 'Elige tu régimen y tu IPS', familia: 'Agrega a tu grupo familiar', cuenta: 'Crea tu cuenta', confirmacion: 'Revisa y envía' };
const ETIQUETAS = { datos: 'Datos personales', regimen: 'Régimen e IPS', familia: 'Grupo familiar', cuenta: 'Tu cuenta', confirmacion: 'Confirmación' };
const CONSEJOS = {
  datos: 'Escribe tus nombres tal como aparecen en tu documento. La pertenencia étnica y la discapacidad son opcionales: nos ayudan a priorizar la atención diferencial y las brigadas rurales.',
  regimen: 'Si trabajas con contrato eres dependiente; si trabajas por tu cuenta, independiente. La IPS la puedes cambiar después.',
  familia: 'Ten a la mano el documento de cada beneficiario. Si no tienes beneficiarios, sigue sin agregar ninguno.',
  cuenta: 'Usa un correo que revises seguido: ahí te llegará el enlace para confirmarlo y el resultado de tu solicitud.',
  confirmacion: 'Después de enviar, tu afiliación queda pendiente hasta que un administrador la apruebe.',
};
const TITULAR0 = { tipo_documento: 'CC', numero_documento: '', nombres: '', apellidos: '', fecha_nacimiento: '', sexo: '', telefono: '', departamento: '', ciudad: '', direccion: '', zona: 'urbana', pertenencia_etnica: 'no_responde', tiene_discapacidad: null, tipo_discapacidad: null };
const AFIL0 = { regimen: '', ips_id: '', tipo_cotizante: 'dependiente', categoria: '', empleador_nit: '', empleador_nombre: '', grupo_sisben: '' };
const nuevoBenef = () => ({ parentesco: '', tipo_documento: 'RC', numero_documento: '', nombres: '', apellidos: '', fecha_nacimiento: '', sexo: '', incapacidad_permanente: false, pertenencia_etnica: 'no_responde', tiene_discapacidad: null, tipo_discapacidad: null });
const discapacidadValor = (v) => (v === null || v === undefined ? 'nr' : v ? 'si' : 'no');
const Opciones = ({ lista, vacia }) => <>{vacia && <option value="">{vacia}</option>}{lista.map(([v, t]) => <option key={v} value={v}>{t}</option>)}</>;

export default function Inscripcion() {
  const [params] = useSearchParams();
  const corregir = params.get('corregir') === '1';
  const { usuario } = useAuth();
  const navigate = useNavigate();
  const PASOS = useMemo(() => (corregir ? ['datos', 'regimen', 'familia', 'confirmacion'] : ['datos', 'regimen', 'familia', 'cuenta', 'confirmacion']), [corregir]);

  const [paso, setPaso] = useState(0);
  const [t, setT] = useState(TITULAR0);
  const [af, setAf] = useState(AFIL0);
  const [benefs, setBenefs] = useState([]);
  const [cuenta, setCuenta] = useState({ correo: '', clave: '', clave2: '' });
  const [cons, setCons] = useState({ autoriza_datos_salud: false, declara_veracidad: false, autoriza_contacto_comercial: false, canal_notificacion: 'email' });
  const [ips, setIps] = useState(IPS);
  const [errores, setErrores] = useState({});
  const [errorEnvio, setErrorEnvio] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [cargaCorreccion, setCargaCorreccion] = useState(corregir ? 'cargando' : 'listo');

  useEffect(() => { prestadoresApi.ips().then(setIps); }, []);
  useEffect(() => {
    if (!corregir) return;
    if (!usuario) { navigate('/iniciar-sesion'); return; }
    afiliadosApi.miAfiliacion().then((a) => {
      if (a.estado !== 'rechazado') { setCargaCorreccion('no-aplica'); return; }
      setT(Object.fromEntries(Object.keys(TITULAR0).map((k) => [k, a[k] ?? TITULAR0[k]])));
      setAf(Object.fromEntries(Object.keys(AFIL0).map((k) => [k, a[k] ?? AFIL0[k]])));
      setBenefs(a.beneficiarios.map((b) => ({ ...nuevoBenef(), ...b })));
      setCargaCorreccion('listo');
    }).catch((e) => { setErrorEnvio(e.message); setCargaCorreccion('listo'); });
  }, [corregir, usuario, navigate]);

  const id = PASOS[paso];
  const setTit = (k) => (e) => setT({ ...t, [k]: ['numero_documento', 'telefono'].includes(k) ? soloNumeros(e.target.value) : e.target.value });
  const setAfi = (k) => (e) => setAf({ ...af, [k]: e?.target ? e.target.value : e });
  const setB = (i, k) => (e) => setBenefs(benefs.map((b, j) => (j === i ? { ...b, [k]: e.target.type === 'checkbox' ? e.target.checked : k === 'numero_documento' ? soloNumeros(e.target.value) : e.target.value } : b)));
  const setDisc = (setter, obj) => (e) => setter({ ...obj, tiene_discapacidad: { nr: null, no: false, si: true }[e.target.value], tipo_discapacidad: e.target.value === 'si' ? obj.tipo_discapacidad : null });

  function validar(p) {
    const e = {};
    if (p === 'datos') {
      ['numero_documento', 'nombres', 'apellidos', 'fecha_nacimiento', 'sexo', 'telefono', 'departamento', 'ciudad', 'direccion'].forEach((k) => { if (!String(t[k] ?? '').trim()) e[k] = 'Este dato es obligatorio.'; });
      if (t.numero_documento && t.numero_documento.length < 5) e.numero_documento = 'Revisa el número de documento.';
      if (t.telefono && t.telefono.length < 7) e.telefono = 'Revisa el número de celular.';
      if (t.fecha_nacimiento && edad(t.fecha_nacimiento) < 18) e.fecha_nacimiento = 'El titular de la afiliación debe ser mayor de edad.';
      if (t.tiene_discapacidad && !t.tipo_discapacidad) e.tipo_discapacidad = 'Elige el tipo de discapacidad.';
    }
    if (p === 'regimen') {
      if (!af.regimen) e.regimen = 'Elige tu régimen.';
      if (!af.ips_id) e.ips_id = 'Elige una IPS.';
      if (af.regimen === 'contributivo') {
        if (!af.categoria) e.categoria = 'Elige tu rango de ingresos.';
        if (af.tipo_cotizante === 'dependiente') {
          if (!/^[0-9]{6,12}(-[0-9])?$/.test(af.empleador_nit)) e.empleador_nit = 'Escribe el NIT sin puntos, por ejemplo 900123456-7.';
          if (!af.empleador_nombre.trim()) e.empleador_nombre = 'Escribe el nombre de tu empleador.';
        }
      }
      if (af.regimen === 'subsidiado' && !af.grupo_sisben) e.grupo_sisben = 'Elige tu grupo del Sisbén.';
    }
    if (p === 'familia') { const eb = validarBeneficiarios(benefs); Object.keys(eb).forEach((i) => { e[`b${i}`] = eb[i]; }); }
    if (p === 'cuenta') {
      if (!correoValido(cuenta.correo)) e.correo = 'Escribe un correo válido, por ejemplo nombre@correo.com.';
      if (!claveSegura(cuenta.clave)) e.clave = 'Usa mínimo 8 caracteres, con al menos una mayúscula y un número.';
      if (cuenta.clave !== cuenta.clave2) e.clave2 = 'Las contraseñas no coinciden.';
    }
    if (p === 'confirmacion') {
      if (!corregir && !cons.autoriza_datos_salud) e.salud = 'Para afiliarte debes autorizar el tratamiento de tus datos de salud.';
      if (!cons.declara_veracidad) e.veracidad = 'Debes declarar que la información es verdadera.';
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function irA(p) {
    if (!prueba.startsWith('Anota')) setPrueba('');
    if (p <= paso) { setErrores({}); setPaso(p); return; }
    for (let i = paso; i < p; i++) if (!validar(PASOS[i])) { setPaso(i); return; }
    setPaso(p);
  }

  // Botón de pruebas: llena el paso actual con datos aleatorios válidos.
  const [prueba, setPrueba] = useState('');
  function rellenar() {
    setErrores({}); setPrueba('');
    if (id === 'datos') setT(titularDePrueba({ ...t, bloqueado: corregir }));
    if (id === 'regimen') setAf(afiliacionDePrueba(ips, t));
    if (id === 'familia') { const l = beneficiariosDePrueba(t, nuevoBenef); setBenefs(l); if (!l.length) setPrueba('Esta vez salió sin beneficiarios. Vuelve a tocar el botón para generar otro grupo.'); }
    if (id === 'cuenta') { const c = cuentaDePrueba(t); setCuenta(c); setPrueba(`Anota estos datos para entrar después: ${c.correo} · contraseña ${c.clave}`); }
    if (id === 'confirmacion') setCons({ ...cons, autoriza_datos_salud: true, declara_veracidad: true });
  }

  function datosAfiliacion() {
    const base = { regimen: af.regimen, ips_id: af.ips_id };
    return af.regimen === 'contributivo'
      ? { ...base, tipo_cotizante: af.tipo_cotizante, categoria: af.categoria, ...(af.tipo_cotizante === 'dependiente' ? { empleador_nit: af.empleador_nit, empleador_nombre: af.empleador_nombre.trim() } : {}) }
      : { ...base, grupo_sisben: af.grupo_sisben };
  }

  async function enviar() {
    for (let i = 0; i < PASOS.length; i++) if (!validar(PASOS[i])) { setPaso(i); return; }
    setEnviando(true); setErrorEnvio('');
    const beneficiarios = benefs.map((b) => ({ ...b, nombres: b.nombres.trim(), apellidos: b.apellidos.trim(), ...(b.id ? { id: b.id } : {}) })).map(({ estado: _e, ...b }) => b);
    const titular = { ...t, nombres: t.nombres.trim(), apellidos: t.apellidos.trim() };
    try {
      if (corregir) await afiliadosApi.reenviar({ titular, afiliacion: datosAfiliacion(), beneficiarios });
      else await afiliadosApi.inscripcion({ titular, afiliacion: datosAfiliacion(), beneficiarios, cuenta: { correo: cuenta.correo, clave: cuenta.clave }, consentimiento: cons });
      setEnviado(true);
    } catch (err) { setErrorEnvio(err.message); } finally { setEnviando(false); }
  }

  const resumen = [
    ['Titular', nombreCompleto(t) ? `${nombreCompleto(t)}${t.numero_documento ? ` · ${t.tipo_documento} ${t.numero_documento}` : ''}` : ''],
    ['Residencia', t.ciudad ? `${t.ciudad}, ${t.departamento} · zona ${t.zona}` : ''],
    ['Régimen', af.regimen === 'contributivo' ? `Contributivo · ${af.tipo_cotizante}${af.categoria ? ` · categoría ${af.categoria}` : ''}` : af.regimen === 'subsidiado' ? `Subsidiado${af.grupo_sisben ? ` · Sisbén ${af.grupo_sisben}` : ''}` : ''],
    ['IPS', af.ips_id ? nombreIps(af.ips_id, ips) : ''],
    ['Beneficiarios', benefs.filter((b) => b.nombres).map((b) => `${nombreCompleto(b)}${b.parentesco ? ` (${PARENTESCOS[b.parentesco]})` : ''}`).join(', ')],
    ...(corregir ? [] : [['Cuenta', cuenta.correo]]),
  ];

  const input = (k, props = {}) => (idc) => <input id={idc} className="campo" value={t[k] ?? ''} onChange={setTit(k)} {...props} />;

  return (
    <div className="min-h-screen bg-fondo">
      <header className="border-b border-azul-100 bg-white">
        <div className="contenedor flex items-center justify-between py-3.5">
          <Marca alto={44} texto="text-xl" />
          {corregir ? <Link to="/portal" className="text-sm font-semibold text-azul-600 md:text-[15px]">Volver a mi portal</Link>
            : <span className="text-sm text-azul-700 md:text-[15px]">¿Ya tienes cuenta? <Link to="/iniciar-sesion" className="font-semibold text-azul-600">Inicia sesión</Link></span>}
        </div>
      </header>

      <div className="contenedor flex flex-col gap-7 pt-10">
        <div className="flex flex-col gap-2"><span className="antetitulo">{corregir ? 'Corregir solicitud' : 'Afiliación en línea'}</span><h1 className="text-3xl font-extrabold md:text-4xl">{corregir ? 'Corrige y reenvía tu solicitud' : 'Inscríbete en Libitina EPS'}</h1></div>
        {!enviado && cargaCorreccion === 'listo' && (
          <nav aria-label="Pasos" className="grid gap-1.5 md:gap-2.5" style={{ gridTemplateColumns: `repeat(${PASOS.length}, minmax(0, 1fr))` }}>
            {PASOS.map((p, i) => {
              const on = paso === i, hecho = i < paso;
              return (
                <button key={p} type="button" onClick={() => irA(i)} aria-current={on ? 'step' : undefined}
                  className={`flex items-center gap-3 border-b-4 px-1 pb-4 pt-3 text-left md:px-3.5 ${on ? 'border-dorado-400' : hecho ? 'border-azul-600' : 'border-azul-100'}`}>
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${on ? 'bg-dorado-400 text-azul-950' : hecho ? 'bg-azul-600 text-white' : 'border-[1.5px] border-azul-200 bg-white text-azul-400'}`}>{hecho ? '✓' : i + 1}</span>
                  <span className={`hidden text-sm font-semibold md:block ${on ? 'text-azul-900' : hecho ? 'text-azul-600' : 'text-azul-400'}`}>{ETIQUETAS[p]}</span>
                </button>
              );
            })}
          </nav>
        )}
      </div>

      <div className="contenedor grid gap-8 pb-12 pt-7 lg:grid-cols-12">
        <section className="flex flex-col gap-6 rounded-[20px] border border-azul-100 bg-white p-6 md:p-9 lg:col-span-7">
          {cargaCorreccion === 'cargando' && <p className="text-azul-500">Cargando tu solicitud…</p>}
          {cargaCorreccion === 'no-aplica' && (
            <div className="flex flex-col items-start gap-4"><h2 className="text-2xl font-extrabold">No hay nada que corregir</h2><p className="text-azul-700">Solo puedes corregir una solicitud que haya sido rechazada.</p><Link to="/portal" className="btn-primario">Ir a mi portal</Link></div>
          )}
          {enviado && (
            <div className="flex flex-col items-start gap-5 py-5">
              <span className="flex h-16 w-16 items-center justify-center rounded-full bg-dorado-100 text-3xl text-dorado-700">✓</span>
              <h2 className="text-[28px] font-extrabold">{corregir ? 'Reenviamos tu solicitud' : 'Recibimos tu solicitud'}</h2>
              <p className="max-w-[520px] text-base leading-relaxed text-azul-700">
                {corregir ? 'Tu solicitud volvió a quedar pendiente. Te avisaremos por correo cuando un administrador la revise.'
                  : <>Tu afiliación quedó en estado <strong className="text-dorado-800">pendiente</strong>. Te enviamos un correo a <strong>{cuenta.correo}</strong> con un enlace para confirmarlo, y te avisaremos cuando un administrador revise tu solicitud.</>}
              </p>
              <Link to={corregir ? '/portal' : '/iniciar-sesion'} className="btn-primario">Ir a mi portal</Link>
            </div>
          )}
          {!enviado && cargaCorreccion === 'listo' && (
            <>
              <div className="flex flex-col gap-1.5"><span className="text-[13px] text-azul-500">Paso {paso + 1} de {PASOS.length}</span><h2 className="text-[26px] font-extrabold">{TITULOS[id]}</h2></div>

              {id === 'datos' && (
                <div className="grid gap-x-5 gap-y-4 sm:grid-cols-2">
                  <Campo etiqueta="Tipo de documento">{(i) => <select id={i} className="campo" value={t.tipo_documento} onChange={setTit('tipo_documento')} disabled={corregir}><Opciones lista={[['CC', 'Cédula de ciudadanía'], ['CE', 'Cédula de extranjería'], ['PPT', 'Permiso de protección temporal'], ['PA', 'Pasaporte']]} /></select>}</Campo>
                  <Campo etiqueta="Número de documento" error={errores.numero_documento} ayuda={corregir ? 'El documento no se puede cambiar.' : undefined}>{input('numero_documento', { inputMode: 'numeric', placeholder: '1012345678', disabled: corregir })}</Campo>
                  <Campo etiqueta="Nombres" error={errores.nombres}>{input('nombres', { placeholder: 'Laura Camila', autoComplete: 'given-name' })}</Campo>
                  <Campo etiqueta="Apellidos" error={errores.apellidos}>{input('apellidos', { placeholder: 'Rodríguez Pérez', autoComplete: 'family-name' })}</Campo>
                  <Campo etiqueta="Fecha de nacimiento" error={errores.fecha_nacimiento}>{input('fecha_nacimiento', { type: 'date' })}</Campo>
                  <Campo etiqueta="Sexo" error={errores.sexo}>{(i) => <select id={i} className="campo" value={t.sexo} onChange={setTit('sexo')}><Opciones lista={SEXOS} vacia="Selecciona" /></select>}</Campo>
                  <Campo etiqueta="Celular" error={errores.telefono}>{input('telefono', { type: 'tel', inputMode: 'numeric', placeholder: '3001234567', autoComplete: 'tel' })}</Campo>
                  <Campo etiqueta="Departamento" error={errores.departamento}>{(i) => <select id={i} className="campo" value={t.departamento} onChange={setTit('departamento')}><Opciones lista={DEPARTAMENTOS.map((d) => [d, d])} vacia="Selecciona" /></select>}</Campo>
                  <Campo etiqueta="Municipio" error={errores.ciudad}>{input('ciudad', { placeholder: 'Bogotá' })}</Campo>
                  <Campo etiqueta="Dirección" error={errores.direccion}>{input('direccion', { placeholder: 'Calle 47 # 13-20 o vereda El Carmen', autoComplete: 'street-address' })}</Campo>
                  <div className="flex flex-col gap-2 sm:col-span-2"><span className="etiqueta">Zona de residencia</span><Segmentado className="sm:max-w-sm" opciones={[['urbana', 'Urbana'], ['rural', 'Rural']]} valor={t.zona} onCambio={(v) => setT({ ...t, zona: v })} /></div>
                  <div className="flex flex-col gap-4 rounded-xl bg-azul-50 p-4 sm:col-span-2">
                    <p className="text-[13px] leading-relaxed text-azul-700">Estas dos preguntas son opcionales. Son datos sensibles (Ley 1581 de 2012) y solo se usan para la atención diferencial.</p>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Campo etiqueta="Pertenencia étnica">{(i) => <select id={i} className="campo" value={t.pertenencia_etnica} onChange={setTit('pertenencia_etnica')}><Opciones lista={ETNIAS} /></select>}</Campo>
                      <Campo etiqueta="¿Tienes alguna discapacidad?">{(i) => <select id={i} className="campo" value={discapacidadValor(t.tiene_discapacidad)} onChange={setDisc(setT, t)}><option value="nr">Prefiero no responder</option><option value="no">No</option><option value="si">Sí</option></select>}</Campo>
                      {t.tiene_discapacidad && <Campo etiqueta="Tipo de discapacidad" error={errores.tipo_discapacidad}>{(i) => <select id={i} className="campo" value={t.tipo_discapacidad ?? ''} onChange={setTit('tipo_discapacidad')}><Opciones lista={DISCAPACIDADES} vacia="Selecciona" /></select>}</Campo>}
                    </div>
                  </div>
                </div>
              )}

              {id === 'regimen' && (
                <div className="flex flex-col gap-6">
                  <fieldset className="flex flex-col"><legend className="etiqueta mb-2.5">Régimen</legend>
                    <div className="grid gap-3.5 sm:grid-cols-2">
                      {[['contributivo', 'Contributivo', 'Si trabajas con contrato, eres independiente o pensionado y aportas a salud.'], ['subsidiado', 'Subsidiado', 'Si no tienes capacidad de pago y estás en los grupos A o B del Sisbén.']].map(([v, n, d]) => (
                        <button key={v} type="button" aria-pressed={af.regimen === v} onClick={() => setAf({ ...af, regimen: v })}
                          className={`flex flex-col items-start gap-1.5 rounded-[14px] p-5 text-left ${af.regimen === v ? 'border-2 border-azul-600 bg-azul-50' : 'border-[1.5px] border-azul-200 bg-white'}`}>
                          <span className="font-display text-lg font-bold">{n}</span><span className="text-sm leading-relaxed text-azul-700">{d}</span>
                        </button>
                      ))}
                    </div>
                    {errores.regimen && <span className="mt-2 text-[13px] text-red-700">{errores.regimen}</span>}
                  </fieldset>
                  {af.regimen === 'contributivo' && (
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="flex flex-col gap-2 sm:col-span-2"><span className="etiqueta">Tipo de cotizante</span><Segmentado opciones={[['dependiente', 'Dependiente'], ['independiente', 'Independiente'], ['pensionado', 'Pensionado']]} valor={af.tipo_cotizante} onCambio={setAfi('tipo_cotizante')} /></div>
                      {af.tipo_cotizante === 'dependiente' && <>
                        <Campo etiqueta="NIT del empleador" error={errores.empleador_nit}>{(i) => <input id={i} className="campo" placeholder="900123456-7" value={af.empleador_nit ?? ''} onChange={setAfi('empleador_nit')} />}</Campo>
                        <Campo etiqueta="Nombre del empleador" error={errores.empleador_nombre}>{(i) => <input id={i} className="campo" placeholder="Empresa Ejemplo SAS" value={af.empleador_nombre ?? ''} onChange={setAfi('empleador_nombre')} />}</Campo>
                      </>}
                      <Campo etiqueta="Rango de ingresos" error={errores.categoria} ayuda="Define tu categoría para cuotas moderadoras y copagos." className="sm:col-span-2">{(i) => <select id={i} className="campo" value={af.categoria ?? ''} onChange={setAfi('categoria')}><Opciones lista={CATEGORIAS.map(([v, tx]) => [v, `${tx} (categoría ${v})`])} vacia="Selecciona" /></select>}</Campo>
                    </div>
                  )}
                  {af.regimen === 'subsidiado' && (
                    <Campo etiqueta="Grupo del Sisbén" error={errores.grupo_sisben} ayuda="Lo encuentras en la consulta de puntaje del Sisbén IV.">{(i) => <select id={i} className="campo" value={af.grupo_sisben ?? ''} onChange={setAfi('grupo_sisben')}><Opciones lista={SISBEN.map((g) => [g, g])} vacia="Selecciona" /></select>}</Campo>
                  )}
                  <Campo etiqueta="IPS de atención" error={errores.ips_id} ayuda="La lista sale de la Red de Prestadores.">{(i) => <select id={i} className="campo" value={af.ips_id} onChange={setAfi('ips_id')}><Opciones lista={ips.map((x) => [x.id, `${x.nombre} · ${x.ciudad}`])} vacia="Selecciona una IPS" /></select>}</Campo>
                </div>
              )}

              {id === 'familia' && (
                <div className="flex flex-col gap-4">
                  <p className="rounded-xl bg-azul-50 px-4 py-3.5 text-sm leading-relaxed text-azul-700">Puedes afiliar a tu cónyuge o compañero permanente, a tus hijos menores de 25 años (o de cualquier edad con incapacidad permanente) y, si no tienes cónyuge ni hijos, a tus padres.</p>
                  {benefs.map((b, i) => (
                    <div key={b.id ?? i} className={`flex flex-col gap-3.5 rounded-2xl border p-5 ${errores[`b${i}`] ? 'border-red-300' : 'border-azul-200'}`}>
                      <div className="flex items-center justify-between"><span className="font-display text-base font-bold">Beneficiario {i + 1}</span>
                        <button type="button" onClick={() => setBenefs(benefs.filter((_, j) => j !== i))} className="p-2 text-sm font-semibold text-azul-600">Quitar</button></div>
                      <div className="grid gap-3.5 sm:grid-cols-2">
                        <Campo etiqueta="Parentesco">{(x) => <select id={x} className="campo" value={b.parentesco} onChange={setB(i, 'parentesco')}><Opciones lista={Object.entries(PARENTESCOS)} vacia="Selecciona" /></select>}</Campo>
                        <Campo etiqueta="Sexo">{(x) => <select id={x} className="campo" value={b.sexo} onChange={setB(i, 'sexo')}><Opciones lista={SEXOS} vacia="Selecciona" /></select>}</Campo>
                        <Campo etiqueta="Nombres">{(x) => <input id={x} className="campo" value={b.nombres} onChange={setB(i, 'nombres')} />}</Campo>
                        <Campo etiqueta="Apellidos">{(x) => <input id={x} className="campo" value={b.apellidos} onChange={setB(i, 'apellidos')} />}</Campo>
                        <Campo etiqueta="Tipo de documento">{(x) => <select id={x} className="campo" value={b.tipo_documento} onChange={setB(i, 'tipo_documento')}><Opciones lista={[['RC', 'Registro civil'], ['TI', 'Tarjeta de identidad'], ['CC', 'Cédula de ciudadanía'], ['CE', 'Cédula de extranjería'], ['PPT', 'PPT'], ['PA', 'Pasaporte']]} /></select>}</Campo>
                        <Campo etiqueta="N.º de documento">{(x) => <input id={x} className="campo" inputMode="numeric" value={b.numero_documento} onChange={setB(i, 'numero_documento')} />}</Campo>
                        <Campo etiqueta="Fecha de nacimiento">{(x) => <input id={x} type="date" className="campo" value={b.fecha_nacimiento} onChange={setB(i, 'fecha_nacimiento')} />}</Campo>
                        {b.parentesco === 'hijo' && <label className="flex items-center gap-2.5 self-end pb-3 text-sm"><input type="checkbox" className="h-5 w-5 accent-azul-600" checked={b.incapacidad_permanente} onChange={setB(i, 'incapacidad_permanente')} />Tiene incapacidad permanente</label>}
                      </div>
                      {errores[`b${i}`] && <span className="text-[13px] text-red-700">{errores[`b${i}`]}</span>}
                    </div>
                  ))}
                  <button type="button" onClick={() => setBenefs([...benefs, nuevoBenef()])} className="h-14 rounded-[14px] border-[1.5px] border-dashed border-azul-400 bg-white text-[15px] font-semibold text-azul-600 hover:bg-azul-50">+ Agregar {benefs.length ? 'otro ' : ''}beneficiario</button>
                </div>
              )}

              {id === 'cuenta' && (
                <div className="flex flex-col gap-4">
                  <Campo etiqueta="Correo electrónico" error={errores.correo}>{(i) => <input id={i} type="email" autoComplete="email" className="campo" placeholder="laura@correo.com" value={cuenta.correo} onChange={(e) => setCuenta({ ...cuenta, correo: e.target.value.trim() })} />}</Campo>
                  <Campo etiqueta="Contraseña" error={errores.clave} ayuda="Mínimo 8 caracteres, con al menos una mayúscula y un número.">{(i) => <input id={i} type="password" autoComplete="new-password" className="campo" value={cuenta.clave} onChange={(e) => setCuenta({ ...cuenta, clave: e.target.value })} />}</Campo>
                  <Campo etiqueta="Confirma tu contraseña" error={errores.clave2}>{(i) => <input id={i} type="password" autoComplete="new-password" className="campo" value={cuenta.clave2} onChange={(e) => setCuenta({ ...cuenta, clave2: e.target.value })} />}</Campo>
                </div>
              )}

              {id === 'confirmacion' && (
                <div className="flex flex-col gap-4">
                  <p className="text-[15px] leading-relaxed text-azul-700">Revisa el resumen. Si algo está mal, vuelve al paso correspondiente desde la barra superior.</p>
                  {!corregir && <>
                    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-azul-600" checked={cons.autoriza_datos_salud} onChange={(e) => setCons({ ...cons, autoriza_datos_salud: e.target.checked })} /><span>Autorizo el tratamiento de mis datos personales y los de mis beneficiarios, incluidos los datos de salud, según la <Link to="/politica-de-datos" target="_blank" className="font-semibold text-azul-600">política de tratamiento de datos</Link> (Ley 1581 de 2012). <span className="text-red-700">*</span></span></label>
                    {errores.salud && <span className="text-[13px] text-red-700">{errores.salud}</span>}
                    <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-azul-600" checked={cons.autoriza_contacto_comercial} onChange={(e) => setCons({ ...cons, autoriza_contacto_comercial: e.target.checked })} /><span>Acepto recibir información sobre programas de salud y campañas de Libitina (opcional).</span></label>
                    <Campo etiqueta="¿Por dónde prefieres que te escribamos?" className="sm:max-w-xs">{(i) => <select id={i} className="campo" value={cons.canal_notificacion} onChange={(e) => setCons({ ...cons, canal_notificacion: e.target.value })}><Opciones lista={[['email', 'Correo electrónico'], ['sms', 'Mensaje de texto'], ['whatsapp', 'WhatsApp']]} /></select>}</Campo>
                  </>}
                  <label className="flex cursor-pointer items-start gap-3 text-[15px] leading-relaxed"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-azul-600" checked={cons.declara_veracidad} onChange={(e) => setCons({ ...cons, declara_veracidad: e.target.checked })} /><span>Declaro que la información de esta solicitud es verdadera. <span className="text-red-700">*</span></span></label>
                  {errores.veracidad && <span className="text-[13px] text-red-700">{errores.veracidad}</span>}
                </div>
              )}

              {errorEnvio && <Alerta>{errorEnvio}</Alerta>}
              {prueba && <Alerta tipo="aviso">{prueba}</Alerta>}
              <div className="mt-auto flex flex-col gap-4 border-t border-azul-50 pt-5">
              <div className="flex items-center justify-between">
                {paso > 0 ? <button type="button" onClick={() => irA(paso - 1)} className="btn border-[1.5px] border-azul-200 text-azul-600">Anterior</button> : <span />}
                {paso < PASOS.length - 1
                  ? <button type="button" onClick={() => irA(paso + 1)} className="btn-primario">Siguiente</button>
                  : <button type="button" onClick={enviar} disabled={enviando} className="btn-dorado">{enviando ? 'Enviando…' : corregir ? 'Reenviar solicitud' : 'Enviar solicitud'}</button>}
              </div>
              <button type="button" onClick={rellenar} className="self-center rounded-xl border-[1.5px] border-dashed border-azul-200 px-4 py-2 text-sm font-semibold text-azul-500 hover:border-azul-400 hover:text-azul-700">
                Rellenar este paso con datos de prueba
              </button>
              </div>
            </>
          )}
        </section>

        <aside className="flex flex-col overflow-hidden rounded-[20px] bg-azul-950 lg:col-span-5">
          <img src="/images/inscripcion/inscripcion-panel.jpg" alt="" className="h-44 w-full object-cover" />
          <div className="flex flex-1 flex-col gap-5 p-7">
            <h2 className="text-xl font-extrabold text-white">Resumen de tu solicitud</h2>
            <dl className="flex flex-col gap-4">
              {resumen.map(([k, v]) => (
                <div key={k} className="flex flex-col gap-1 border-b border-azul-800 pb-4"><dt className="text-xs tracking-wide text-dorado-400">{k}</dt><dd className={`text-[15px] leading-relaxed ${v ? 'text-white' : 'text-azul-400'}`}>{v || 'Sin completar'}</dd></div>
              ))}
            </dl>
            {!enviado && <p className="mt-auto rounded-[14px] bg-azul-800 px-4 py-4 text-sm leading-relaxed text-azul-100">{CONSEJOS[id]}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}

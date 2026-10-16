// Datos de prueba aleatorios (pero válidos) para llenar el formulario de inscripción paso a paso.
// Los correos usan el dominio de demostración: el sistema los registra pero no envía correos reales.
import { CATEGORIAS, SISBEN, ETNIAS, DISCAPACIDADES } from '../data/formulario.js';

const al = (lista) => lista[Math.floor(Math.random() * lista.length)];
const entre = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const digitos = (n) => Array.from({ length: n }, () => entre(0, 9)).join('');
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const NOM_F = ['María José', 'Laura', 'Valentina', 'Camila', 'Daniela', 'Natalia', 'Paula Andrea', 'Carolina', 'Juliana', 'Andrea', 'Luisa Fernanda', 'Ana María', 'Catalina', 'Mónica', 'Ángela', 'Sofía', 'Isabella', 'Mariana', 'Ximena', 'Gloria'];
const NOM_M = ['Juan Carlos', 'Andrés', 'Santiago', 'Sebastián', 'Felipe', 'Camilo', 'Diego', 'Alejandro', 'Jorge', 'Luis Fernando', 'Daniel', 'Mauricio', 'Ricardo', 'Óscar', 'Julián', 'Esteban', 'Nicolás', 'Mateo', 'Samuel', 'Miguel Ángel'];
const APE = ['Rodríguez', 'Gómez', 'González', 'Martínez', 'García', 'López', 'Hernández', 'Sánchez', 'Ramírez', 'Pérez', 'Díaz', 'Moreno', 'Rojas', 'Vargas', 'Torres', 'Castro', 'Ruiz', 'Ortiz', 'Suárez', 'Jiménez', 'Muñoz', 'Romero', 'Herrera', 'Medina', 'Cárdenas', 'Quintero', 'Ospina', 'Mejía', 'Restrepo', 'Salazar', 'Parra', 'Beltrán', 'Patiño', 'Rincón', 'Londoño', 'Garzón', 'Zapata', 'Montoya'];
const LUGARES = [['Bogotá D. C.', 'Bogotá'], ['Bogotá D. C.', 'Bogotá'], ['Bogotá D. C.', 'Bogotá'], ['Cundinamarca', 'Soacha'], ['Cundinamarca', 'Chía'], ['Cundinamarca', 'Zipaquirá'],
  ['Cundinamarca', 'Fusagasugá'], ['Boyacá', 'Tunja'], ['Antioquia', 'Medellín'], ['Valle del Cauca', 'Cali'], ['Santander', 'Bucaramanga'], ['Tolima', 'Ibagué']];
const VEREDAS = ['Vereda Fusca', 'Vereda La Balsa', 'Vereda Fagua', 'Vereda El Charquito', 'Vereda San Jorge', 'Vereda Panamá'];
const EMPRESAS = [['860001022-7', 'Almacenes Éxito S. A.'], ['899999068-1', 'Ecopetrol S. A.'], ['860034313-7', 'Banco Davivienda S. A.'], ['860007336-1', 'Universidad Católica de Colombia'],
  ['900123456-1', 'Constructora Los Cerezos S. A. S.'], ['860002964-4', 'Alpina Productos Alimenticios S. A.']];
const PALABRAS = ['Ceiba', 'Andes', 'Roble', 'Cafe', 'Guadua', 'Condor', 'Laurel', 'Nevado', 'Sabana', 'Cumbre'];

const hoy = new Date();
const nacimiento = (edadMin, edadMax) => {
  const d = new Date(hoy); d.setFullYear(d.getFullYear() - entre(edadMin, edadMax)); d.setDate(d.getDate() - entre(10, 350));
  return d.toISOString().slice(0, 10);
};
const edadDe = (iso) => { const n = new Date(`${iso}T12:00:00`); let e = hoy.getFullYear() - n.getFullYear(); if (hoy < new Date(hoy.getFullYear(), n.getMonth(), n.getDate())) e--; return e; };
const persona = (sexo = al(['femenino', 'masculino'])) => ({ sexo, nombres: al(sexo === 'femenino' ? NOM_F : NOM_M), apellidos: `${al(APE)} ${al(APE)}` });

// Paso 1: datos personales del titular
export function titularDePrueba({ bloqueado, ...actual }) {
  const p = persona();
  const [departamento, ciudad] = al(LUGARES);
  const rural = ciudad !== 'Bogotá' && Math.random() < 0.35;
  const disc = Math.random() < 0.1;
  return {
    ...actual, ...p, tipo_documento: actual.tipo_documento || 'CC', numero_documento: bloqueado && actual.numero_documento ? actual.numero_documento : `10${digitos(8)}`,
    fecha_nacimiento: nacimiento(20, 68), telefono: `3${al(['00', '01', '10', '12', '15', '20', '22', '50'])}${digitos(7)}`, departamento, ciudad,
    direccion: rural ? `${al(VEREDAS)}, finca ${al(['El Recuerdo', 'La Esperanza', 'Villa Rosa', 'Los Pinos'])}` : `${al(['Calle', 'Carrera', 'Diagonal', 'Transversal'])} ${entre(1, 170)} # ${entre(1, 99)}-${entre(1, 99)}`,
    zona: rural ? 'rural' : 'urbana', pertenencia_etnica: al(ETNIAS)[0], tiene_discapacidad: disc ? true : al([false, false, null]), tipo_discapacidad: disc ? al(DISCAPACIDADES)[0] : null,
  };
}

// Paso 2: régimen e IPS
export function afiliacionDePrueba(ips, titular) {
  const ips_id = al(ips).id;
  if (Math.random() < 0.6) {
    const tipo = titular.fecha_nacimiento && edadDe(titular.fecha_nacimiento) >= 62 ? 'pensionado' : al(['dependiente', 'dependiente', 'independiente']);
    const [nit, nombre] = al(EMPRESAS);
    return { regimen: 'contributivo', ips_id, tipo_cotizante: tipo, categoria: al(CATEGORIAS)[0], empleador_nit: tipo === 'dependiente' ? nit : '', empleador_nombre: tipo === 'dependiente' ? nombre : '', grupo_sisben: '' };
  }
  return { regimen: 'subsidiado', ips_id, tipo_cotizante: 'dependiente', categoria: '', empleador_nit: '', empleador_nombre: '', grupo_sisben: al(SISBEN) };
}

// Paso 3: grupo familiar coherente con la edad del titular (pareja, hijos o padres)
export function beneficiariosDePrueba(titular, nuevoBenef) {
  const edadT = titular.fecha_nacimiento ? edadDe(titular.fecha_nacimiento) : 35;
  const apellido = (titular.apellidos || 'Gómez').split(' ')[0];
  const base = () => ({ ...nuevoBenef(), pertenencia_etnica: titular.pertenencia_etnica || 'no_responde' });
  const tipo = edadT < 24 ? al(['padres', 'ninguno']) : al(['pareja_hijos', 'pareja_hijos', 'hijos', 'pareja', 'ninguno']);
  const lista = [];
  if (tipo.startsWith('pareja')) {
    const p = persona(titular.sexo === 'femenino' ? 'masculino' : 'femenino');
    lista.push({ ...base(), ...p, parentesco: al(['conyuge', 'companero_permanente']), tipo_documento: 'CC', numero_documento: `10${digitos(8)}`, fecha_nacimiento: nacimiento(Math.max(19, edadT - 6), edadT + 5) });
  }
  if (tipo.endsWith('hijos') || tipo === 'hijos') {
    for (let i = 0; i < entre(1, 3); i++) {
      const p = persona();
      const fecha = nacimiento(0, Math.max(0, Math.min(24, edadT - 19)));
      const e = edadDe(fecha);
      lista.push({ ...base(), ...p, apellidos: `${apellido} ${al(APE)}`, parentesco: 'hijo', tipo_documento: e < 7 ? 'RC' : e < 18 ? 'TI' : 'CC', numero_documento: `1${digitos(9)}`, fecha_nacimiento: fecha });
    }
  }
  if (tipo === 'padres') {
    [['madre', 'femenino'], ['padre', 'masculino']].slice(0, entre(1, 2)).forEach(([par, sx]) => {
      const p = persona(sx);
      lista.push({ ...base(), ...p, apellidos: par === 'padre' ? `${apellido} ${al(APE)}` : p.apellidos, parentesco: par, tipo_documento: 'CC', numero_documento: digitos(8).replace(/^0/, '4'), fecha_nacimiento: nacimiento(edadT + 20, edadT + 32) });
    });
  }
  return lista;
}

// Paso 4: cuenta (correo de demostración y contraseña válida)
export function cuentaDePrueba(titular) {
  const nombre = sinTildes((titular.nombres || 'prueba').split(' ')[0]);
  const apellido = sinTildes((titular.apellidos || 'libitina').split(' ')[0]);
  const clave = `${al(PALABRAS)}-${entre(1000, 9999)}-${String.fromCharCode(65 + entre(0, 25))}${String.fromCharCode(97 + entre(0, 25))}`;
  return { correo: `${nombre}.${apellido}${entre(10, 999)}@demo.libitina.co`, clave, clave2: clave };
}

// Datos de contacto: reemplázalos por los reales de la universidad.
export const CONTACTO = {
  correo: '[correo universitario]',
  telefono: '[teléfono de la U]',
  horario: '[horario de atención]',
  instagram: 'https://www.instagram.com/ucatolicaco/',
  facebook: 'https://www.facebook.com/ucatolicadecolombia',
};
export const MENU = [
  { texto: 'Afiliados', ruta: '/afiliacion', hijos: [
    { texto: 'Afiliación', ruta: '/afiliacion' }, { texto: 'Plan de beneficios', ruta: '/plan-de-beneficios' },
    { texto: 'Copagos y cuotas', ruta: '/copagos' }, { texto: 'Medicamentos cubiertos', ruta: '/medicamentos' },
    { texto: 'Derechos y deberes', ruta: '/derechos-y-deberes' },
  ] },
  { texto: 'Trámites', ruta: '/tramites/pqrsd', hijos: [
    { texto: 'Estado de afiliación', ruta: '/tramites/estado-de-afiliacion' }, { texto: 'Certificado de afiliación', ruta: '/tramites/certificado' },
    { texto: 'Carné digital', ruta: '/tramites/carne-digital' }, { texto: 'PQRSD', ruta: '/tramites/pqrsd' },
    { texto: 'Agendar cita', ruta: '/tramites/proximamente/cita' }, { texto: 'Resultados de laboratorio', ruta: '/tramites/proximamente/resultados' },
  ] },
  { texto: 'Red de IPS', ruta: '/red-de-ips' },
  { texto: 'Atención al usuario', ruta: '/atencion-al-usuario' },
  { texto: 'Nosotros', ruta: '/nosotros', hijos: [
    { texto: 'Misión, visión y valores', ruta: '/nosotros' }, { texto: 'Historia', ruta: '/nosotros/historia' },
  ] },
];

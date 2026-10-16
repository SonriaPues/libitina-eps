// Datos de contacto. Lo que se muestra es de la EPS ficticia; los enlaces (al hacer clic para
// escribir o llamar) llevan al contacto real del proyecto académico.
export const CONTACTO = {
  correo: 'atencion@libitina.co',
  telefono: 'Línea gratuita 01 8000 000 000',
  horario: 'Lun a vie, 8:00 a. m. a 8:00 p. m.',
  enlaceCorreo: 'mailto:sesguerra34@ucatolica.edu.co',
  enlaceTelefono: 'tel:+573209564051',
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

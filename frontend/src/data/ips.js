// Sedes de ejemplo. En producción vienen del microservicio Red de Prestadores
// (los id coinciden con los datos iniciales de bases/esquemas/07_prestadores.sql).
const id = (n) => `a1b2c3d4-0000-4000-8000-00000000000${n}`;
export const IPS = [
  { id: id(1), nombre: 'Sede Chapinero', ciudad: 'Bogotá', direccion: 'Calle 57 # 9-30', horario: 'Lun a sáb, 6:00 a. m. a 8:00 p. m.', servicios: ['Medicina general', 'Odontología', 'Laboratorio'], imagen: '/images/redips/redips-chapinero.jpg' },
  { id: id(2), nombre: 'Sede Suba', ciudad: 'Bogotá', direccion: 'Avenida Suba # 115-40', horario: 'Lun a vie, 7:00 a. m. a 7:00 p. m.', servicios: ['Medicina general', 'Pediatría', 'Vacunación'], imagen: '/images/redips/redips-suba.jpg' },
  { id: id(3), nombre: 'Sede Kennedy', ciudad: 'Bogotá', direccion: 'Avenida 1 de Mayo # 73-15', horario: 'Todos los días, 24 horas', servicios: ['Medicina general', 'Urgencias', 'Laboratorio'], imagen: '/images/redips/redips-kennedy.jpg' },
  { id: id(4), nombre: 'Sede Usaquén', ciudad: 'Bogotá', direccion: 'Carrera 7 # 127-50', horario: 'Lun a vie, 7:00 a. m. a 6:00 p. m.', servicios: ['Especialistas', 'Odontología'], imagen: '/images/redips/redips-usaquen.jpg' },
  { id: id(5), nombre: 'Sede Soacha', ciudad: 'Soacha', direccion: 'Autopista Sur # 30-12', horario: 'Lun a sáb, 6:00 a. m. a 6:00 p. m.', servicios: ['Medicina general', 'Vacunación', 'Farmacia'], imagen: '/images/redips/redips-soacha.jpg' },
  { id: id(6), nombre: 'Sede Chía', ciudad: 'Chía', direccion: 'Avenida Pradilla # 5-40', horario: 'Lun a vie, 7:00 a. m. a 5:00 p. m.', servicios: ['Medicina general', 'Farmacia'], imagen: '/images/redips/redips-chia.jpg' },
];
export const nombreIps = (ipsId, lista = IPS) => lista.find((i) => String(i.id) === String(ipsId))?.nombre ?? 'Sin asignar';

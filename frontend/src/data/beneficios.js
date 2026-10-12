const cm = 'Aplica cuota moderadora en el régimen contributivo.';
const cp = 'Puede aplicar copago para beneficiarios del contributivo y afiliados del subsidiado.';
export const SERVICIOS = [
  { nombre: 'Medicina general', desc: 'Tu puerta de entrada al sistema: el médico general te valora y, si hace falta, te remite.', items: ['Consulta presencial o por telemedicina', 'Control de enfermedades crónicas', 'Remisión a especialista'], pago: cm },
  { nombre: 'Especialistas', desc: 'Atención por médicos especialistas cuando tu médico general lo ordena.', items: ['Pediatría, ginecología, medicina interna y más', 'Juntas médicas para casos complejos', 'Segunda opinión dentro de la red'], pago: cm },
  { nombre: 'Urgencias', desc: 'Atención inmediata cuando tu vida o tu salud están en riesgo, en cualquier IPS del país.', items: ['Sin autorización previa', 'Atención inicial sin copago', 'Traslado en ambulancia si es necesario'], pago: 'La atención inicial de urgencias no tiene copago.' },
  { nombre: 'Hospitalización y cirugía', desc: 'Procedimientos quirúrgicos y estancia hospitalaria ordenados por tu médico.', items: ['Cirugía programada y de urgencia', 'Unidad de cuidados intensivos', 'Atención domiciliaria al salir'], pago: cp },
  { nombre: 'Laboratorio e imágenes', desc: 'Exámenes para diagnosticar y controlar tu salud.', items: ['Exámenes de sangre y orina', 'Rayos X, ecografías y tomografías', 'Resultados en línea (próximamente)'], pago: cm },
  { nombre: 'Medicamentos', desc: 'Los medicamentos del plan de beneficios formulados por tu médico.', items: ['Entrega en tu punto asignado', 'Medicamentos para enfermedades crónicas', 'Fuera del plan: gestión por MIPRES'], pago: cm },
  { nombre: 'Salud oral', desc: 'Cuidado de tus dientes y encías desde la prevención.', items: ['Consulta odontológica', 'Limpieza y sellantes', 'Tratamientos de conductos y extracciones'], pago: cm },
  { nombre: 'Maternidad', desc: 'Acompañamiento en el embarazo, el parto y los primeros días del bebé.', items: ['Control prenatal', 'Atención del parto', 'Control del recién nacido'], pago: 'El control prenatal y el parto no tienen copago.' },
  { nombre: 'Salud mental', desc: 'Atención para cuidar tu bienestar emocional.', items: ['Consulta con psicología', 'Consulta con psiquiatría', 'Atención de crisis por urgencias'], pago: cm },
  { nombre: 'Promoción y prevención', desc: 'Programas para mantenerte sano antes de enfermarte.', items: ['Vacunación', 'Tamizajes de cáncer y riesgo cardiovascular', 'Controles de crecimiento y desarrollo'], pago: 'No tienen copago.' },
];

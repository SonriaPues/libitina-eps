// Diagnósticos CIE-10 más frecuentes en consulta externa (medicina general y especialidades básicas).
// Sirven para sugerir mientras el médico escribe; el campo acepta cualquier código válido.
export const CIE10 = [
  ['A09', 'Diarrea y gastroenteritis de presunto origen infeccioso'], ['B34.9', 'Infección viral, no especificada'],
  ['B35.1', 'Tiña de las uñas (onicomicosis)'], ['B35.3', 'Tiña del pie'], ['B37.3', 'Candidiasis de la vulva y de la vagina'],
  ['B86', 'Escabiosis'], ['D50.9', 'Anemia por deficiencia de hierro, sin otra especificación'], ['D64.9', 'Anemia, no especificada'],
  ['E03.9', 'Hipotiroidismo, no especificado'], ['E05.9', 'Tirotoxicosis (hipertiroidismo), no especificada'],
  ['E11.9', 'Diabetes mellitus tipo 2 sin complicaciones'], ['E11.6', 'Diabetes mellitus tipo 2 con otras complicaciones'],
  ['E10.9', 'Diabetes mellitus tipo 1 sin complicaciones'], ['E66.9', 'Obesidad, no especificada'], ['E78.0', 'Hipercolesterolemia pura'],
  ['E78.5', 'Hiperlipidemia, no especificada'], ['E55.9', 'Deficiencia de vitamina D, no especificada'], ['E86', 'Depleción del volumen (deshidratación)'],
  ['F32.9', 'Episodio depresivo, no especificado'], ['F33.1', 'Trastorno depresivo recurrente, episodio moderado'],
  ['F41.1', 'Trastorno de ansiedad generalizada'], ['F41.2', 'Trastorno mixto de ansiedad y depresión'], ['F41.9', 'Trastorno de ansiedad, no especificado'],
  ['F43.2', 'Trastornos de adaptación'], ['F43.1', 'Trastorno de estrés postraumático'], ['F51.0', 'Insomnio no orgánico'],
  ['F90.0', 'Perturbación de la actividad y de la atención (TDAH)'], ['F10.1', 'Uso nocivo de alcohol'], ['F17.2', 'Dependencia del tabaco'],
  ['G43.9', 'Migraña, no especificada'], ['G44.2', 'Cefalea debida a tensión'], ['G47.0', 'Trastornos del inicio y del mantenimiento del sueño'],
  ['G56.0', 'Síndrome del túnel carpiano'], ['G40.9', 'Epilepsia, tipo no especificado'],
  ['H10.9', 'Conjuntivitis, no especificada'], ['H10.1', 'Conjuntivitis atópica aguda'], ['H52.1', 'Miopía'], ['H52.4', 'Presbicia'],
  ['H52.2', 'Astigmatismo'], ['H40.9', 'Glaucoma, no especificado'], ['H25.9', 'Catarata senil, no especificada'], ['H04.1', 'Síndrome de ojo seco'],
  ['H60.9', 'Otitis externa, sin otra especificación'], ['H66.9', 'Otitis media, no especificada'], ['H61.2', 'Cerumen impactado'],
  ['I10', 'Hipertensión esencial (primaria)'], ['I11.9', 'Enfermedad cardíaca hipertensiva sin insuficiencia cardíaca'],
  ['I20.9', 'Angina de pecho, no especificada'], ['I25.1', 'Enfermedad aterosclerótica del corazón'], ['I48', 'Fibrilación y aleteo auricular'],
  ['I49.9', 'Arritmia cardíaca, no especificada'], ['I50.9', 'Insuficiencia cardíaca, no especificada'], ['I83.9', 'Venas varicosas de los miembros inferiores'],
  ['I84.9', 'Hemorroides, sin otra especificación'], ['I95.9', 'Hipotensión, no especificada'],
  ['J00', 'Rinofaringitis aguda (resfriado común)'], ['J01.9', 'Sinusitis aguda, no especificada'], ['J02.9', 'Faringitis aguda, no especificada'],
  ['J03.9', 'Amigdalitis aguda, no especificada'], ['J06.9', 'Infección aguda de las vías respiratorias superiores'], ['J11.1', 'Influenza con otras manifestaciones respiratorias'],
  ['J18.9', 'Neumonía, no especificada'], ['J20.9', 'Bronquitis aguda, no especificada'], ['J30.4', 'Rinitis alérgica, no especificada'],
  ['J32.9', 'Sinusitis crónica, no especificada'], ['J44.9', 'Enfermedad pulmonar obstructiva crónica (EPOC)'], ['J45.9', 'Asma, no especificada'],
  ['K02.9', 'Caries dental, no especificada'], ['K04.0', 'Pulpitis'], ['K05.1', 'Gingivitis crónica'], ['K05.3', 'Periodontitis crónica'],
  ['K08.1', 'Pérdida de dientes debida a accidente, extracción o enfermedad periodontal'], ['K07.6', 'Trastornos de la articulación temporomaxilar'],
  ['K21.9', 'Enfermedad del reflujo gastroesofágico sin esofagitis'], ['K29.7', 'Gastritis, no especificada'], ['K30', 'Dispepsia'],
  ['K58.9', 'Síndrome del colon irritable sin diarrea'], ['K59.0', 'Constipación'], ['K80.2', 'Cálculo de la vesícula biliar sin colecistitis'],
  ['K76.0', 'Hígado graso, no clasificado en otra parte'], ['K35.8', 'Apendicitis aguda, otras y las no especificadas'],
  ['L20.9', 'Dermatitis atópica, no especificada'], ['L21.9', 'Dermatitis seborreica, no especificada'], ['L23.9', 'Dermatitis alérgica de contacto'],
  ['L30.9', 'Dermatitis, no especificada'], ['L40.0', 'Psoriasis vulgar'], ['L50.9', 'Urticaria, no especificada'], ['L70.0', 'Acné vulgar'],
  ['L71.9', 'Rosácea, no especificada'], ['L60.0', 'Uña encarnada'], ['L08.9', 'Infección local de la piel y del tejido subcutáneo'],
  ['L81.4', 'Otras hiperpigmentaciones por melanina (melasma)'], ['L65.9', 'Pérdida no cicatricial del pelo, no especificada'],
  ['M10.9', 'Gota, no especificada'], ['M15.9', 'Poliartrosis, no especificada'], ['M17.9', 'Gonartrosis (artrosis de rodilla), no especificada'],
  ['M16.9', 'Coxartrosis (artrosis de cadera), no especificada'], ['M19.9', 'Artrosis, no especificada'], ['M25.5', 'Dolor en articulación'],
  ['M54.2', 'Cervicalgia'], ['M54.4', 'Lumbago con ciática'], ['M54.5', 'Lumbago no especificado'], ['M54.9', 'Dorsalgia, no especificada'],
  ['M75.1', 'Síndrome del manguito rotador'], ['M77.1', 'Epicondilitis lateral'], ['M79.1', 'Mialgia'], ['M79.7', 'Fibromialgia'],
  ['M72.2', 'Fascitis plantar'], ['M81.0', 'Osteoporosis postmenopáusica'], ['M06.9', 'Artritis reumatoide, no especificada'],
  ['N18.9', 'Enfermedad renal crónica, no especificada'], ['N20.0', 'Cálculo del riñón'], ['N30.0', 'Cistitis aguda'],
  ['N39.0', 'Infección de vías urinarias, sitio no especificado'], ['N40', 'Hiperplasia de la próstata'], ['N76.0', 'Vaginitis aguda'],
  ['N92.0', 'Menstruación excesiva y frecuente con ciclo regular'], ['N94.6', 'Dismenorrea, no especificada'], ['N95.1', 'Estados menopáusicos y climatéricos'],
  ['N97.9', 'Infertilidad femenina, no especificada'], ['N60.1', 'Mastopatía quística difusa'], ['E28.2', 'Síndrome de ovario poliquístico'],
  ['O26.9', 'Complicación relacionada con el embarazo, no especificada'], ['O21.0', 'Hiperémesis gravídica leve'], ['Z34.9', 'Supervisión de embarazo normal'],
  ['R05', 'Tos'], ['R07.4', 'Dolor en el pecho, no especificado'], ['R10.4', 'Otros dolores abdominales y los no especificados'],
  ['R11', 'Náusea y vómito'], ['R42', 'Mareo y desvanecimiento'], ['R50.9', 'Fiebre, no especificada'], ['R51', 'Cefalea'],
  ['R53', 'Malestar y fatiga'], ['R60.0', 'Edema localizado'], ['R63.4', 'Pérdida anormal de peso'], ['R73.0', 'Anormalidades en la prueba de tolerancia a la glucosa'],
  ['S06.0', 'Conmoción cerebral'], ['S93.4', 'Esguince y torcedura del tobillo'], ['S83.6', 'Esguince de la rodilla'],
  ['S62.6', 'Fractura de otro dedo de la mano'], ['S52.5', 'Fractura de la epífisis inferior del radio'], ['S13.4', 'Esguince de la columna cervical'],
  ['T14.9', 'Traumatismo, no especificado'], ['T78.4', 'Alergia no especificada'], ['W57', 'Mordedura o picadura de insecto'],
  ['Z00.0', 'Examen médico general'], ['Z00.1', 'Control de salud de rutina del niño'], ['Z01.2', 'Examen odontológico'],
  ['Z01.0', 'Examen de ojos y de la visión'], ['Z01.4', 'Examen ginecológico general'], ['Z23', 'Necesidad de inmunización'],
  ['Z30.0', 'Consejo y asesoramiento general sobre la anticoncepción'], ['Z71.3', 'Consulta para instrucción y vigilancia de la dieta'],
  ['Z76.0', 'Consulta para repetición de receta'], ['Z09', 'Examen de seguimiento consecutivo a tratamiento'],
];

const normal = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Busca por código ("I10", "j06") o por palabras del nombre ("hiper", "dolor rodilla").
export function buscarCie10(texto, max = 8) {
  const t = normal(texto.trim());
  if (t.length < 2) return [];
  const palabras = t.split(/\s+/);
  const conCodigo = CIE10.filter(([c]) => normal(c).replace('.', '').startsWith(t.replace('.', '')));
  const conNombre = CIE10.filter(([c, n]) => !conCodigo.some((x) => x[0] === c) && palabras.every((p) => normal(n).includes(p)));
  return [...conCodigo, ...conNombre].slice(0, max);
}

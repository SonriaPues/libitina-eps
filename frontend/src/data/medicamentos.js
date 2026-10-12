// Listado de ejemplo. La cobertura oficial la define el Ministerio de Salud.
export const MEDICAMENTOS = [
  ['Acetaminofén', '500 mg · tableta', 'Dolor y fiebre', 'PBS'], ['Ibuprofeno', '400 mg · tableta', 'Dolor y fiebre', 'PBS'],
  ['Amoxicilina', '500 mg · cápsula', 'Antibióticos', 'PBS'], ['Losartán', '50 mg · tableta', 'Cardiovascular', 'PBS'],
  ['Atorvastatina', '20 mg · tableta', 'Cardiovascular', 'PBS'], ['Metformina', '850 mg · tableta', 'Diabetes', 'PBS'],
  ['Insulina NPH', '100 UI/mL · vial', 'Diabetes', 'PBS'], ['Salbutamol', '100 mcg · inhalador', 'Respiratorio', 'PBS'],
  ['Omeprazol', '20 mg · cápsula', 'Digestivo', 'PBS'], ['Levotiroxina', '50 mcg · tableta', 'Hormonas', 'PBS'],
  ['Adalimumab', '40 mg · jeringa prellenada', 'Biológicos', 'MIPRES'],
].map(([nombre, presentacion, grupo, cobertura]) => ({ nombre, presentacion, grupo, cobertura }));
export const GRUPOS = ['Dolor y fiebre', 'Antibióticos', 'Cardiovascular', 'Diabetes', 'Respiratorio', 'Digestivo', 'Hormonas', 'Biológicos'];

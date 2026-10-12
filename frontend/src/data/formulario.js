// Opciones del Formulario Único de Afiliación.
export const DEPARTAMENTOS = ['Amazonas', 'Antioquia', 'Arauca', 'Atlántico', 'Bogotá D. C.', 'Bolívar', 'Boyacá', 'Caldas', 'Caquetá', 'Casanare', 'Cauca', 'Cesar', 'Chocó', 'Córdoba', 'Cundinamarca', 'Guainía', 'Guaviare', 'Huila', 'La Guajira', 'Magdalena', 'Meta', 'Nariño', 'Norte de Santander', 'Putumayo', 'Quindío', 'Risaralda', 'San Andrés y Providencia', 'Santander', 'Sucre', 'Tolima', 'Valle del Cauca', 'Vaupés', 'Vichada'];
export const SEXOS = [['femenino', 'Femenino'], ['masculino', 'Masculino'], ['otro', 'Otro']];
export const ETNIAS = [['no_responde', 'Prefiero no responder'], ['ninguna', 'Ninguna'], ['indigena', 'Indígena'], ['negro_afrocolombiano', 'Negro, mulato o afrocolombiano'], ['raizal', 'Raizal del archipiélago'], ['palenquero', 'Palenquero de San Basilio'], ['rom', 'Gitano (Rrom)']];
export const DISCAPACIDADES = [['fisica', 'Física'], ['visual', 'Visual'], ['auditiva', 'Auditiva'], ['intelectual', 'Intelectual'], ['psicosocial', 'Psicosocial'], ['sordoceguera', 'Sordoceguera'], ['multiple', 'Múltiple']];
export const CATEGORIAS = [['A', 'Menos de 2 salarios mínimos'], ['B', 'Entre 2 y 5 salarios mínimos'], ['C', 'Más de 5 salarios mínimos']];
export const SISBEN = [...[1, 2, 3, 4, 5].map((n) => `A${n}`), ...[1, 2, 3, 4, 5, 6, 7].map((n) => `B${n}`)];

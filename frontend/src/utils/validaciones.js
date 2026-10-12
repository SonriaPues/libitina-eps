export const correoValido = (c) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c);
export const claveSegura = (c) => c.length >= 8 && /[A-Z]/.test(c) && /\d/.test(c);
export const soloNumeros = (v) => v.replace(/\D/g, '');

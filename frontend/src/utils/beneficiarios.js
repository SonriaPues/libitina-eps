// Reglas de beneficiarios (Decreto 780 de 2016). El backend las vuelve a validar.
export function edad(fechaIso) {
  if (!fechaIso) return null;
  const n = new Date(fechaIso), h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  const m = h.getMonth() - n.getMonth();
  if (m < 0 || (m === 0 && h.getDate() < n.getDate())) e--;
  return e;
}

const PAREJA = ['conyuge', 'companero_permanente'];

// Devuelve { indice: mensaje } con los errores encontrados.
export function validarBeneficiarios(lista) {
  const errores = {};
  const parejas = lista.filter((b) => PAREJA.includes(b.parentesco)).length;
  const hijos = lista.filter((b) => b.parentesco === 'hijo').length;
  lista.forEach((b, i) => {
    if (!b.parentesco || !b.nombres.trim() || !b.apellidos.trim() || !b.numero_documento.trim() || !b.fecha_nacimiento || !b.sexo) {
      errores[i] = 'Completa todos los datos de este beneficiario.';
    } else if (PAREJA.includes(b.parentesco) && parejas > 1) {
      errores[i] = 'Solo puedes afiliar a un cónyuge o compañero permanente.';
    } else if (b.parentesco === 'hijo' && edad(b.fecha_nacimiento) >= 25 && !b.incapacidad_permanente) {
      errores[i] = 'Los hijos de 25 años o más solo pueden ser beneficiarios si tienen incapacidad permanente.';
    } else if (['padre', 'madre'].includes(b.parentesco) && (parejas > 0 || hijos > 0)) {
      errores[i] = 'Los padres solo pueden ser beneficiarios si no tienes cónyuge ni hijos afiliados.';
    }
  });
  return errores;
}

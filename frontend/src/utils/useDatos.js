import { useCallback, useEffect, useRef, useState } from 'react';

// Carga datos al montar la página y permite recargarlos. Devuelve { datos, error, cargando, recargar }.
// Si cambian los filtros (deps) mientras una respuesta viene en camino, esa respuesta vieja se descarta:
// así una sede lenta no reemplaza a la que el usuario eligió después.
export function useDatos(cargar, deps = []) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const turno = useRef(0);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recargar = useCallback(() => {
    const mio = ++turno.current;
    setCargando(true);
    return cargar()
      .then((d) => { if (mio === turno.current) { setDatos(d); setError(''); } return d; })
      .catch((e) => { if (mio === turno.current) setError(e.message); })
      .finally(() => { if (mio === turno.current) setCargando(false); });
  }, deps);
  useEffect(() => { recargar(); }, [recargar]);
  return { datos, error, cargando, recargar, setDatos };
}

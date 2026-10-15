import { useCallback, useEffect, useState } from 'react';

// Carga datos al montar la página y permite recargarlos. Devuelve { datos, error, cargando, recargar }.
export function useDatos(cargar, deps = []) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recargar = useCallback(() => {
    setCargando(true);
    return cargar().then((d) => { setDatos(d); setError(''); return d; }).catch((e) => setError(e.message)).finally(() => setCargando(false));
  }, deps);
  useEffect(() => { recargar(); }, [recargar]);
  return { datos, error, cargando, recargar, setDatos };
}

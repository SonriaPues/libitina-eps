import { Link } from 'react-router-dom';

export default function NoEncontrada() {
  return (
    <section className="contenedor flex flex-col items-center gap-5 py-28 text-center">
      <span className="font-display text-7xl font-extrabold text-dorado-400">404</span>
      <h1 className="text-3xl font-extrabold">Esta página no existe</h1>
      <p className="max-w-md text-azul-700">Puede que el enlace esté mal escrito o que la página haya cambiado de lugar.</p>
      <Link to="/" className="btn-primario">Volver al inicio</Link>
    </section>
  );
}

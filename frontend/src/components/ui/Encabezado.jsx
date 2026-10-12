import { Link } from 'react-router-dom';

// Encabezado oscuro de las páginas internas, con migas de pan.
export default function Encabezado({ migas = [], titulo, texto, children }) {
  return (
    <section className="bg-azul-950 px-5 pb-14 pt-12 md:px-10">
      <div className="mx-auto flex max-w-sitio flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-col gap-3.5">
          {migas.length > 0 && (
            <nav aria-label="Ruta" className="text-[13px] text-azul-200">
              {migas.map((m, i) => (
                <span key={m.texto}>
                  {m.ruta ? <Link to={m.ruta} className="hover:text-white">{m.texto}</Link> : m.texto}
                  {i < migas.length - 1 && <span className="px-1.5">›</span>}
                </span>
              ))}
            </nav>
          )}
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-white md:text-[44px]">{titulo}</h1>
          {texto && <p className="max-w-[680px] text-[17px] leading-relaxed text-azul-200">{texto}</p>}
        </div>
        {children}
      </div>
    </section>
  );
}

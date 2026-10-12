// Imagen que cubre su contenedor sin deformarse.
export default function Foto({ src, alt = '', className = '', posicion = 'center' }) {
  return <img src={src} alt={alt} loading="lazy" className={`h-full w-full object-cover ${className}`} style={{ objectPosition: posicion }} />;
}

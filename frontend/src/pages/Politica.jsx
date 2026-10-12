import Encabezado from '../components/ui/Encabezado.jsx';
import { CONTACTO } from '../data/sitio.js';

const SECCIONES = [
  ['responsable', 'Responsable del tratamiento', ['Libitina EPS, proyecto académico de la Universidad Católica de Colombia, es responsable del tratamiento de los datos personales que recolecta a través de este sitio y de sus canales de atención.', `Correo de contacto para protección de datos: ${CONTACTO.correo}. Teléfono: ${CONTACTO.telefono}.`]],
  ['datos', 'Datos que recolectamos', ['Datos de identificación y contacto: nombres, tipo y número de documento, fecha de nacimiento, dirección, celular y correo electrónico.', 'Datos de afiliación: régimen, IPS asignada y datos de tus beneficiarios.', 'Datos de salud, cuando sea necesario para prestarte los servicios. Estos son datos sensibles y reciben una protección especial.']],
  ['finalidades', 'Finalidades', ['Gestionar tu afiliación y la de tu grupo familiar.', 'Crear y administrar tu cuenta en el portal del afiliado.', 'Enviarte notificaciones sobre el estado de tus solicitudes y trámites.', 'Atender tus peticiones, quejas, reclamos, sugerencias y denuncias.', 'Cumplir las obligaciones legales del sistema de salud.']],
  ['sensibles', 'Datos sensibles y de menores', ['Solo tratamos datos de salud con tu autorización previa, expresa e informada, y no estás obligado a entregarlos salvo cuando la ley lo exija.', 'Los datos de niños, niñas y adolescentes se tratan respetando su interés superior y sus derechos fundamentales.']],
  ['derechos', 'Tus derechos como titular', ['Conocer, actualizar y rectificar tus datos personales.', 'Solicitar prueba de la autorización que nos diste.', 'Ser informado sobre el uso que les damos a tus datos.', 'Revocar la autorización o pedir que se supriman tus datos, cuando no exista un deber legal de conservarlos.', 'Presentar quejas ante la Superintendencia de Industria y Comercio.']],
  ['procedimiento', 'Consultas y reclamos', ['Las consultas se responden en un plazo máximo de diez días hábiles contados desde su recibo.', 'Los reclamos se atienden en un plazo máximo de quince días hábiles contados desde el día siguiente a su recibo.', 'Puedes presentarlos por correo o desde la página de PQRSD.']],
  ['seguridad', 'Seguridad de la información', ['Aplicamos medidas técnicas y administrativas para proteger tus datos: contraseñas cifradas, acceso por roles y registro de quién consulta la información.']],
  ['vigencia', 'Vigencia', ['Esta política rige desde el 26 de septiembre de 2026. Los datos se conservan mientras sean necesarios para las finalidades descritas o mientras exista un deber legal de conservarlos.']],
];

export default function Politica() {
  return (
    <div className="bg-fondo">
      <Encabezado migas={[{ texto: 'Legal' }, { texto: 'Política de tratamiento de datos' }]} titulo="Política de tratamiento de datos personales" texto="Cómo recolectamos, usamos y protegemos tus datos, conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013." />
      <div className="contenedor grid items-start gap-12 py-12 lg:grid-cols-12">
        <nav aria-label="Contenido" className="tarjeta flex flex-col gap-0.5 p-4 lg:sticky lg:top-24 lg:col-span-3">
          <span className="px-3.5 pb-2.5 pt-1.5 text-xs tracking-wide text-dorado-600">Contenido</span>
          {SECCIONES.map(([id, t]) => <a key={id} href={`#${id}`} className="rounded-[10px] px-3.5 py-2.5 text-sm text-azul-700 hover:bg-azul-50">{t}</a>)}
          <button type="button" onClick={() => window.print()} className="btn-primario mt-2.5 py-3 text-sm">Imprimir o guardar en PDF</button>
        </nav>
        <article className="tarjeta flex flex-col gap-8 p-7 md:p-12 lg:col-span-9">
          {SECCIONES.map(([id, t, ps], n) => (
            <section key={id} id={id} className="flex scroll-mt-24 flex-col gap-3 border-b border-azul-50 pb-8">
              <h2 className="flex items-baseline gap-3.5 text-2xl font-extrabold"><span className="text-dorado-500">{String(n + 1).padStart(2, '0')}</span>{t}</h2>
              <ul className="flex list-disc flex-col gap-2 pl-6 text-base leading-[1.75] text-azul-700">{ps.map((p) => <li key={p}>{p}</li>)}</ul>
            </section>
          ))}
          <p className="text-sm text-azul-500">Libitina EPS es un proyecto académico. Esta política es un modelo con fines demostrativos.</p>
        </article>
      </div>
    </div>
  );
}

import { Link } from 'react-router-dom';
import Encabezado from '../components/ui/Encabezado.jsx';
import { Monograma } from '../components/ui/Marca.jsx';

const USOS = ['Trámites laborales y de contratación', 'Créditos y trámites bancarios', 'Matrículas en colegios y universidades', 'Visas y trámites ante otras entidades'];
const PASOS = [['Inicia sesión en tu portal', 'Con el correo y la contraseña de tu inscripción.'], ['Ve a Certificados', 'Incluye a tu grupo familiar, tu régimen y tu IPS.'], ['Descárgalo en PDF', 'Con código QR de verificación, válido por 30 días.']];

export default function Certificado() {
  return (
    <>
      <Encabezado migas={[{ texto: 'Trámites' }, { texto: 'Certificado de afiliación' }]} titulo="Certificado de afiliación" texto="Descárgalo desde tu portal en segundos. Tiene un código de verificación para que cualquier entidad compruebe que es auténtico." />
      <section className="contenedor grid items-start gap-14 py-16 lg:grid-cols-2">
        <div className="flex flex-col gap-9">
          <div className="flex flex-col gap-3.5"><h2 className="text-2xl font-extrabold">Para qué sirve</h2>
            <ul className="grid gap-3 sm:grid-cols-2">{USOS.map((u) => <li key={u} className="tarjeta p-[18px] text-[15px] leading-snug">{u}</li>)}</ul></div>
          <div className="flex flex-col gap-4"><h2 className="text-2xl font-extrabold">Cómo descargarlo</h2>
            <ol className="flex flex-col gap-4">{PASOS.map(([t, d], i) => (
              <li key={t} className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-azul-600 font-bold text-white">{i + 1}</span><span className="flex flex-col gap-0.5 pt-0.5"><span className="font-display text-[17px] font-bold">{t}</span><span className="text-[15px] text-azul-700">{d}</span></span></li>
            ))}</ol></div>
          <div className="flex flex-wrap gap-3"><Link to="/portal/certificados" className="btn-primario px-7 py-4 text-base">Generar mi certificado</Link><Link to="/tramites/verificar-certificado" className="btn-borde px-7 py-4 text-base">Verificar un certificado</Link></div>
          <p className="text-sm leading-relaxed text-azul-500">El certificado solo está disponible cuando tu afiliación está activa. Si está pendiente, lo podrás descargar cuando sea aprobada.</p>
        </div>
        <div className="flex justify-center rounded-[28px] bg-azul-50 p-6 md:p-10" aria-label="Vista previa de ejemplo del certificado">
          <div className="flex w-full max-w-[470px] flex-col gap-5 rounded-md bg-white px-8 py-10 shadow-2xl shadow-azul-950/15">
            <div className="flex items-center justify-between border-b-2 border-dorado-400 pb-4">
              <span className="flex items-center gap-2.5"><Monograma alto={40} /><span className="font-display text-[17px] font-extrabold text-marca">LIBITINA <span className="text-dorado-500">EPS</span></span></span>
              <span className="text-[11px] text-azul-400">Ejemplo</span>
            </div>
            <span className="text-center font-display text-lg font-extrabold tracking-wide">Certificado de afiliación</span>
            <p className="text-justify text-[13px] leading-[1.75] text-azul-800">Libitina EPS certifica que <strong>LAURA CAMILA RODRÍGUEZ PÉREZ</strong>, identificada con cédula de ciudadanía n.º 1012345678, se encuentra afiliada en calidad de <strong>cotizante</strong> al régimen <strong>contributivo</strong>, en estado <strong>ACTIVO</strong>, con IPS asignada Sede Chapinero.</p>
            <div className="flex flex-col gap-1.5 text-xs text-azul-800"><span className="text-[11px] tracking-wide text-dorado-600">Grupo familiar</span><span>Andrés Rodríguez · Cónyuge · CC 80123456</span><span>Tomás Rodríguez · Hijo · RC 1098765432</span></div>
            <div className="flex items-end justify-between border-t border-azul-50 pt-4"><span className="flex flex-col gap-1"><span className="text-[10px] tracking-wide text-azul-400">Código de verificación</span><span className="font-mono text-sm font-bold">LIB-7F3K-92QX</span></span><span className="flex h-16 w-16 items-center justify-center rounded-md border-[1.5px] border-dashed border-azul-200 text-[10px] text-azul-400">QR</span></div>
          </div>
        </div>
      </section>
    </>
  );
}

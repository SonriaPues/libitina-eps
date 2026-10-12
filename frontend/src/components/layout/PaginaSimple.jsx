import { Marca } from '../ui/Marca.jsx';

// Tarjeta centrada sobre fondo azul noche, para flujos cortos (verificar correo, restablecer).
export default function PaginaSimple({ children }) {
  return (
    <div className="flex min-h-screen flex-col bg-azul-950 px-5 py-8 md:px-16">
      <Marca alto={40} claro conPlaca texto="text-xl" />
      <div className="flex flex-1 items-center justify-center py-10">
        <div className="flex w-full max-w-[460px] flex-col gap-5 rounded-3xl bg-white p-8 md:p-10">{children}</div>
      </div>
    </div>
  );
}

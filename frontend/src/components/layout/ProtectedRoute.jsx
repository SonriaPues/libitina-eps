import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export const INICIO_POR_ROL = { admin: '/admin', doctor: '/doctor', afiliado: '/portal' };

// Solo deja pasar a usuarios con sesión y con el rol indicado.
export default function ProtectedRoute({ rol, children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/iniciar-sesion" replace />;
  if (rol && usuario.rol !== rol) return <Navigate to={INICIO_POR_ROL[usuario.rol] ?? '/'} replace />;
  return children;
}

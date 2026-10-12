import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Solo deja pasar a usuarios con sesión y con el rol indicado.
export default function ProtectedRoute({ rol, children }) {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/iniciar-sesion" replace />;
  if (rol && usuario.rol !== rol) return <Navigate to={usuario.rol === 'admin' ? '/admin' : '/portal'} replace />;
  return children;
}

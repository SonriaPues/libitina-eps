import { createContext, useContext, useEffect, useState } from 'react';
import { authApi } from '../api/servicios.js';
import { guardarSesion, borrarSesion } from '../api/client.js';

const AuthContext = createContext(null);
const leerUsuario = () => { try { return JSON.parse(localStorage.getItem('libitina_usuario')); } catch { return null; } };

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(leerUsuario);

  // Si el refresh token también venció, el cliente HTTP avisa y se cierra la sesión.
  useEffect(() => {
    const expirar = () => setUsuario(null);
    window.addEventListener('libitina:sesion-expirada', expirar);
    return () => window.removeEventListener('libitina:sesion-expirada', expirar);
  }, []);

  async function iniciarSesion(correo, clave) {
    const s = await authApi.login({ correo, clave });
    guardarSesion(s);
    setUsuario(s.usuario);
    return s.usuario;
  }

  async function cerrarSesion() {
    await authApi.logout();
    borrarSesion();
    setUsuario(null);
  }

  return <AuthContext.Provider value={{ usuario, iniciarSesion, cerrarSesion }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

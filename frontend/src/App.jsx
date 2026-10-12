import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import PublicLayout from './components/layout/PublicLayout.jsx';
import ProtectedRoute from './components/layout/ProtectedRoute.jsx';
import Inicio from './pages/Inicio.jsx';
import Afiliacion from './pages/Afiliacion.jsx';
import Beneficios from './pages/Beneficios.jsx';
import Copagos from './pages/Copagos.jsx';
import Medicamentos from './pages/Medicamentos.jsx';
import Derechos from './pages/Derechos.jsx';
import Inscripcion from './pages/Inscripcion.jsx';
import ConsultaEstado from './pages/ConsultaEstado.jsx';
import Certificado from './pages/Certificado.jsx';
import Carne from './pages/Carne.jsx';
import Pqrsd from './pages/Pqrsd.jsx';
import Proximamente from './pages/Proximamente.jsx';
import RedIps from './pages/RedIps.jsx';
import Atencion from './pages/Atencion.jsx';
import Nosotros from './pages/Nosotros.jsx';
import Historia from './pages/Historia.jsx';
import Politica from './pages/Politica.jsx';
import Login from './pages/Login.jsx';
import NoEncontrada from './pages/NoEncontrada.jsx';
import VerificarCorreo from './pages/VerificarCorreo.jsx';
import Restablecer from './pages/Restablecer.jsx';
import PortalAfiliado from './pages/portal/PortalAfiliado.jsx';
import PanelAdmin from './pages/admin/PanelAdmin.jsx';

function SubirAlCambiarRuta() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

export default function App() {
  return (
    <>
      <SubirAlCambiarRuta />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route path="/" element={<Inicio />} />
          <Route path="/afiliacion" element={<Afiliacion />} />
          <Route path="/plan-de-beneficios" element={<Beneficios />} />
          <Route path="/copagos" element={<Copagos />} />
          <Route path="/medicamentos" element={<Medicamentos />} />
          <Route path="/derechos-y-deberes" element={<Derechos />} />
          <Route path="/tramites/estado-de-afiliacion" element={<ConsultaEstado />} />
          <Route path="/tramites/certificado" element={<Certificado />} />
          <Route path="/tramites/carne-digital" element={<Carne />} />
          <Route path="/tramites/pqrsd" element={<Pqrsd />} />
          <Route path="/tramites/proximamente/:servicio" element={<Proximamente />} />
          <Route path="/red-de-ips" element={<RedIps />} />
          <Route path="/atencion-al-usuario" element={<Atencion />} />
          <Route path="/nosotros" element={<Nosotros />} />
          <Route path="/nosotros/historia" element={<Historia />} />
          <Route path="/politica-de-datos" element={<Politica />} />
          <Route path="*" element={<NoEncontrada />} />
        </Route>
        <Route path="/inscripcion" element={<Inscripcion />} />
        <Route path="/iniciar-sesion" element={<Login />} />
        <Route path="/verificar-correo" element={<VerificarCorreo />} />
        <Route path="/restablecer" element={<Restablecer />} />
        <Route path="/portal" element={<ProtectedRoute rol="afiliado"><PortalAfiliado /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute rol="admin"><PanelAdmin /></ProtectedRoute>} />
      </Routes>
    </>
  );
}

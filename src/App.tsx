import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './layouts/Layout';

import Home from './pages/Home';
import Login from './pages/Login';
import Registro from './pages/Registro'; 
import CompletarPerfil from './pages/CompletarPerfil'; 
import Dashboard from './pages/Dashboard';
import Jugadores from './pages/Jugadores';
import Matricula from './pages/Matricula';
import Torneos from './pages/Torneos';
import NuevoTorneo from './pages/NuevoTorneo';
import Partidos from './pages/Partidos';
import SaaSAdmin from './pages/SaaSAdmin';
import CambiarPassword from './pages/CambiarPassword';
import Terminos from './pages/Terminos'; 

const queryClient = new QueryClient();

// ====================================================================
// 🛡️ GUARDIÁN DE RUTAS PRIVADAS (Solo usuarios autenticados)
// ====================================================================
const ProtectedRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D] font-bold">
        Cargando sistema...
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (user.requiere_cambio_password) return <Navigate to="/cambiar-password" replace />;
  if (!user.academia_id && user.rol !== 'superadmin') return <Navigate to="/completar-perfil" replace />;

  return <Layout />;
};

// ====================================================================
// 🚪 GUARDIÁN DE RUTAS PÚBLICAS (Evita que usuarios logueados vean el Home o Login)
// ====================================================================
const PublicRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D] font-bold">
        Comprobando sesión...
      </div>
    );
  }

  // 🔥 REDIRECCIÓN INTELIGENTE Y FLUIDA
  if (user) {
    if (user.rol === 'superadmin') return <Navigate to="/admin" replace />;
    if (user.requiere_cambio_password) return <Navigate to="/cambiar-password" replace />;
    if (!user.academia_id) return <Navigate to="/completar-perfil" replace />;
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            
            {/* ======================================================= */}
            {/* 🚪 RUTAS PÚBLICAS (Home, Login, Registro)               */}
            {/* ======================================================= */}
            <Route element={<PublicRoutes />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} /> 
            </Route>
            
            {/* Rutas sueltas de configuración intermedia */}
            <Route path="/completar-perfil" element={<CompletarPerfil />} /> 
            <Route path="/cambiar-password" element={<CambiarPassword />} />
            
            {/* ======================================================= */}
            {/* 🛡️ RUTAS PRIVADAS (Dashboard y sistema)                 */}
            {/* ======================================================= */}
            <Route element={<ProtectedRoutes />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jugadores" element={<Jugadores />} />
              <Route path="/matricula" element={<Matricula />} />
              <Route path="/terminos" element={<Terminos />} />
              
              <Route path="/torneos" element={<Torneos />} />
              <Route path="/nuevo-torneo" element={<NuevoTorneo />} />
              <Route path="/partidos" element={<Partidos />} />
              
              <Route path="/admin" element={<SaaSAdmin />} />
            </Route>

            {/* Ruta de Rescate (404) */}
            <Route path="*" element={<Navigate to="/" replace />} />
            
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;

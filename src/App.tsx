import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 1. Contexto de Autenticación
import { AuthProvider, useAuth } from './contexts/AuthContext'; // 🔥 Asegúrate de exportar useAuth desde tu AuthContext

// 2. Menú Lateral (Layout)
import Layout from './layouts/Layout';

// 3. Páginas
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

// Inicialización de React Query
const queryClient = new QueryClient();

// ====================================================================
// 🛡️ EL GUARDIÁN DE RUTAS PRIVADAS (Route Guard)
// ====================================================================
const ProtectedRoutes = () => {
  // Obtenemos el usuario actual desde el contexto
  const { user, loading } = useAuth();

  // 1. Mientras verifica la sesión, mostramos una pantalla de carga
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D]">
        Cargando sistema...
      </div>
    );
  }

  // 2. Si NO hay usuario, lo pateamos al Login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si requiere cambio de clave obligatorio (por seguridad)
  if (user.requiere_cambio_password) {
    return <Navigate to="/cambiar-password" replace />;
  }

  // 4. 🔥 LA MAGIA DEL ONBOARDING: 
  // Si está logueado, pero NO tiene academia_id y NO es el superadmin, 
  // lo obligamos a ir a CompletarPerfil.
  if (!user.academia_id && user.rol !== 'superadmin') {
    return <Navigate to="/completar-perfil" replace />;
  }

  // 5. Si pasó todas las pruebas de seguridad, renderizamos el Layout con las páginas
  return <Layout />;
};


const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            
            {/* Página de Inicio Principal (Landing Page) */}
            <Route path="/" element={<Home />} />
            
            {/* Rutas Públicas y de Configuración Inicial */}
            <Route path="/login" element={<Login />} />
            <Route path="/registro" element={<Registro />} /> 
            
            {/* ⚠️ Estas rutas deben ser accesibles aunque no tengan academia, 
                pero solo si están logueados. Podrías crear un guardián simple para ellas, 
                pero dejarlas sueltas por ahora funciona si el componente mismo valida la sesión */}
            <Route path="/completar-perfil" element={<CompletarPerfil />} /> 
            <Route path="/cambiar-password" element={<CambiarPassword />} />
            
            {/* ======================================================= */}
            {/* 🛡️ RUTAS PRIVADAS PROTEGIDAS POR EL GUARDIÁN            */}
            {/* ======================================================= */}
            <Route element={<ProtectedRoutes />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jugadores" element={<Jugadores />} />
              <Route path="/matricula" element={<Matricula />} />
              <Route path="/torneos" element={<Torneos />} />
              <Route path="/nuevo-torneo" element={<NuevoTorneo />} />
              <Route path="/partidos" element={<Partidos />} />
              
              {/* Acceso Administrador General del Negocio */}
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

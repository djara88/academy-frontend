import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 1. Contexto de Autenticación
import { AuthProvider } from './contexts/AuthContext';

// 2. Menú Lateral (Layout)
import Layout from './layouts/Layout';

// 3. Páginas
import Home from './pages/Home';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Jugadores from './pages/Jugadores';
import Matricula from './pages/Matricula';
import Torneos from './pages/Torneos';
import NuevoTorneo from './pages/NuevoTorneo';
import Partidos from './pages/Partidos';
import SaaSAdmin from './pages/SaaSAdmin';

// Inicialización de React Query
const queryClient = new QueryClient();

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            
            {/* Página de Inicio Principal (Landing Page) */}
            <Route path="/" element={<Home />} />
            
            {/* Rutas Públicas */}
            <Route path="/login" element={<Login />} />
            
            {/* Rutas Privadas en el Layout (Incluye el Menú Lateral) */}
            <Route element={<Layout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jugadores" element={<Jugadores />} />
              <Route path="/matricula" element={<Matricula />} /> {/* 🔥 RUTA MOVIDA AQUÍ ADENTRO */}
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

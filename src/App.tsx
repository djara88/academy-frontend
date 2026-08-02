import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

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

const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          
          {/* Página de Inicio Principal (Landing Page) */}
          <Route path="/" element={<Home />} />
          
          {/* Rutas Públicas de Acceso */}
          <Route path="/login" element={<Login />} />
          <Route path="/matricula" element={<Matricula />} />
          
          {/* 
            RUTAS PRIVADAS (Enueltas en el Layout)
            Nota: La ruta de administración ahora es "/admin"
          */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jugadores" element={<Jugadores />} />
            <Route path="/torneos" element={<Torneos />} />
            <Route path="/nuevo-torneo" element={<NuevoTorneo />} />
            <Route path="/partidos" element={<Partidos />} />
            
            {/* Acceso Administrador del Negocio */}
            <Route path="/admin" element={<SaaSAdmin />} />
          </Route>

          {/* Ruta de Rescate (404) -> Redirige a la Home */}
          <Route path="*" element={<Navigate to="/" replace />} />
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

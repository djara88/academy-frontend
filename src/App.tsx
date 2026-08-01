import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// 1. Contexto de Autenticación
import { AuthProvider } from './contexts/AuthContext';

// 2. Tu Menú Lateral (Layout)
import Layout from './layouts/Layout';

// 3. Tus Pantallas
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
          
          {/* =========================================
              RUTAS PÚBLICAS (Sin el menú de navegación)
              ========================================= */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/matricula" element={<Matricula />} />
          
          {/* =========================================
              RUTAS PRIVADAS (Con el menú lateral)
              ========================================= 
              Usamos <Route element={<Layout />}> sin rutas "/*"
              Esto inyecta el menú sin romper la aplicación.
          */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jugadores" element={<Jugadores />} />
            <Route path="/torneos" element={<Torneos />} />
            <Route path="/nuevo-torneo" element={<NuevoTorneo />} />
            <Route path="/partidos" element={<Partidos />} />
            <Route path="/saas-admin" element={<SaaSAdmin />} />
          </Route>

          {/* =========================================
              RUTA DE RESCATE (404)
              ========================================= */}
          <Route path="*" element={<Navigate to="/login" replace />} />
          
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;

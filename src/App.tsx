import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

// --- CONTEXTOS ---
import { AuthProvider } from './contexts/AuthContext';

// --- LAYOUT ---
import Layout from './layouts/Layout';

// --- PÁGINAS ---
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
          <Route path="/login" element={<Login />} />
          <Route path="/matricula" element={<Matricula />} />
          
          {/* =========================================
              RUTAS PRIVADAS (Con el menú de navegación)
              ========================================= 
              LA SOLUCIÓN: Usar 'element={<Layout />}' SIN el 'path="/*"'. 
              Esto envuelve las rutas hijas sin romper la regla del asterisco.
          */}
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/jugadores" element={<Jugadores />} />
            <Route path="/torneos" element={<Torneos />} />
            <Route path="/nuevo-torneo" element={<NuevoTorneo />} />
            <Route path="/partidos" element={<Partidos />} />
            
            {/* AQUÍ ESTÁ TU RUTA SAAS ADMIN CORREGIDA */}
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

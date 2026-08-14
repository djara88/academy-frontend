// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';

const Layout = lazy(() => import('./layouts/Layout'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Registro = lazy(() => import('./pages/Registro'));
const CompletarPerfil = lazy(() => import('./pages/CompletarPerfil'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Jugadores = lazy(() => import('./pages/Jugadores'));
const Matricula = lazy(() => import('./pages/Matricula'));
const Torneos = lazy(() => import('./pages/Torneos'));
const NuevoTorneo = lazy(() => import('./pages/NuevoTorneo'));
const GestionarTorneo = lazy(() => import('./pages/GestionarTorneo'));
const Partidos = lazy(() => import('./pages/Partidos'));
const SaaSAdmin = lazy(() => import('./pages/SaaSAdmin'));
const CambiarPassword = lazy(() => import('./pages/CambiarPassword'));
const Terminos = lazy(() => import('./pages/Terminos'));
const WhatsApp = lazy(() => import('./pages/WhatsApp'));
const FinanzasConfig = lazy(() => import('./pages/FinanzasConfig'));
const Asistencias = lazy(() => import('./pages/Asistencias'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const PerfilAcademia = lazy(() => import('./pages/PerfilAcademia'));
const Uniformes = lazy(() => import('./pages/Uniformes'));
const Finanzas = lazy(() => import('./pages/Finanzas'));
const Profesores = lazy(() => import('./pages/Profesores'));
const ProfesorPortal = lazy(() => import('./pages/ProfesorPortal'));
const Apoderados = lazy(() => import('./pages/Apoderados'));
const ApoderadoPortal = lazy(() => import('./pages/ApoderadoPortal'));

const queryClient = new QueryClient();

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

const PublicRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D] font-bold">
        Comprobando sesión...
      </div>
    );
  }

  if (user) {
    if (user.rol === 'superadmin') return <Navigate to="/admin" replace />;
    if (user.requiere_cambio_password) return <Navigate to="/cambiar-password" replace />;
    if (!user.academia_id) return <Navigate to="/completar-perfil" replace />;
    const role = String(user.rol).toLowerCase();
    return <Navigate to={role === 'profesor' ? '/profesor' : ['apoderado', 'tutor'].includes(role) ? '/apoderado' : '/dashboard'} replace />;
  }

  return <Outlet />;
};

const DirectorRoutes = () => {
  const { user } = useAuth();
  const role = String(user?.rol || '').toLowerCase().replace(/[_-]/g, '');
  if (role === 'superadmin') return <Navigate to="/admin" replace />;
  if (role === 'profesor') return <Navigate to="/profesor" replace />;
  if (['apoderado', 'tutor'].includes(role)) return <Navigate to="/apoderado" replace />;
  return <Outlet />;
};

const ProfessorRoute = () => {
  const { user } = useAuth();
  return String(user?.rol || '').toLowerCase() === 'profesor'
    ? <ProfesorPortal />
    : <Navigate to="/dashboard" replace />;
};
const GuardianRoute = () => {
  const { user } = useAuth();
  return ['apoderado', 'tutor'].includes(String(user?.rol || '').toLowerCase())
    ? <ApoderadoPortal />
    : <Navigate to="/dashboard" replace />;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <DialogProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D] font-bold">Cargando Syncademia...</div>}>
            <Routes>
            
            <Route element={<PublicRoutes />}>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/registro" element={<Registro />} /> 
            </Route>
            
            <Route path="/completar-perfil" element={<CompletarPerfil />} /> 
            <Route path="/cambiar-password" element={<CambiarPassword />} />
            
            <Route element={<ProtectedRoutes />}>
              <Route path="/profesor" element={<ProfessorRoute />} />
              <Route path="/apoderado" element={<GuardianRoute />} />
              <Route element={<DirectorRoutes />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profesores" element={<Profesores />} />
              <Route path="/apoderados" element={<Apoderados />} />
              <Route path="/jugadores" element={<Jugadores />} />
              <Route path="/matricula" element={<Matricula />} />
              <Route path="/asistencias" element={<Asistencias />} />
              <Route path="/uniformes" element={<Uniformes />} /> {/* 👈 NUEVA RUTA UNIFORMES */}
              
              <Route path="/torneos" element={<Torneos />} />
              <Route path="/nuevo-torneo" element={<NuevoTorneo />} />
              <Route path="/torneos/:id" element={<GestionarTorneo />} />
              <Route path="/partidos" element={<Partidos />} />
              <Route path="/finanzas" element={<Finanzas />} />
              
              {/* RUTAS DEL MÓDULO DE CONFIGURACIÓN Y SUBMÓDULOS */}
              <Route path="/configuracion" element={<Configuracion />} />
              <Route path="/configuracion/perfil" element={<PerfilAcademia />} />
              <Route path="/terminos" element={<Terminos />} />
              <Route path="/whatsapp" element={<WhatsApp />} />
              <Route path="/configuracion/finanzas" element={<FinanzasConfig />} />
              
              <Route path="/admin" element={<SaaSAdmin />} />
              </Route>
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
            
            </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </DialogProvider>
    </QueryClientProvider>
  );
};

export default App;

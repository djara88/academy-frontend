// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import { AdminThemeProvider } from './contexts/AdminThemeContext';
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat';
import { isGuardianRole, isProfessorRole, isSuperAdminRole } from './utils/roles';

const Layout = lazy(() => import('./layouts/Layout'));
const SuperadminMfaGate = lazy(() => import('./components/SuperadminMfaGate'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Registro = lazy(() => import('./pages/Registro'));
const CompletarPerfil = lazy(() => import('./pages/CompletarPerfil'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Jugadores = lazy(() => import('./pages/Jugadores'));
const Matricula = lazy(() => import('./pages/MatriculaPreparacion'));
const InscripcionesDeportivas = lazy(() => import('./pages/InscripcionesDeportivasEnhanced'));
const PreMatriculaPublica = lazy(() => import('./pages/PreMatriculaPublica'));
const Importacion = lazy(() => import('./pages/Importacion'));
const Torneos = lazy(() => import('./pages/Torneos'));
const NuevoTorneo = lazy(() => import('./pages/NuevoTorneo'));
const GestionarTorneo = lazy(() => import('./pages/GestionarTorneo'));
const Partidos = lazy(() => import('./pages/Partidos'));
const SaaSAdmin = lazy(() => import('./pages/SaaSAdmin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminFinance = lazy(() => import('./pages/AdminFinance'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const Subscription = lazy(() => import('./pages/Subscription'));
const ApoderadosPro = lazy(() => import('./pages/ApoderadosPro'));
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
const ApoderadoPortal = lazy(() => import('./pages/ApoderadoPortalEnhanced'));
const PrivacyRequests = lazy(() => import('./pages/PrivacyRequests'));
const AdminMonitor = lazy(() => import('./pages/AdminMonitor'));
const ChatCenter = lazy(() => import('./pages/ChatCenter'));
const EstructuraAcademia = lazy(() => import('./pages/EstructuraAcademia'));
const CommunicationsHub = lazy(() => import('./pages/CommunicationsHub'));
const WhatsAppGroups = lazy(() => import('./pages/WhatsAppGroups'));

const queryClient = new QueryClient();

const ProtectedRoutes = () => {
  const { user, loading } = useAuth();
  usePresenceHeartbeat(Boolean(user) && !loading && !user?.requiere_cambio_password);
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D] font-bold">Cargando sistema...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.requiere_cambio_password) return <Navigate to="/cambiar-password" replace />;
  if (!user.academia_id && !isSuperAdminRole(user.rol)) return <Navigate to="/completar-perfil" replace />;
  return <Layout />;
};

const PublicRoutes = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D] font-bold">Comprobando sesión...</div>;
  if (user) {
    if (isSuperAdminRole(user.rol)) return <Navigate to="/admin" replace />;
    if (user.requiere_cambio_password) return <Navigate to="/cambiar-password" replace />;
    if (!user.academia_id) return <Navigate to="/completar-perfil" replace />;
    return <Navigate to={isProfessorRole(user.rol) ? '/profesor' : isGuardianRole(user.rol) ? '/apoderado' : '/dashboard'} replace />;
  }
  return <Outlet />;
};

const DirectorRoutes = () => {
  const { user } = useAuth();
  if (isSuperAdminRole(user?.rol)) return <Navigate to="/admin" replace />;
  if (isProfessorRole(user?.rol)) return <Navigate to="/profesor" replace />;
  if (isGuardianRole(user?.rol)) return <Navigate to="/apoderado" replace />;
  return <Outlet />;
};

const SuperAdminRoutes = () => {
  const { user } = useAuth();
  if (!isSuperAdminRole(user?.rol)) return <Navigate to="/dashboard" replace />;
  return <SuperadminMfaGate><Outlet /></SuperadminMfaGate>;
};
const ProfessorRoute = () => { const { user } = useAuth(); return isProfessorRole(user?.rol) ? <ProfesorPortal /> : <Navigate to="/dashboard" replace />; };
const GuardianRoute = () => { const { user } = useAuth(); return isGuardianRole(user?.rol) ? <ApoderadoPortal /> : <Navigate to="/dashboard" replace />; };
const GuardianChatRoute = () => { const { user } = useAuth(); return isGuardianRole(user?.rol) ? <ChatCenter /> : <Navigate to="/dashboard" replace />; };

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DialogProvider>
      <AdminThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D] font-bold">Cargando Syncademia...</div>}>
              <Routes>
                <Route path="/prematricula/:token" element={<PreMatriculaPublica />} />
                <Route element={<PublicRoutes />}><Route path="/" element={<Home />} /><Route path="/login" element={<Login />} /><Route path="/registro" element={<Registro />} /></Route>
                <Route path="/completar-perfil" element={<CompletarPerfil />} />
                <Route path="/cambiar-password" element={<CambiarPassword />} />
                <Route element={<ProtectedRoutes />}>
                  <Route path="/profesor" element={<ProfessorRoute />} />
                  <Route path="/apoderado" element={<GuardianRoute />} />
                  <Route path="/apoderado/mensajes" element={<GuardianChatRoute />} />
                  <Route element={<SuperAdminRoutes />}>
                    <Route path="/admin" element={<AdminDashboard />} />
                    <Route path="/admin/academias" element={<SaaSAdmin />} />
                    <Route path="/admin/finanzas" element={<AdminFinance />} />
                    <Route path="/admin/perfil" element={<AdminProfile />} />
                    <Route path="/admin/monitor" element={<AdminMonitor />} />
                  </Route>
                  <Route element={<DirectorRoutes />}>
                    <Route path="/dashboard" element={<Dashboard />} /><Route path="/profesores" element={<Profesores />} /><Route path="/apoderados" element={<Apoderados />} /><Route path="/apoderados-pro" element={<ApoderadosPro />} />
                    <Route path="/comunicaciones" element={<CommunicationsHub />} /><Route path="/comunicaciones/grupos" element={<WhatsAppGroups />} /><Route path="/jugadores" element={<Jugadores />} />
                    <Route path="/matricula" element={<Matricula />} /><Route path="/inscripciones" element={<InscripcionesDeportivas />} /><Route path="/importacion" element={<Importacion />} /><Route path="/asistencias" element={<Asistencias />} /><Route path="/uniformes" element={<Uniformes />} />
                    <Route path="/torneos" element={<Torneos />} /><Route path="/nuevo-torneo" element={<NuevoTorneo />} /><Route path="/torneos/:id" element={<GestionarTorneo />} /><Route path="/partidos" element={<Partidos />} />
                    <Route path="/finanzas" element={<Finanzas />} /><Route path="/suscripcion" element={<Subscription />} /><Route path="/configuracion" element={<Configuracion />} /><Route path="/privacidad" element={<PrivacyRequests />} />
                    <Route path="/configuracion/perfil" element={<PerfilAcademia />} /><Route path="/configuracion/estructura" element={<EstructuraAcademia />} /><Route path="/terminos" element={<Terminos />} /><Route path="/whatsapp" element={<WhatsApp />} /><Route path="/configuracion/finanzas" element={<FinanzasConfig />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </AuthProvider>
      </AdminThemeProvider>
    </DialogProvider>
  </QueryClientProvider>
);

export default App;

// src/App.tsx
import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DialogProvider } from './contexts/DialogContext';
import { AdminThemeProvider } from './contexts/AdminThemeContext';
import { usePresenceHeartbeat } from './hooks/usePresenceHeartbeat';
import { isGuardianRole, isProfessorRole, isSuperAdminRole } from './utils/roles';
import { BRAND } from './config/brand';
import api from './api/axiosConfig';
import LestraRealtimeProvider from './realtime/LestraRealtimeProvider';
import RealtimeRouteBoundary from './realtime/RealtimeRouteBoundary';

const Layout = lazy(() => import('./layouts/Layout'));
const SuperadminMfaGate = lazy(() => import('./components/SuperadminMfaGate'));
const ProductHome = lazy(() => import('./pages/HomeCommercial'));
const LestraHub = lazy(() => import('./pages/LestraHub'));
const LestraProductPreview = lazy(() => import('./pages/LestraProductPreview'));
const LestraPrivacyPolicy = lazy(() => import('./pages/LestraPrivacyPolicy'));
const Login = lazy(() => import('./pages/Login'));
const AuthCallback = lazy(() => import('./pages/AuthCallback'));
const Registro = lazy(() => import('./pages/Registro'));
const CompletarPerfil = lazy(() => import('./pages/CompletarPerfil'));
const AcademySetup = lazy(() => import('./pages/AcademySetup'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Alumnos = lazy(() => import('./pages/Alumnos'));
const Matricula = lazy(() => import('./pages/MatriculaPreparacion'));
const AdmissionRequests = lazy(() => import('./pages/AdmissionRequests'));
const InscripcionesDeportivas = lazy(() => import('./pages/InscripcionesDeportivasEnhanced'));
const PreMatriculaPublica = lazy(() => import('./pages/PreMatriculaPublica'));
const PublicAcademy = lazy(() => import('./pages/PublicAcademy'));
const CollectionPortal = lazy(() => import('./pages/CollectionPortal'));
const Importacion = lazy(() => import('./pages/Importacion'));
const Amistosos = lazy(() => import('./pages/Amistosos'));
const Torneos = lazy(() => import('./pages/TorneosMultirama'));
const TorneosArchivados = lazy(() => import('./pages/TorneosArchivados'));
const NuevoTorneo = lazy(() => import('./pages/NuevoTorneoMultirama'));
const GestionarTorneo = lazy(() => import('./pages/GestionarTorneoMultiramaEnhanced'));
const EventosRendimiento = lazy(() => import('./pages/EventosRendimientoEnhanced'));
const RendimientoAnalytics = lazy(() => import('./pages/RendimientoAnalytics'));
const SaludDisponibilidad = lazy(() => import('./pages/SaludDisponibilidad'));
const SaaSAdmin = lazy(() => import('./pages/SaaSAdmin'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const AdminFinance = lazy(() => import('./pages/AdminFinance'));
const AdminProfile = lazy(() => import('./pages/AdminProfile'));
const Subscription = lazy(() => import('./pages/SubscriptionCommercial'));
const ApoderadosPro = lazy(() => import('./pages/ApoderadosPro'));
const CambiarPassword = lazy(() => import('./pages/CambiarPassword'));
const Terminos = lazy(() => import('./pages/Terminos'));
const WhatsApp = lazy(() => import('./pages/WhatsApp'));
const FinanzasConfig = lazy(() => import('./pages/FinanzasConfig'));
const Asistencias = lazy(() => import('./pages/AsistenciasMultirama'));
const Configuracion = lazy(() => import('./pages/Configuracion'));
const PerfilAcademia = lazy(() => import('./pages/PerfilAcademia'));
const Uniformes = lazy(() => import('./pages/UniformesMultirama'));
const JerseyNumbers = lazy(() => import('./pages/JerseyNumbers'));
const Finanzas = lazy(() => import('./pages/FinanzasCompat'));
const Profesores = lazy(() => import('./pages/ProfesoresMultirama'));
const ProfesorPortal = lazy(() => import('./pages/ProfesorPortal'));
const Apoderados = lazy(() => import('./pages/Apoderados'));
const ApoderadoPortal = lazy(() => import('./pages/ApoderadoPortalEnhanced'));
const PrivacyRequests = lazy(() => import('./pages/PrivacyRequests'));
const AdminMonitor = lazy(() => import('./pages/AdminMonitor'));
const ChatCenter = lazy(() => import('./pages/ChatCenter'));
const EstructuraAcademia = lazy(() => import('./pages/EstructuraAcademia'));
const CommunicationsHub = lazy(() => import('./pages/CommunicationsHub'));
const WhatsAppGroups = lazy(() => import('./pages/WhatsAppGroups'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});
const GOOGLE_LOGIN_INTENT_KEY = 'lestra_google_login_intent';
const SETUP_SUPPORT_ROUTES = new Set(['/configuracion/estructura', '/configuracion/finanzas', '/terminos', '/profesores']);

type SetupGateState = {
  required: boolean;
  locked: boolean;
  operational: boolean;
  completed_once: boolean;
  progress: number;
};

type DirectorPlanAccess = {
  plan: { code: string; name: string; trial: boolean };
  features: string[];
};

const LandingHome = () => {
  if (sessionStorage.getItem(GOOGLE_LOGIN_INTENT_KEY) === '1') return <AuthCallback />;
  const hostname = window.location.hostname.toLowerCase();
  const isLestraPlatformHost = hostname === 'lestra.app' || hostname === 'www.lestra.app';
  return isLestraPlatformHost ? <LestraHub /> : <ProductHome />;
};

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
  const location = useLocation();
  const isSuperAdmin = isSuperAdminRole(user?.rol);
  const isProfessor = isProfessorRole(user?.rol);
  const isGuardian = isGuardianRole(user?.rol);
  const directorEnabled = Boolean(user?.academia_id) && !isSuperAdmin && !isProfessor && !isGuardian;
  const setupQuery = useQuery({
    queryKey: ['academy-setup'],
    enabled: directorEnabled,
    staleTime: 10_000,
    queryFn: async () => (await api.get('/api/consentimientos/setup')).data.data as SetupGateState,
  });
  const planQuery = useQuery({
    queryKey: ['mi-plan', user?.academia_id],
    enabled: directorEnabled,
    staleTime: 10_000,
    queryFn: async () => (await api.get('/api/academias/mi-plan')).data.data as DirectorPlanAccess,
  });

  if (isSuperAdmin) return <Navigate to="/admin" replace />;
  if (isProfessor) return <Navigate to="/profesor" replace />;
  if (isGuardian) return <Navigate to="/apoderado" replace />;

  if (setupQuery.isLoading) {
    return <div className="grid min-h-[55vh] place-items-center bg-[#e9ece4] text-sm font-black text-[#20261f]">Preparando tu academia…</div>;
  }

  const setup = setupQuery.data;
  const setupRoute = location.pathname === '/puesta-en-marcha';
  const setupSupport = SETUP_SUPPORT_ROUTES.has(location.pathname) && new URLSearchParams(location.search).get('setup') === '1';
  const friendliesRoute = location.pathname === '/amistosos';

  if (friendliesRoute && planQuery.isLoading) {
    return <div className="grid min-h-[55vh] place-items-center bg-[#e9ece4] text-sm font-black text-[#20261f]">Validando tu plan…</div>;
  }

  if (friendliesRoute) {
    const planAccess = planQuery.data;
    const canUseFriendlies = Boolean(
      planAccess
      && !planAccess.plan.trial
      && planAccess.plan.code === 'formacion'
      && planAccess.features.includes('amistosos')
    );
    if (!canUseFriendlies) {
      return <Navigate to={planAccess && !planAccess.plan.trial ? '/partidos' : '/dashboard'} replace />;
    }
  }

  // Fall-open deliberado: una indisponibilidad puntual del endpoint de setup no debe
  // bloquear academias ya operativas. Las academias nuevas vuelven a validarse al reconectar.
  if (setup?.required && setup.locked && !setupRoute && !setupSupport) {
    return <Navigate to="/puesta-en-marcha" replace />;
  }
  if (setup?.required === false && setupRoute) return <Navigate to="/dashboard" replace />;

  return <RealtimeRouteBoundary><Outlet /></RealtimeRouteBoundary>;
};

const SuperAdminRoutes = () => {
  const { user } = useAuth();
  if (!isSuperAdminRole(user?.rol)) return <Navigate to="/dashboard" replace />;
  return <SuperadminMfaGate><Outlet /></SuperadminMfaGate>;
};
const ProfessorRoute = () => { const { user } = useAuth(); return isProfessorRole(user?.rol) ? <RealtimeRouteBoundary><ProfesorPortal /></RealtimeRouteBoundary> : <Navigate to="/dashboard" replace />; };
const GuardianRoute = () => { const { user } = useAuth(); return isGuardianRole(user?.rol) ? <ApoderadoPortal /> : <Navigate to="/dashboard" replace />; };
const GuardianChatRoute = () => { const { user } = useAuth(); return isGuardianRole(user?.rol) ? <ChatCenter /> : <Navigate to="/dashboard" replace />; };

const App = () => (
  <QueryClientProvider client={queryClient}>
    <DialogProvider>
      <AdminThemeProvider>
        <AuthProvider>
          <LestraRealtimeProvider>
            <BrowserRouter>
              <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0d1117] text-[#289E9D] font-bold">Cargando {BRAND.name}...</div>}>
                <Routes>
                  <Route path="/prematricula/:token" element={<PreMatriculaPublica />} />
                  <Route path="/a/:slug" element={<PublicAcademy />} />
                  <Route path="/a/:slug/pagos" element={<CollectionPortal />} />
                  <Route path="/pagar/:token" element={<CollectionPortal />} />
                  <Route path="/auth/callback" element={<AuthCallback />} />
                  <Route path="/privacidad-lestra" element={<LestraPrivacyPolicy />} />

                  <Route path="/" element={<LandingHome />} />
                  <Route path="/deportivo" element={<ProductHome />} />
                  <Route path="/learn" element={<LestraProductPreview product="learn" />} />
                  <Route path="/profe" element={<LestraProductPreview product="profe" />} />

                  <Route element={<PublicRoutes />}>
                    <Route path="/login" element={<Login />} />
                    <Route path="/registro" element={<Registro />} />
                  </Route>
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
                      <Route path="/puesta-en-marcha" element={<AcademySetup />} />
                      <Route path="/dashboard" element={<Dashboard />} /><Route path="/profesores" element={<Profesores />} /><Route path="/apoderados" element={<Apoderados />} /><Route path="/apoderados-pro" element={<ApoderadosPro />} />
                      <Route path="/comunicaciones" element={<CommunicationsHub />} /><Route path="/comunicaciones/grupos" element={<WhatsAppGroups />} /><Route path="/alumnos" element={<Alumnos />} /><Route path="/jugadores" element={<Navigate to="/alumnos" replace />} />
                      <Route path="/solicitudes" element={<AdmissionRequests />} /><Route path="/matricula" element={<Matricula />} /><Route path="/inscripciones" element={<InscripcionesDeportivas />} /><Route path="/importacion" element={<Importacion />} /><Route path="/asistencias" element={<Asistencias />} /><Route path="/uniformes" element={<Uniformes />} /><Route path="/uniformes/dorsales" element={<JerseyNumbers />} />
                      <Route path="/amistosos" element={<Amistosos />} />
                      <Route path="/torneos" element={<Torneos />} /><Route path="/torneos/almacen" element={<TorneosArchivados />} /><Route path="/nuevo-torneo" element={<NuevoTorneo />} /><Route path="/torneos/:id" element={<GestionarTorneo />} />
                      <Route path="/partidos" element={<EventosRendimiento />} /><Route path="/rendimiento" element={<Navigate to="/partidos" replace />} /><Route path="/rendimiento/analitica" element={<RendimientoAnalytics />} /><Route path="/salud-deportiva" element={<SaludDisponibilidad />} />
                      <Route path="/finanzas" element={<Finanzas />} /><Route path="/suscripcion" element={<Subscription />} /><Route path="/configuracion" element={<Configuracion />} /><Route path="/privacidad" element={<PrivacyRequests />} />
                      <Route path="/configuracion/perfil" element={<PerfilAcademia />} /><Route path="/configuracion/estructura" element={<EstructuraAcademia />} /><Route path="/terminos" element={<Terminos />} /><Route path="/whatsapp" element={<WhatsApp />} /><Route path="/configuracion/finanzas" element={<FinanzasConfig />} />
                    </Route>
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </BrowserRouter>
          </LestraRealtimeProvider>
        </AuthProvider>
      </AdminThemeProvider>
    </DialogProvider>
  </QueryClientProvider>
);

export default App;
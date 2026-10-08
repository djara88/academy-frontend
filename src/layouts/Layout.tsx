import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BanknotesIcon,
  Bars3Icon,
  BuildingOffice2Icon,
  ChartBarIcon,
  MoonIcon,
  ServerStackIcon,
  ShieldCheckIcon,
  SunIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAdminTheme } from '../contexts/AdminThemeContext';
import { supabase } from '../config/supabase';
import { Logo } from '../components/Logo';
import DirectorCommandBar from '../components/navigation/DirectorCommandBar';
import { AcademyBlocked, AcademyTrialNotice } from '../components/AcademyTrialNotice';
import { BRAND, getAcademyName } from '../config/brand';
import { isGuardianRole, isProfessorRole, isSuperAdminRole } from '../utils/roles';

type PlanAccess = {
  plan: { code: string; name: string; trial: boolean };
  features: string[];
  limits: { professors: number; players: number | null };
  addOns: { guardians: boolean };
  subscription: {
    status: string;
    blocked: boolean;
    trial: boolean;
    trialEndsAt?: string | null;
    remainingDays?: number | null;
    remainingHours?: number | null;
    urgency?: string | null;
    reason?: string | null;
  };
};

type AdminNavItem = { to: string; label: string; icon: typeof ChartBarIcon };

const adminItems: AdminNavItem[] = [
  { to: '/admin', label: 'Resumen ejecutivo', icon: ChartBarIcon },
  { to: '/admin/academias', label: 'Academias', icon: BuildingOffice2Icon },
  { to: '/admin/finanzas', label: `Finanzas ${BRAND.name}`, icon: BanknotesIcon },
  { to: '/admin/monitor', label: 'Monitor del sistema', icon: ServerStackIcon },
  { to: '/admin/perfil', label: 'Mi perfil', icon: ShieldCheckIcon },
];

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [courtBright, setCourtBright] = useState(() => localStorage.getItem('lestra_court_visibility') !== 'dark');

  const isSuperAdmin = isSuperAdminRole(user?.rol);
  const isProfessor = isProfessorRole(user?.rol);
  const isGuardian = isGuardianRole(user?.rol);
  const nombreAcademia = getAcademyName(user?.nombre_academia);
  const logoAcademia = user?.logo_url;
  const light = isSuperAdmin && theme === 'light';

  const { data: planAccess } = useQuery({
    queryKey: ['mi-plan', user?.academia_id],
    enabled: Boolean(user?.academia_id) && !isSuperAdmin,
    retry: 1,
    queryFn: async () => (await api.get('/api/academias/mi-plan')).data.data as PlanAccess,
  });

  useEffect(() => {
    document.title = isSuperAdmin ? `${BRAND.name} | Administración` : `${nombreAcademia} | ${BRAND.name}`;
  }, [isSuperAdmin, nombreAcademia]);

  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen || !isSuperAdmin) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen, isSuperAdmin]);

  const handleLogout = async () => {
    try {
      if (logout) await logout();
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    } finally {
      navigate('/login');
    }
  };

  const toggleCourtVisibility = () => {
    setCourtBright((current) => {
      const next = !current;
      localStorage.setItem('lestra_court_visibility', next ? 'bright' : 'dark');
      return next;
    });
  };

  const portalShell = (kind: 'profesor' | 'apoderado') => {
    const professor = kind === 'profesor';
    return (
      <div className={`${professor ? `lestra-court-shell ${courtBright ? 'court-bright' : 'court-dark'}` : 'lestra-family-shell'} min-h-dvh overflow-x-hidden`}>
        <header className="lestra-portal-header sticky top-0 z-40 px-3 py-3 backdrop-blur sm:px-4">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <Link to={`/${kind}`} className="flex min-w-0 items-center gap-3">
              <div className="lestra-portal-mark flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl p-2 sm:h-12 sm:w-12"><Logo variant="mark" className="h-full w-full" /></div>
              <div className="min-w-0">
                <p className="truncate text-sm font-black sm:text-base">{nombreAcademia}</p>
                <p className="truncate text-xs font-bold">{professor ? `Modo cancha · ${BRAND.name}` : `Portal de familia · ${BRAND.name}`}</p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              {professor ? (
                <button type="button" onClick={toggleCourtVisibility} className="lestra-visibility-toggle inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-black sm:text-sm">
                  {courtBright ? <MoonIcon aria-hidden="true" className="h-5 w-5" /> : <SunIcon aria-hidden="true" className="h-5 w-5" />}
                  <span className="hidden sm:inline">{courtBright ? 'Modo noche' : 'Modo sol'}</span>
                </button>
              ) : null}
              {kind === 'apoderado' ? <Link to="/apoderado/mensajes" className={`rounded-xl border px-3 py-2.5 text-xs font-black sm:text-sm ${location.pathname === '/apoderado/mensajes' ? 'border-[#289E9D] bg-[#289E9D]/15 text-[#70e4df]' : 'border-[#30363d] text-[#b1bac4]'}`}>Mensajes</Link> : null}
              <button type="button" onClick={handleLogout} className="lestra-portal-exit min-h-11 rounded-xl px-3 text-xs font-black sm:text-sm">Salir</button>
            </div>
          </div>
        </header>
        <main id="main-content" className="app-content lestra-portal-content mx-auto min-w-0 max-w-6xl p-3 sm:p-6" tabIndex={-1}>
          <AcademyTrialNotice subscription={planAccess?.subscription} canManage={false} />
          {planAccess?.subscription.blocked ? <AcademyBlocked subscription={planAccess.subscription} canManage={false} /> : <Outlet />}
        </main>
      </div>
    );
  };

  if (isProfessor) return portalShell('profesor');
  if (isGuardian) return portalShell('apoderado');

  const active = (path: string) => location.pathname === path || (path !== '/admin' && location.pathname.startsWith(`${path}/`));

  if (isSuperAdmin) {
    const shell = light ? 'bg-slate-100 text-slate-950' : 'bg-[#0b1118] text-white';
    const sidebar = light ? 'border-slate-200 bg-white' : 'border-white/5 bg-[#101720]';

    return (
      <div className={`flex h-dvh min-w-0 overflow-hidden font-sans ${shell}`}>
        <a href="#main-content" className="lestra-skip-link">Saltar al contenido</a>
        {mobileMenuOpen ? <button type="button" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] lg:hidden" /> : null}

        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[min(88vw,19rem)] shrink-0 transform flex-col justify-between border-r transition-transform duration-200 lg:static lg:z-auto lg:w-[17.5rem] lg:translate-x-0 ${sidebar} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Administración Lestra">
          <div className="flex-1 overflow-y-auto overscroll-contain">
            <div className={`relative border-b p-5 ${light ? 'border-slate-200' : 'border-white/5'}`}>
              <button type="button" onClick={() => setMobileMenuOpen(false)} className={`absolute right-3 top-3 rounded-xl p-2 lg:hidden ${light ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'}`} aria-label="Cerrar navegación"><XMarkIcon aria-hidden="true" className="h-6 w-6" /></button>
              <div className="flex items-center gap-3">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border p-2 ${light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-[#0b1118]'}`}><Logo variant="mark" className="h-full w-full" /></div>
                <div className="min-w-0 text-left"><p className="text-xs font-black uppercase tracking-[.14em] text-orange-500">Lestra</p><h1 className={`mt-1 truncate text-base font-black ${light ? 'text-slate-950' : 'text-white'}`}>{BRAND.name}</h1><p className="mt-1 truncate text-xs font-semibold text-orange-500">Administración global</p></div>
              </div>
            </div>

            <nav className="space-y-1 p-3 pb-6" aria-label="Administración">
              {adminItems.map((item) => {
                const Icon = item.icon;
                const current = active(item.to);
                return <Link key={item.to} to={item.to} aria-current={current ? 'page' : undefined} className={`flex min-h-11 items-center rounded-xl px-3 text-sm font-semibold ${current ? 'bg-orange-500 text-white' : light ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}><Icon aria-hidden="true" className="mr-3 h-5 w-5 shrink-0" /><span className="truncate">{item.label}</span></Link>;
              })}
            </nav>
          </div>

          <div className={`space-y-2 border-t p-4 ${light ? 'border-slate-200' : 'border-white/5'}`}>
            <button onClick={toggleTheme} className={`flex min-h-11 w-full items-center rounded-xl px-4 text-sm font-bold ${light ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-slate-300'}`}>{light ? <MoonIcon aria-hidden="true" className="mr-3 h-5 w-5" /> : <SunIcon aria-hidden="true" className="mr-3 h-5 w-5" />}{light ? 'Usar modo oscuro' : 'Usar modo claro'}</button>
            <p className={`truncate px-3 py-1 text-xs ${light ? 'text-slate-500' : 'text-slate-600'}`}>{user?.email}</p>
            <button onClick={handleLogout} className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-bold text-slate-500 hover:bg-red-900/20 hover:text-red-400">Cerrar sesión</button>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <header className={`sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-3 border-b px-3 py-2 backdrop-blur lg:hidden ${light ? 'border-slate-200 bg-white/95' : 'border-white/5 bg-[#101720]/95'}`}>
            <button type="button" onClick={() => setMobileMenuOpen(true)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${light ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-white/10 bg-white/5 text-slate-200'}`} aria-label="Abrir navegación"><Bars3Icon aria-hidden="true" className="h-6 w-6" /></button>
            <div className="min-w-0 flex-1"><p className="truncate text-xs font-black uppercase tracking-[0.14em] text-orange-500">Panel maestro</p><p className={`truncate text-sm font-black ${light ? 'text-slate-900' : 'text-white'}`}>{BRAND.name}</p></div>
          </header>

          <main id="main-content" tabIndex={-1} className="min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
            <div className="min-h-full min-w-0 p-3 sm:p-6"><Outlet /></div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="lestra-shell flex h-dvh min-w-0 overflow-hidden bg-[var(--ls-bg)] font-sans text-[var(--ls-ink)]">
      <a href="#main-content" className="lestra-skip-link">Saltar al contenido</a>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <DirectorCommandBar
          pathname={location.pathname}
          academyName={nombreAcademia}
          academyLogo={logoAcademia}
          features={planAccess?.features}
          planLabel={planAccess?.plan.trial ? 'Prueba Full' : `Plan ${planAccess?.plan.name || BRAND.name}`}
          email={user?.email}
          onLogout={handleLogout}
        />

        <main id="main-content" data-route={location.pathname} tabIndex={-1} className="lestra-director-main min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
          <div className="app-content min-h-full min-w-0 p-3 pb-24 sm:p-6 sm:pb-8">
            <AcademyTrialNotice subscription={planAccess?.subscription} />
            {planAccess?.subscription.blocked && location.pathname !== '/suscripcion' ? <AcademyBlocked subscription={planAccess.subscription} /> : <Outlet />}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;

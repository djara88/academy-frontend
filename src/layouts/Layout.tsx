import { useEffect, useState, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AcademicCapIcon, BanknotesIcon, Bars3Icon, BuildingOffice2Icon, CalendarDaysIcon,
  ChartBarIcon, ChatBubbleLeftRightIcon, ChevronDownIcon, ClipboardDocumentCheckIcon, Cog6ToothIcon, HeartIcon, HomeIcon,
  MoonIcon, PaintBrushIcon, ShieldCheckIcon, ShoppingBagIcon, SunIcon,
  TrophyIcon, UserGroupIcon, UserPlusIcon, UsersIcon, XMarkIcon, ServerStackIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAdminTheme } from '../contexts/AdminThemeContext';
import { supabase } from '../config/supabase';
import { Logo } from '../components/Logo';
import { AcademyBlocked, AcademyTrialNotice } from '../components/AcademyTrialNotice';
import { BRAND, getAcademyName } from '../config/brand';
import { isGuardianRole, isProfessorRole, isSuperAdminRole } from '../utils/roles';

type PlanAccess = {
  plan: { code: string; name: string; trial: boolean };
  features: string[];
  limits: { professors: number; players: number | null };
  addOns: { guardians: boolean };
  subscription: { status: string; blocked: boolean; trial: boolean; trialEndsAt?: string | null; remainingDays?: number | null; remainingHours?: number | null; urgency?: string | null; reason?: string | null };
};
type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>; feature?: string; badge?: string };
type NavGroup = { label: string; items: NavItem[]; primary?: boolean };

const directorGroups: NavGroup[] = [
  {
    label: 'Principal',
    primary: true,
    items: [
      { to: '/dashboard', label: 'Inicio', icon: HomeIcon },
      { to: '/solicitudes', label: 'Solicitudes', icon: UserPlusIcon },
      { to: '/matricula', label: 'Nueva matrícula', icon: ClipboardDocumentCheckIcon },
      { to: '/alumnos', label: 'Alumnos', icon: UsersIcon },
      { to: '/asistencias', label: 'Asistencia', icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    label: 'Equipo y familias',
    items: [
      { to: '/profesores', label: 'Equipo técnico', icon: AcademicCapIcon, feature: 'profesores' },
      { to: '/apoderados', label: 'Familias', icon: UserGroupIcon, feature: 'apoderados', badge: 'ADD-ON' },
    ],
  },
  {
    label: 'Competencia',
    items: [
      { to: '/amistosos', label: 'Amistosos', icon: CalendarDaysIcon, feature: 'amistosos' },
      { to: '/torneos', label: 'Torneos', icon: TrophyIcon, feature: 'torneos' },
      { to: '/partidos', label: 'Eventos y rendimiento', icon: CalendarDaysIcon, feature: 'partidos' },
      { to: '/rendimiento/analitica', label: 'Analítica deportiva', icon: ChartBarIcon, feature: 'analitica_avanzada', badge: 'ALTO' },
      { to: '/salud-deportiva', label: 'Salud y disponibilidad', icon: HeartIcon, feature: 'ficha_medica', badge: 'ALTO' },
    ],
  },
  {
    label: 'Gestión',
    items: [
      { to: '/finanzas', label: 'Finanzas', icon: BanknotesIcon, feature: 'finanzas' },
      { to: '/comunicaciones', label: 'Comunicaciones', icon: ChatBubbleLeftRightIcon, feature: 'apoderados', badge: 'ADD-ON' },
      { to: '/uniformes', label: 'Uniformes', icon: ShoppingBagIcon, feature: 'uniformes' },
      { to: '/configuracion', label: 'Configuración', icon: Cog6ToothIcon },
      { to: '/privacidad', label: 'Privacidad', icon: ShieldCheckIcon },
    ],
  },
];

const adminItems: NavItem[] = [
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
  const isSuperAdmin = user?.email === 'd.jarazerene@gmail.com' || isSuperAdminRole(user?.rol);
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

  useEffect(() => { document.title = isSuperAdmin ? `${BRAND.name} | Administración` : `${nombreAcademia} | ${BRAND.name}`; }, [isSuperAdmin, nombreAcademia]);
  useEffect(() => { setMobileMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [mobileMenuOpen]);

  const handleLogout = async () => {
    try { if (logout) await logout(); await supabase.auth.signOut(); }
    catch (error) { console.error('Error al cerrar sesión:', error); }
    finally { navigate('/login'); }
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
                <p className="truncate text-[11px] font-bold sm:text-xs">{professor ? `Modo cancha · ${BRAND.name}` : `Portal de familia · ${BRAND.name}`}</p>
              </div>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              {professor ? <button type="button" onClick={toggleCourtVisibility} className="lestra-visibility-toggle inline-flex min-h-11 items-center gap-2 rounded-xl px-3 text-xs font-black sm:text-sm">{courtBright ? <MoonIcon aria-hidden="true" className="h-5 w-5" /> : <SunIcon aria-hidden="true" className="h-5 w-5" />}<span className="hidden sm:inline">{courtBright ? 'Modo noche' : 'Modo sol'}</span></button> : null}
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

  const navGroups: NavGroup[] = isSuperAdmin ? [{ label: 'Administración Lestra', items: adminItems, primary: true }] : directorGroups;
  const shell = light ? 'bg-slate-100 text-slate-950' : 'bg-[#0b1118] text-white';
  const sidebar = light ? 'border-slate-200 bg-white' : 'border-white/5 bg-[#101720]';
  const active = (path: string) => location.pathname === path || (path !== '/admin' && location.pathname.startsWith(`${path}/`));

  const renderNavItem = (item: NavItem) => {
    const enabled = isSuperAdmin || !item.feature || Boolean(planAccess?.features.includes(item.feature));
    const Icon = item.icon;
    if (!enabled) return (
      <Link key={item.to} to="/suscripcion" title={`${item.label} no está incluido en tu plan`} className={`lestra-nav-link is-locked flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold opacity-55 ${light ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5'}`}>
        <Icon aria-hidden="true" className="mr-3 h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.label}</span><span className="ml-auto text-xs" aria-hidden="true">🔒</span>
      </Link>
    );
    return (
      <Link key={item.to} to={item.to} aria-current={active(item.to) ? 'page' : undefined} className={`lestra-nav-link flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold ${active(item.to) ? isSuperAdmin ? 'is-active-admin bg-orange-500 text-white' : 'is-active bg-[#289E9D] text-white' : light ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}>
        <Icon aria-hidden="true" className="mr-3 h-5 w-5 shrink-0" /><span className="min-w-0 flex-1 truncate">{item.label}</span>{item.badge ? <span className="ml-auto rounded-lg bg-violet-500/15 px-2 py-0.5 text-[9px] font-black text-violet-300">{item.badge}</span> : null}
      </Link>
    );
  };

  const renderNavGroup = (group: NavGroup) => {
    if (group.primary) {
      return (
        <section key={group.label} className="lestra-nav-group">
          <p className={`lestra-nav-group-label mb-1.5 px-3 text-[10px] font-black uppercase ${light ? 'text-slate-400' : 'text-slate-600'}`}>{group.label}</p>
          <div className="space-y-1">{group.items.map(renderNavItem)}</div>
        </section>
      );
    }

    const containsActiveRoute = group.items.some((item) => active(item.to));
    return (
      <details key={group.label} className="lestra-nav-details" open={containsActiveRoute || undefined}>
        <summary className={`lestra-nav-summary flex min-h-10 cursor-pointer list-none items-center justify-between rounded-xl px-3 text-[11px] font-black uppercase ${light ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-500 hover:bg-white/5 hover:text-slate-300'}`}>
          <span>{group.label}</span>
          <ChevronDownIcon aria-hidden="true" className="h-4 w-4 shrink-0" />
        </summary>
        <div className="mt-1 space-y-1">{group.items.map(renderNavItem)}</div>
      </details>
    );
  };

  return <div className={`lestra-shell flex h-dvh min-w-0 overflow-hidden font-sans ${shell}`}>
    <a href="#main-content" className="lestra-skip-link">Saltar al contenido</a>
    {mobileMenuOpen ? <button type="button" aria-label="Cerrar menú" onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/70 backdrop-blur-[2px] lg:hidden" /> : null}

    <aside className={`lestra-sidebar fixed inset-y-0 left-0 z-50 flex w-[min(88vw,19rem)] shrink-0 transform flex-col justify-between border-r transition-transform duration-200 lg:static lg:z-auto lg:w-[17.5rem] lg:translate-x-0 ${sidebar} ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Navegación principal">
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className={`lestra-sidebar-brand relative border-b p-5 ${light ? 'border-slate-200' : 'border-white/5'}`}>
          <button type="button" onClick={() => setMobileMenuOpen(false)} className={`absolute right-3 top-3 rounded-xl p-2 lg:hidden ${light ? 'text-slate-500 hover:bg-slate-100' : 'text-slate-400 hover:bg-white/5'}`} aria-label="Cerrar navegación"><XMarkIcon aria-hidden="true" className="h-6 w-6" /></button>
          <div className="flex items-center gap-3">
            {logoAcademia && !isSuperAdmin ? <img src={logoAcademia} alt={`Logo de ${nombreAcademia}`} width="56" height="56" fetchPriority="high" className="h-14 w-14 shrink-0 rounded-2xl border border-[#289E9D]/40 object-cover" /> : <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#289E9D]/35 p-2 ${light ? 'bg-slate-50' : 'bg-[#0b1118]'}`}><Logo variant="mark" className="h-full w-full" /></div>}
            <div className="min-w-0 text-left"><p className="text-[10px] font-black uppercase tracking-[.16em] text-[#48d8d0]">{isSuperAdmin ? 'Lestra' : 'Academia'}</p><h1 className={`mt-1 truncate text-base font-black ${light ? 'text-slate-950' : 'text-white'}`}>{isSuperAdmin ? BRAND.name : nombreAcademia}</h1><p className={`mt-1 truncate text-[11px] font-semibold ${isSuperAdmin ? 'text-orange-500' : 'text-slate-500'}`}>{isSuperAdmin ? 'Administración global' : planAccess?.plan.trial ? 'Prueba Full' : `Plan ${planAccess?.plan.name || BRAND.name}`}</p></div>
          </div>
        </div>

        <nav className="lestra-sidebar-nav space-y-3 p-3 pb-6" aria-label="Módulos">
          {navGroups.map(renderNavGroup)}
          {!isSuperAdmin ? <Link to="/suscripcion" className="lestra-plan-link mt-4 flex min-h-11 items-center rounded-xl border px-3 text-sm font-black"><PaintBrushIcon aria-hidden="true" className="mr-3 h-5 w-5 shrink-0" /><span className="min-w-0 truncate">Plan y contratación</span></Link> : null}
        </nav>
      </div>

      <div className={`lestra-sidebar-footer space-y-2 border-t p-4 ${light ? 'border-slate-200' : 'border-white/5'}`}>
        {isSuperAdmin ? <button onClick={toggleTheme} className={`flex min-h-11 w-full items-center rounded-xl px-4 text-sm font-bold ${light ? 'bg-slate-100 text-slate-700' : 'bg-white/5 text-slate-300'}`}>{light ? <MoonIcon aria-hidden="true" className="mr-3 h-5 w-5" /> : <SunIcon aria-hidden="true" className="mr-3 h-5 w-5" />}{light ? 'Usar modo oscuro' : 'Usar modo claro'}</button> : null}
        <p className={`truncate px-3 py-1 text-[11px] ${light ? 'text-slate-500' : 'text-slate-600'}`}>{user?.email}</p>
        <button onClick={handleLogout} className="flex min-h-11 w-full items-center rounded-xl px-3 text-sm font-bold text-slate-500 hover:bg-red-900/20 hover:text-red-400">Cerrar sesión</button>
      </div>
    </aside>

    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className={`lestra-mobile-header sticky top-0 z-30 flex min-h-16 shrink-0 items-center gap-3 border-b px-3 py-2 backdrop-blur lg:hidden ${light ? 'border-slate-200 bg-white/95' : 'border-white/5 bg-[#101720]/95'}`}>
        <button type="button" onClick={() => setMobileMenuOpen(true)} className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border ${light ? 'border-slate-200 bg-slate-50 text-slate-700' : 'border-white/10 bg-white/5 text-slate-200'}`} aria-label="Abrir navegación"><Bars3Icon aria-hidden="true" className="h-6 w-6" /></button>
        <div className="min-w-0 flex-1"><p className={`truncate text-[9px] font-black uppercase tracking-[0.16em] ${isSuperAdmin ? 'text-orange-500' : 'text-[#48d8d0]'}`}>{isSuperAdmin ? 'Panel maestro' : 'Centro de gestión'}</p><p className={`truncate text-sm font-black ${light ? 'text-slate-900' : 'text-white'}`}>{isSuperAdmin ? BRAND.name : nombreAcademia}</p></div>
        {logoAcademia && !isSuperAdmin ? <img src={logoAcademia} alt="" width="40" height="40" className="h-10 w-10 shrink-0 rounded-xl border border-[#289E9D]/40 object-cover" /> : <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#289E9D]/35 p-1.5 ${light ? 'bg-slate-50' : 'bg-[#0b1118]'}`}><Logo variant="mark" className="h-full w-full" /></div>}
      </header>

      <main id="main-content" data-route={location.pathname} tabIndex={-1} className="lestra-director-main min-w-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="app-content min-h-full min-w-0 p-3 pb-24 sm:p-6 sm:pb-8">{!isSuperAdmin ? <AcademyTrialNotice subscription={planAccess?.subscription} /> : null}{!isSuperAdmin && planAccess?.subscription.blocked && location.pathname !== '/suscripcion' ? <AcademyBlocked subscription={planAccess.subscription} /> : <Outlet />}</div>
      </main>

      {!isSuperAdmin ? <nav className="lestra-mobile-dock fixed bottom-3 left-3 right-3 z-30 grid grid-cols-5 items-center rounded-2xl border border-white/10 bg-[#101720]/95 p-1.5 backdrop-blur-xl lg:hidden" aria-label="Navegación rápida">
        <Link to="/dashboard" aria-current={active('/dashboard') ? 'page' : undefined} className={active('/dashboard') ? 'is-active' : ''}><HomeIcon aria-hidden="true" className="h-5 w-5"/><span>Inicio</span></Link>
        <Link to="/alumnos" aria-current={active('/alumnos') ? 'page' : undefined} className={active('/alumnos') ? 'is-active' : ''}><UsersIcon aria-hidden="true" className="h-5 w-5"/><span>Alumnos</span></Link>
        <Link to="/asistencias" aria-current={active('/asistencias') ? 'page' : undefined} className={active('/asistencias') ? 'is-active' : ''}><ClipboardDocumentCheckIcon aria-hidden="true" className="h-5 w-5"/><span>Lista</span></Link>
        <Link to="/partidos" aria-current={active('/partidos') ? 'page' : undefined} className={active('/partidos') ? 'is-active' : ''}><TrophyIcon aria-hidden="true" className="h-5 w-5"/><span>Competir</span></Link>
        <button type="button" onClick={() => setMobileMenuOpen(true)}><Bars3Icon aria-hidden="true" className="h-5 w-5"/><span>Más</span></button>
      </nav> : null}
    </div>
  </div>;
};

export default Layout;
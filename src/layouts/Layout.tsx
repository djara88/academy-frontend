import { useEffect, type ComponentType } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  AcademicCapIcon, BanknotesIcon, BuildingOffice2Icon, CalendarDaysIcon,
  ChartBarIcon, ClipboardDocumentCheckIcon, Cog6ToothIcon, HomeIcon,
  MoonIcon, PaintBrushIcon, ShieldCheckIcon, ShoppingBagIcon, SunIcon,
  TrophyIcon, UserGroupIcon, UsersIcon,
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
type NavItem = { to: string; label: string; icon: ComponentType<{ className?: string }>; feature?: string; badge?: string };

const directorItems: NavItem[] = [
  { to: '/dashboard', label: 'Resumen', icon: HomeIcon },
  { to: '/matricula', label: 'Nueva matrícula', icon: ClipboardDocumentCheckIcon },
  { to: '/jugadores', label: 'Jugadores', icon: UsersIcon },
  { to: '/asistencias', label: 'Asistencias', icon: ClipboardDocumentCheckIcon },
  { to: '/profesores', label: 'Profesores', icon: AcademicCapIcon, feature: 'profesores' },
  { to: '/apoderados', label: 'Apoderados', icon: UserGroupIcon, feature: 'apoderados', badge: 'ADD-ON' },
  { to: '/uniformes', label: 'Uniformes', icon: ShoppingBagIcon, feature: 'uniformes' },
  { to: '/torneos', label: 'Torneos', icon: TrophyIcon, feature: 'torneos' },
  { to: '/partidos', label: 'Partidos', icon: CalendarDaysIcon, feature: 'partidos' },
  { to: '/finanzas', label: 'Finanzas academia', icon: BanknotesIcon, feature: 'finanzas' },
  { to: '/configuracion', label: 'Configuración', icon: Cog6ToothIcon },
];
const adminItems: NavItem[] = [
  { to: '/admin', label: 'Resumen ejecutivo', icon: ChartBarIcon },
  { to: '/admin/academias', label: 'Academias', icon: BuildingOffice2Icon },
  { to: '/admin/finanzas', label: 'Finanzas Syncademia', icon: BanknotesIcon },
  { to: '/admin/perfil', label: 'Mi perfil', icon: ShieldCheckIcon },
];

const Layout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useAdminTheme();
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
  const handleLogout = async () => {
    try { if (logout) await logout(); await supabase.auth.signOut(); }
    catch (error) { console.error('Error al cerrar sesión:', error); }
    finally { navigate('/login'); }
  };

  const portalShell = (kind: 'profesor' | 'apoderado') => (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="sticky top-0 z-40 border-b border-[#30363d] bg-[#151b25]/95 px-4 py-3 backdrop-blur"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <Link to={`/${kind}`} className="flex min-w-0 items-center gap-3"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#289E9D]/50 bg-[#0d1117] p-1.5"><Logo variant="mark" className="h-full w-full" /></div><div className="min-w-0"><p className="truncate font-black text-[#48d8d0]">{nombreAcademia}</p><p className="text-xs text-[#8b949e]">Portal de {kind} · {BRAND.name}</p></div></Link>
        <button type="button" onClick={handleLogout} className="rounded-lg border border-[#30363d] px-3 py-2 text-sm text-[#b1bac4] hover:border-red-500 hover:text-red-300">Salir</button>
      </div></header>
      <main className="mx-auto max-w-6xl p-4 sm:p-6"><AcademyTrialNotice subscription={planAccess?.subscription} canManage={false} />{planAccess?.subscription.blocked ? <AcademyBlocked subscription={planAccess.subscription} canManage={false} /> : <Outlet />}</main>
    </div>
  );
  if (isProfessor) return portalShell('profesor');
  if (isGuardian) return portalShell('apoderado');

  const items = isSuperAdmin ? adminItems : directorItems;
  const shell = light ? 'bg-slate-100 text-slate-950' : 'bg-[#131722] text-white';
  const sidebar = light ? 'border-slate-200 bg-white' : 'border-gray-800 bg-[#1C212D]';
  const active = (path: string) => location.pathname === path || (path !== '/admin' && location.pathname.startsWith(`${path}/`));

  return <div className={`flex h-screen overflow-hidden font-sans transition-colors ${shell}`}>
    <aside className={`flex w-64 shrink-0 flex-col justify-between border-r ${sidebar}`}><div className="flex-1 overflow-y-auto">
      <div className={`flex flex-col items-center border-b p-6 text-center ${light ? 'border-slate-200' : 'border-gray-800'}`}>
        {logoAcademia && !isSuperAdmin ? <img src={logoAcademia} alt={`Logo de ${nombreAcademia}`} className="mb-2 h-14 w-14 rounded-2xl border-2 border-[#289E9D] object-cover shadow-md" /> : <div className={`mb-2 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#289E9D]/60 p-2 shadow-md ${light ? 'bg-slate-50' : 'bg-[#131722]'}`}><Logo variant="mark" className="h-full w-full" /></div>}
        <h1 className="max-w-[200px] truncate text-xl font-black tracking-wide text-[#289E9D]">{isSuperAdmin ? BRAND.name : nombreAcademia}</h1>
        <p className={`mt-1 text-xs font-semibold ${isSuperAdmin ? 'text-orange-500' : 'text-[#8995a4]'}`}>{isSuperAdmin ? 'Administración global' : planAccess?.plan.trial ? 'Prueba Full' : `Plan ${planAccess?.plan.name || 'Syncademia'}`}</p>
      </div>
      <nav className="mt-3 space-y-1 p-3">{items.map((item) => {
        const enabled = isSuperAdmin || !item.feature || Boolean(planAccess?.features.includes(item.feature));
        const Icon = item.icon;
        if (!enabled) return <Link key={item.to} to="/suscripcion" title={`${item.label} no está incluido en tu plan`} className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold opacity-55 ${light ? 'text-slate-500 hover:bg-slate-100' : 'text-gray-500 hover:bg-[#131722]'}`}><Icon className="mr-3 h-5 w-5" /><span>{item.label}</span><span className="ml-auto text-xs">🔒</span></Link>;
        return <Link key={item.to} to={item.to} className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors ${active(item.to) ? isSuperAdmin ? 'bg-orange-500 text-white' : 'bg-[#289E9D] text-white' : light ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-950' : 'text-gray-400 hover:bg-[#131722] hover:text-white'}`}><Icon className="mr-3 h-5 w-5" /><span>{item.label}</span>{item.badge ? <span className="ml-auto rounded bg-violet-500/15 px-1.5 py-0.5 text-[9px] font-black text-violet-400">{item.badge}</span> : null}</Link>;
      })}{!isSuperAdmin ? <Link to="/suscripcion" className="mt-3 flex items-center rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-3 py-2.5 text-sm font-black text-[#48d8d0]"><PaintBrushIcon className="mr-3 h-5 w-5" />Plan y contratación</Link> : null}</nav>
    </div><div className={`space-y-2 border-t p-4 ${light ? 'border-slate-200' : 'border-gray-800'}`}>
      {isSuperAdmin ? <button onClick={toggleTheme} className={`flex w-full items-center rounded-xl px-4 py-3 text-sm font-bold ${light ? 'bg-slate-100 text-slate-700' : 'bg-[#131722] text-gray-300'}`}>{light ? <MoonIcon className="mr-3 h-5 w-5" /> : <SunIcon className="mr-3 h-5 w-5" />}{light ? 'Usar modo oscuro' : 'Usar modo claro'}</button> : null}
      <p className={`truncate px-4 py-1 text-xs ${light ? 'text-slate-500' : 'text-gray-500'}`}>{user?.email}</p><button onClick={handleLogout} className="flex w-full items-center rounded-xl px-4 py-3 text-sm text-gray-500 hover:bg-red-900/20 hover:text-red-400">Cerrar sesión</button>
    </div></aside>
    <main className="flex-1 overflow-y-auto"><div className="min-h-full p-4 sm:p-6">{!isSuperAdmin ? <AcademyTrialNotice subscription={planAccess?.subscription} /> : null}{!isSuperAdmin && planAccess?.subscription.blocked && location.pathname !== '/suscripcion' ? <AcademyBlocked subscription={planAccess.subscription} /> : <Outlet />}</div></main>
  </div>;
};

export default Layout;

import { LestraStatusDot, LestraSurface } from './ui/LestraPrimitives';
type LoadingRole = 'director' | 'superadmin' | 'public';

const storedRole = () => {
  try {
    const parsed = JSON.parse(sessionStorage.getItem('user') || '{}');
    return String(parsed?.rol || '').toLowerCase().replace(/[_-]/g, '');
  } catch {
    return '';
  }
};

export const inferLoadingRole = (): LoadingRole => {
  if (window.location.pathname.startsWith('/admin') || storedRole() === 'superadmin') return 'superadmin';
  if (['/login', '/registro', '/', '/deportivo'].includes(window.location.pathname)) return 'public';
  return 'director';
};

export default function RoleLoadingShell({
  label = 'Preparando Lestra…',
  role = inferLoadingRole(),
  compact = false,
}: {
  label?: string;
  role?: LoadingRole;
  compact?: boolean;
}) {
  const admin = role === 'superadmin';
  const publicView = role === 'public';

  const background = admin ? 'bg-[#0b1118] text-white' : publicView ? 'bg-[#f4f6f1] text-[#151a16]' : 'bg-[#eef1eb] text-[#151a16]';
  const muted = admin ? 'bg-white/[.08]' : 'bg-[#dce2d8]';

  return (
    <div className={`${compact ? 'min-h-[45vh]' : 'min-h-dvh'} ${background} grid place-items-center px-4 py-8`} role="status" aria-live="polite" aria-busy="true">
      <LestraSurface variant={admin ? 'admin' : 'default'} className="w-full max-w-3xl overflow-hidden p-5 shadow-[0_24px_70px_rgba(18,24,19,.08)] sm:p-7">
        <div className="flex items-center gap-3">
          <LestraStatusDot tone={admin ? 'admin' : 'director'} className="lestra-role-loading-pulse animate-pulse" />
          <p className={`text-xs font-black uppercase tracking-[.14em] ${admin ? 'text-orange-400' : 'text-[#617d00]'}`}>
            {admin ? 'Administración Lestra' : publicView ? 'Lestra Deportivo' : 'Centro deportivo'}
          </p>
        </div>
        <p className="mt-3 text-lg font-black">{label}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-[1.25fr_.75fr]">
          <div className="space-y-3">
            <div className={`h-12 animate-pulse rounded-2xl ${muted}`} />
            <div className={`h-28 animate-pulse rounded-2xl ${muted}`} />
            <div className="grid grid-cols-3 gap-2">
              <div className={`h-16 animate-pulse rounded-xl ${muted}`} />
              <div className={`h-16 animate-pulse rounded-xl ${muted}`} />
              <div className={`h-16 animate-pulse rounded-xl ${muted}`} />
            </div>
          </div>
          <div className={`min-h-40 animate-pulse rounded-2xl ${muted}`} />
        </div>
        <span className="sr-only">{label}</span>
      </LestraSurface>
    </div>
  );
}

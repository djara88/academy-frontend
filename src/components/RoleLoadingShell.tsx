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
  const accent = admin ? 'bg-orange-500' : 'bg-[#a3c63a]';
  const muted = admin ? 'bg-white/[.08]' : 'bg-[#dce2d8]';
  const surface = admin ? 'border-white/10 bg-[#101720]' : 'border-[#dce2d8] bg-white';

  return (
    <div className={`${compact ? 'min-h-[45vh]' : 'min-h-dvh'} ${background} grid place-items-center px-4 py-8`} role="status" aria-live="polite" aria-busy="true">
      <div className={`w-full max-w-3xl overflow-hidden rounded-[28px] border ${surface} p-5 shadow-[0_24px_70px_rgba(18,24,19,.08)] sm:p-7`}>
        <div className="flex items-center gap-3">
          <span className={`h-3 w-3 animate-pulse rounded-full ${accent}`} aria-hidden="true" />
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
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  BanknotesIcon,
  Bars3Icon,
  CalendarDaysIcon,
  ChartBarIcon,
  ChatBubbleLeftRightIcon,
  ClipboardDocumentCheckIcon,
  Cog6ToothIcon,
  HeartIcon,
  HomeIcon,
  LockClosedIcon,
  ShieldCheckIcon,
  ShoppingBagIcon,
  TrophyIcon,
  UserGroupIcon,
  UserPlusIcon,
  UsersIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { Logo } from '../Logo';

type NavItem = {
  to: string;
  label: string;
  shortLabel?: string;
  icon: typeof HomeIcon;
  feature?: string;
  badge?: string;
};

type CommandZone = {
  key: 'jornada' | 'plantel' | 'competir' | 'operacion' | 'academia';
  label: string;
  displayLabel: string;
  home: string;
  icon: typeof HomeIcon;
  items: NavItem[];
};

type DirectorCommandBarProps = {
  pathname: string;
  academyName: string;
  academyLogo?: string | null;
  features?: string[];
  planLabel: string;
  email?: string | null;
  onLogout: () => void | Promise<void>;
};

const zones: CommandZone[] = [
  {
    key: 'jornada',
    label: 'Jornada',
    displayLabel: 'Inicio',
    home: '/dashboard',
    icon: HomeIcon,
    items: [
      { to: '/dashboard', label: 'Inicio', icon: HomeIcon },
      { to: '/asistencias', label: 'Asistencia', icon: ClipboardDocumentCheckIcon },
      { to: '/solicitudes', label: 'Solicitudes', icon: UserPlusIcon },
      { to: '/matricula', label: 'Matrícula', icon: ClipboardDocumentCheckIcon },
    ],
  },
  {
    key: 'plantel',
    label: 'Plantel',
    displayLabel: 'Equipo',
    home: '/alumnos',
    icon: UsersIcon,
    items: [
      { to: '/alumnos', label: 'Deportistas', icon: UsersIcon },
      { to: '/profesores', label: 'Profesores', icon: AcademicCapIcon, feature: 'profesores' },
      { to: '/apoderados', label: 'Apoderados', icon: UserGroupIcon, feature: 'apoderados', badge: 'ADD-ON' },
      { to: '/salud-deportiva', label: 'Salud', icon: HeartIcon, feature: 'ficha_medica' },
    ],
  },
  {
    key: 'competir',
    label: 'Competir',
    displayLabel: 'Competencias',
    home: '/partidos',
    icon: TrophyIcon,
    items: [
      { to: '/partidos', label: 'Partidos', icon: TrophyIcon, feature: 'partidos' },
      { to: '/torneos', label: 'Torneos', icon: TrophyIcon, feature: 'torneos' },
      { to: '/amistosos', label: 'Amistosos', icon: CalendarDaysIcon, feature: 'amistosos' },
      { to: '/rendimiento/analitica', label: 'Rendimiento', icon: ChartBarIcon, feature: 'analitica_avanzada' },
    ],
  },
  {
    key: 'operacion',
    label: 'Operación',
    displayLabel: 'Gestión',
    home: '/finanzas',
    icon: BanknotesIcon,
    items: [
      { to: '/finanzas', label: 'Finanzas', icon: BanknotesIcon, feature: 'finanzas' },
      { to: '/comunicaciones', label: 'Comunicaciones', icon: ChatBubbleLeftRightIcon, feature: 'apoderados', badge: 'ADD-ON' },
      { to: '/uniformes', label: 'Uniformes', icon: ShoppingBagIcon, feature: 'uniformes' },
      { to: '/uniformes/dorsales', label: 'Dorsales', icon: TrophyIcon, feature: 'uniformes' },
    ],
  },
  {
    key: 'academia',
    label: 'Academia',
    displayLabel: 'Academia',
    home: '/configuracion',
    icon: Cog6ToothIcon,
    items: [
      { to: '/configuracion', label: 'Configuración', icon: Cog6ToothIcon },
      { to: '/privacidad', label: 'Privacidad', icon: ShieldCheckIcon },
      { to: '/suscripcion', label: 'Plan', icon: BanknotesIcon },
    ],
  },
];

const isPathActive = (pathname: string, path: string) => pathname === path || (path !== '/dashboard' && pathname.startsWith(`${path}/`));

const findActiveZone = (pathname: string) => zones.find((zone) => zone.items.some((item) => isPathActive(pathname, item.to))) || zones[0];

export default function DirectorCommandBar({
  pathname,
  academyName,
  academyLogo,
  features,
  planLabel,
  email,
  onLogout,
}: DirectorCommandBarProps) {
  const [moreOpen, setMoreOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const activeZone = useMemo(() => findActiveZone(pathname), [pathname]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (moreOpen && !dialog.open) dialog.showModal();
    if (!moreOpen && dialog.open) dialog.close();
  }, [moreOpen]);

  useEffect(() => { setMoreOpen(false); }, [pathname]);

  const enabled = (item: NavItem) => !item.feature || !features || features.includes(item.feature);

  const itemTarget = (item: NavItem) => enabled(item) ? item.to : '/suscripcion';

  const renderContextItem = (item: NavItem) => {
    const Icon = item.icon;
    const itemEnabled = enabled(item);
    const current = isPathActive(pathname, item.to);
    return (
      <Link
        key={item.to}
        to={itemTarget(item)}
        aria-current={current ? 'page' : undefined}
        title={itemEnabled ? item.label : `${item.label} no está incluido en tu plan`}
        className={`group inline-flex min-h-9 shrink-0 items-center gap-1.5 border-b-2 px-2.5 text-[11px] font-black transition ${current
          ? 'border-[var(--ls-accent)] text-white'
          : 'border-transparent text-white/58 hover:border-white/20 hover:text-white'} ${itemEnabled ? '' : 'opacity-55'}`}
      >
        <Icon aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
        <span>{item.shortLabel || item.label}</span>
        {!itemEnabled ? <LockClosedIcon aria-hidden="true" className="h-3 w-3" /> : null}
        {item.badge && itemEnabled ? <span className="rounded-md border border-white/15 px-1.5 py-0.5 text-[7px] tracking-[.08em] text-white/55">{item.badge}</span> : null}
      </Link>
    );
  };

  return (
    <>
      <header className="lestra-command-bar sticky top-0 z-40 hidden shrink-0 border-b border-white/[.08] bg-[var(--ls-sidebar)] text-white lg:block">
        <div className="mx-auto flex min-h-[60px] max-w-[1680px] items-stretch px-5">
          <Link to="/dashboard" className="flex min-w-[225px] items-center gap-2.5 border-r border-white/[.08] pr-4">
            {academyLogo ? (
              <img src={academyLogo} alt={`Logo de ${academyName}`} width="34" height="34" className="h-8 w-8 shrink-0 rounded-lg border border-white/10 object-cover" />
            ) : (
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.04] p-1.5"><Logo variant="mark" className="h-full w-full" /></span>
            )}
            <span className="min-w-0">
              <span className="block text-[8px] font-black uppercase tracking-[.14em] text-[var(--ls-accent-on-dark)]">Centro deportivo</span>
              <span className="mt-0.5 block truncate text-[13px] font-black text-white">{academyName}</span>
            </span>
          </Link>

          <nav className="flex min-w-0 flex-1 items-stretch" aria-label="Áreas principales">
            {zones.map((zone) => {
              const Icon = zone.icon;
              const current = activeZone.key === zone.key;
              return (
                <Link
                  key={zone.key}
                  to={zone.home}
                  aria-current={current ? 'page' : undefined}
                  className={`relative flex min-w-[104px] flex-1 items-center justify-center gap-1.5 px-3 text-[12px] font-black transition ${current ? 'bg-white/[.055] text-white' : 'text-white/55 hover:bg-white/[.03] hover:text-white'}`}
                >
                  <Icon aria-hidden="true" className={`h-3.5 w-3.5 shrink-0 ${current ? 'text-[var(--ls-accent)]' : 'text-current'}`} />
                  <span>{zone.displayLabel}</span>
                  {current ? <span aria-hidden="true" className="absolute inset-x-6 bottom-0 h-0.5 rounded-t-full bg-[var(--ls-accent)]" /> : null}
                </Link>
              );
            })}
          </nav>

          <div className="flex min-w-[190px] items-center justify-end gap-2.5 border-l border-white/[.08] pl-4">
            <span className="min-w-0 text-right">
              <span className="block truncate text-[9px] font-black uppercase tracking-[.07em] text-white/42">{planLabel}</span>
              <span className="mt-0.5 block max-w-[135px] truncate text-[10px] font-semibold text-white/65">{email}</span>
            </span>
            <button type="button" onClick={() => void onLogout()} className="min-h-9 rounded-lg border border-white/10 px-2.5 text-[11px] font-black text-white/65 hover:bg-white/[.06] hover:text-white">Salir</button>
          </div>
        </div>

        <div className="border-t border-white/[.055] bg-black/10">
          <div className="mx-auto flex max-w-[1680px] items-center gap-3 px-5">
            <div className="flex min-w-[205px] items-center gap-2 py-2 text-[9px] font-black uppercase tracking-[.12em] text-white/38">
              <span aria-hidden="true" className="h-px w-6 bg-[var(--ls-accent)]" />
              {activeZone.displayLabel}
            </div>
            <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto" aria-label={`Herramientas de ${activeZone.displayLabel}`}>
              {activeZone.items.map(renderContextItem)}
            </nav>
          </div>
        </div>
      </header>

      <header className="lestra-mobile-header sticky top-0 z-40 flex min-h-14 shrink-0 items-center gap-2.5 border-b border-white/[.08] bg-[var(--ls-sidebar)]/95 px-3 py-2 text-white backdrop-blur lg:hidden">
        {academyLogo ? (
          <img src={academyLogo} alt="" width="32" height="32" className="h-8 w-8 shrink-0 rounded-lg border border-white/10 object-cover" />
        ) : (
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[.04] p-1.5"><Logo variant="mark" className="h-full w-full" /></span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[8px] font-black uppercase tracking-[.14em] text-[var(--ls-accent-on-dark)]">{activeZone.displayLabel}</p>
          <p className="truncate text-[13px] font-black text-white">{academyName}</p>
        </div>
        <button type="button" onClick={() => setMoreOpen(true)} className="grid h-10 w-10 place-items-center rounded-lg border border-white/10 bg-white/[.04] text-white" aria-label="Abrir navegación"><Bars3Icon aria-hidden="true" className="h-5 w-5" /></button>
      </header>

      <nav className="lestra-mobile-dock fixed bottom-3 left-3 right-3 z-40 grid grid-cols-5 items-center rounded-2xl border border-white/10 bg-[var(--ls-sidebar)]/96 p-1.5 backdrop-blur lg:hidden" aria-label="Navegación rápida">
        <MobileDockLink to="/dashboard" label="Inicio" pathname={pathname} icon={HomeIcon} />
        <MobileDockLink to="/alumnos" label="Equipo" pathname={pathname} icon={UsersIcon} />
        <MobileDockLink to="/asistencias" label="Asistencia" pathname={pathname} icon={ClipboardDocumentCheckIcon} />
        <MobileDockLink to="/partidos" label="Partidos" pathname={pathname} icon={TrophyIcon} />
        <button type="button" onClick={() => setMoreOpen(true)} className="flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-black text-white/62" aria-label="Abrir todas las áreas"><Bars3Icon aria-hidden="true" className="h-4 w-4" /><span>Más</span></button>
      </nav>

      <dialog ref={dialogRef} onClose={() => setMoreOpen(false)} className="m-0 mt-auto max-h-[84dvh] w-full max-w-none rounded-t-[28px] border-0 bg-[var(--ls-sidebar)] p-0 text-white shadow-2xl backdrop:bg-black/70 lg:hidden">
        <div className="mx-auto max-w-xl px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-3">
          <div aria-hidden="true" className="mx-auto h-1 w-12 rounded-full bg-white/18" />
          <div className="mt-4 flex items-center justify-between gap-3 border-b border-white/[.08] pb-4">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[.15em] text-[var(--ls-accent-on-dark)]">Mapa de trabajo</p>
              <p className="mt-1 truncate text-lg font-black">{academyName}</p>
            </div>
            <button type="button" onClick={() => setMoreOpen(false)} className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 text-white/70" aria-label="Cerrar navegación"><XMarkIcon aria-hidden="true" className="h-5 w-5" /></button>
          </div>

          <div className="max-h-[62dvh] overflow-y-auto py-3">
            {zones.map((zone) => {
              const ZoneIcon = zone.icon;
              const currentZone = activeZone.key === zone.key;
              return (
                <section key={zone.key} className="border-b border-white/[.07] py-4 last:border-b-0">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.13em] text-white/42">
                    <ZoneIcon aria-hidden="true" className={`h-3.5 w-3.5 ${currentZone ? 'text-[var(--ls-accent)]' : ''}`} />
                    {zone.displayLabel}
                  </div>
                  <div className="mt-2 grid gap-1 sm:grid-cols-2">
                    {zone.items.map((item) => {
                      const Icon = item.icon;
                      const itemEnabled = enabled(item);
                      const current = isPathActive(pathname, item.to);
                      return (
                        <Link key={item.to} to={itemTarget(item)} onClick={() => setMoreOpen(false)} className={`flex min-h-11 items-center gap-2.5 rounded-xl px-3 text-[13px] font-black ${current ? 'bg-[var(--ls-accent)] text-[var(--ls-ink)]' : 'text-white/72 hover:bg-white/[.05] hover:text-white'} ${itemEnabled ? '' : 'opacity-50'}`}>
                          <Icon aria-hidden="true" className="h-4 w-4 shrink-0" />
                          <span className="min-w-0 flex-1 truncate">{item.label}</span>
                          {!itemEnabled ? <LockClosedIcon aria-hidden="true" className="h-3.5 w-3.5" /> : null}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          <div className="border-t border-white/[.08] pt-3">
            <p className="truncate px-2 text-[11px] font-semibold text-white/40">{email}</p>
            <button type="button" onClick={() => void onLogout()} className="mt-2 min-h-11 w-full rounded-xl border border-white/10 text-sm font-black text-white/70 hover:bg-white/[.05] hover:text-white">Cerrar sesión</button>
          </div>
        </div>
      </dialog>
    </>
  );
}

function MobileDockLink({ to, label, pathname, icon: Icon }: { to: string; label: string; pathname: string; icon: typeof HomeIcon }) {
  const current = isPathActive(pathname, to);
  return (
    <Link to={to} aria-current={current ? 'page' : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-xl text-[9px] font-black ${current ? 'bg-[var(--ls-accent)] text-[var(--ls-ink)]' : 'text-white/62'}`}>
      <Icon aria-hidden="true" className="h-4 w-4" />
      <span>{label}</span>
    </Link>
  );
}

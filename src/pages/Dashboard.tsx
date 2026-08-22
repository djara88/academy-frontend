import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckBadgeIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  RocketLaunchIcon,
  TrophyIcon,
  UserGroupIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { getAcademyName } from '../config/brand';

type Alert = {
  id: string;
  racha: number;
  ultima_ausencia: string;
  jugadores?: { nombre: string } | null;
  categorias?: { nombre: string } | null;
};

type Match = {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
  hora_citacion?: string | null;
  ubicacion?: string | null;
  condicion?: string | null;
  categorias?: { nombre: string } | null;
};

type StructureSite = { id: string; activa?: boolean; ramas?: { id: string; activa?: boolean }[] };

type DashboardData = {
  academia: { nombre: string; estado?: string | null };
  plan: {
    plan: { name: string; trial: boolean };
    limits: { professors: number };
    addOns: { guardians: boolean };
    features: string[];
  };
  kpis: {
    jugadores: number;
    profesores: { activos: number; limite: number };
    categorias: number;
    proximos_partidos: number;
    asistencia_mes: number | null;
    ingresos_mes: number;
    egresos_mes: number;
    saldo_mes: number;
    por_cobrar: number;
    cobros_vencidos: number;
    uniformes_pendientes: number;
  };
  prioridades: {
    alertas_asistencia: Alert[];
    categorias_sin_profesor: { id: string; nombre: string }[];
  };
  proximos_partidos: Match[];
};

const money = (value: number) => new Intl.NumberFormat('es-CL', {
  style: 'currency',
  currency: 'CLP',
  maximumFractionDigits: 0,
}).format(value || 0);

const shortDate = (value: string) => new Intl.DateTimeFormat('es-CL', {
  weekday: 'short',
  day: '2-digit',
  month: 'short',
}).format(new Date(`${value}T12:00:00`));

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value || 0)));

const KpiCard = ({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: typeof UsersIcon;
  tone?: 'default' | 'lime' | 'blue' | 'ink';
}) => (
  <article className={`new-era-card new-era-kpi ${tone === 'lime' ? 'is-lime' : tone === 'blue' ? 'is-blue' : tone === 'ink' ? 'is-ink' : ''}`}>
    <div className="new-era-kpi-icon"><Icon className="h-5 w-5" /></div>
    <p className="new-era-kpi-label">{label}</p>
    <p className="new-era-kpi-value">{value}</p>
    <p className="new-era-kpi-detail">{detail}</p>
  </article>
);

const QuickAction = ({
  to,
  label,
  icon: Icon,
  primary = false,
}: {
  to: string;
  label: string;
  icon: typeof PlusIcon;
  primary?: boolean;
}) => (
  <Link to={to} className={`new-era-quick ${primary ? 'is-primary' : ''}`}>
    <span className="new-era-quick-icon"><Icon className="h-5 w-5" /></span>
    <span className="flex items-end justify-between gap-2">
      <span className="text-sm font-black leading-tight">{label}</span>
      <ArrowRightIcon className="h-4 w-4 shrink-0" />
    </span>
  </Link>
);

const Dashboard = () => {
  const { user } = useAuth();
  const { notify } = useAppDialog();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-resumen'],
    queryFn: async () => (await api.get('/api/dashboard/resumen')).data.data as DashboardData,
    refetchInterval: 120_000,
  });

  const { data: structure, isLoading: structureLoading, error: structureError } = useQuery({
    queryKey: ['dashboard-structure'],
    queryFn: async () => (await api.get('/api/estructura')).data.data as StructureSite[],
    staleTime: 120_000,
    retry: 1,
  });

  const reviewAlert = async (id: string) => {
    try {
      await api.patch(`/api/profesores/alertas/asistencia/${id}/revisada`);
      await refetch();
    } catch (reviewError: any) {
      await notify(reviewError.response?.data?.error || 'No pudimos revisar esta alerta.', {
        title: getAcademyName(user?.nombre_academia),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[70vh] place-items-center">
        <div className="text-center">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-[#d9ded4] border-t-[#b6ed00]" />
          <p className="mt-4 font-black text-[#596057]">Organizando tu academia...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="new-era-card mx-auto max-w-xl p-7 text-center">
        <ExclamationTriangleIcon className="mx-auto h-9 w-9 text-[#ff4e57]" />
        <h1 className="mt-3 text-xl font-black text-[#111511]">No pudimos abrir tu resumen</h1>
        <p className="mt-2 text-sm text-[#6f756f]">Tus datos siguen seguros. Intenta cargar nuevamente.</p>
        <button type="button" onClick={() => void refetch()} className="mt-5 min-h-11 rounded-xl bg-[#111511] px-5 text-sm font-black text-white">
          Intentar de nuevo
        </button>
      </div>
    );
  }

  const attendance = clampPercent(data.kpis.asistencia_mes ?? 0);
  const priorities = data.prioridades.alertas_asistencia.length
    + data.prioridades.categorias_sin_profesor.length
    + data.kpis.cobros_vencidos;
  const professorLimit = Math.max(data.kpis.profesores.limite, 1);
  const professorUsage = clampPercent((data.kpis.profesores.activos / professorLimit) * 100);
  const financeMax = Math.max(data.kpis.ingresos_mes, data.kpis.egresos_mes, data.kpis.por_cobrar, 1);
  const financeBars = [
    { label: 'Ingresos', value: data.kpis.ingresos_mes, className: 'is-lime' },
    { label: 'Egresos', value: data.kpis.egresos_mes, className: '' },
    { label: 'Por cobrar', value: data.kpis.por_cobrar, className: 'is-blue' },
  ];
  const structureReady = Boolean(structure?.some((site) => site.activa !== false && site.ramas?.some((branch) => branch.activa !== false)));
  const onboardingSteps = [
    { code: 'structure', label: 'Configura tu academia', detail: 'Agrega una sede y el deporte que trabajas.', done: structureReady, to: '/configuracion/estructura', icon: BuildingOffice2Icon },
    { code: 'category', label: 'Crea una categoría', detail: 'Organiza a tus deportistas.', done: data.kpis.categorias > 0, to: '/jugadores', icon: UserGroupIcon },
    { code: 'player', label: 'Agrega un deportista', detail: 'Deja su matrícula lista.', done: data.kpis.jugadores > 0, to: '/matricula', icon: UsersIcon },
    { code: 'professor', label: 'Suma a un profesor', detail: 'Así podrá trabajar con sus categorías.', done: data.kpis.profesores.activos > 0, to: '/profesores', icon: AcademicCapIcon },
    { code: 'attendance', label: 'Registra asistencia', detail: 'Comienza el historial del equipo.', done: data.kpis.asistencia_mes !== null, to: '/asistencias', icon: ClipboardDocumentCheckIcon },
  ];
  const completedOnboarding = onboardingSteps.filter((step) => step.done).length;
  const showOnboarding = !structureLoading && !structureError && completedOnboarding < onboardingSteps.length;

  return (
    <div className="new-era-dashboard mx-auto max-w-[1560px] space-y-4 pb-12 sm:space-y-5">
      <section className="new-era-hero">
        <div className="relative z-10 flex flex-col gap-7 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="new-era-eyebrow">Lestra · nueva era</div>
            <h1>{data.academia.nombre}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 sm:text-base">Todo lo importante de tu academia, claro y a mano.</p>
            <div className="mt-5 flex flex-wrap gap-2 text-xs font-black">
              <span className="rounded-full bg-[#111511] px-3 py-2 text-white">{data.plan.plan.trial ? 'Prueba activa' : `Plan ${data.plan.plan.name}`}</span>
              <span className="rounded-full border border-[#cdd3c7] bg-white/70 px-3 py-2 text-[#4f574d]">{data.kpis.categorias} categorías</span>
              {data.plan.addOns.guardians ? <span className="rounded-full border border-[#cdd3c7] bg-white/70 px-3 py-2 text-[#4f574d]">Familias activas</span> : null}
            </div>
          </div>
          <div className={`new-era-status ${priorities ? 'is-alert' : 'is-clear'}`}>
            {priorities ? `${priorities} cosas necesitan tu atención` : 'Todo está al día'}
          </div>
        </div>
      </section>

      <section className="new-era-grid new-era-kpis" aria-label="Indicadores principales">
        <KpiCard label="Deportistas" value={data.kpis.jugadores} detail={`${data.kpis.categorias} categorías activas`} icon={UsersIcon} tone="lime" />
        <KpiCard label="Asistencia" value={data.kpis.asistencia_mes === null ? 'Sin datos' : `${attendance}%`} detail="Promedio del mes" icon={CheckBadgeIcon} tone="blue" />
        <KpiCard label="Ingresos del mes" value={money(data.kpis.ingresos_mes)} detail={`${money(data.kpis.por_cobrar)} por cobrar`} icon={BanknotesIcon} tone="ink" />
        <KpiCard label="Próximos encuentros" value={data.kpis.proximos_partidos} detail={`${data.kpis.profesores.activos} profesores activos`} icon={CalendarDaysIcon} />
      </section>

      <section className="new-era-grid new-era-chart-layout">
        <article className="new-era-card new-era-chart-card">
          <div className="flex items-center justify-between gap-3">
            <div><p className="new-era-section-kicker">Rendimiento</p><h2 className="new-era-section-title mt-1">Asistencia del mes</h2></div>
            <Link to="/asistencias" className="text-xs font-black text-[#495047]">Ver detalle →</Link>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-7">
            <div className="new-era-ring" style={{ background: `conic-gradient(#b6ed00 ${attendance}%, #e8ebe3 0)` }}>
              <div className="new-era-ring-center"><strong>{data.kpis.asistencia_mes === null ? '—' : `${attendance}%`}</strong><span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-[#7a8178]">asistencia</span></div>
            </div>
            <div className="min-w-[180px] flex-1">
              <p className="text-3xl font-black tracking-[-.05em] text-[#111511]">{data.kpis.jugadores}</p>
              <p className="mt-1 text-sm font-bold text-[#6f756f]">deportistas registrados</p>
              <div className="mt-5">
                <div className="flex justify-between text-xs font-bold text-[#777e74]"><span>Equipo técnico activo</span><span>{data.kpis.profesores.activos}/{data.kpis.profesores.limite}</span></div>
                <div className="new-era-progress-track mt-2"><div className="new-era-progress-fill" style={{ width: `${professorUsage}%` }} /></div>
              </div>
            </div>
          </div>
        </article>

        <article className="new-era-card new-era-chart-card">
          <p className="new-era-section-kicker">Finanzas</p>
          <h2 className="new-era-section-title mt-1">Movimiento del mes</h2>
          <div className="new-era-bars" aria-label="Ingresos, egresos y montos por cobrar">
            {financeBars.map((bar) => {
              const height = Math.max(6, (bar.value / financeMax) * 100);
              return (
                <div key={bar.label} className="new-era-bar-col" title={`${bar.label}: ${money(bar.value)}`}>
                  <div className="new-era-bar-track"><div className={`new-era-bar ${bar.className}`} style={{ height: `${height}%` }} /></div>
                  <p className="new-era-bar-label">{bar.label}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex items-end justify-between gap-4 border-t border-[#eceee9] pt-4">
            <div><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#7b8179]">Saldo</p><p className={`mt-1 text-xl font-black ${data.kpis.saldo_mes < 0 ? 'text-[#ff4e57]' : 'text-[#111511]'}`}>{money(data.kpis.saldo_mes)}</p></div>
            <Link to="/finanzas" className="text-xs font-black text-[#111511]">Ver finanzas →</Link>
          </div>
        </article>

        <article className="new-era-card new-era-chart-card">
          <p className="new-era-section-kicker">Estado del equipo</p>
          <h2 className="new-era-section-title mt-1">Lo que requiere atención</h2>
          <div className="new-era-progress-list">
            <div className="new-era-progress-row"><span>Pagos vencidos</span><div className="new-era-progress-track"><div className="h-full rounded-full bg-[#ff4e57]" style={{ width: `${Math.min(100, data.kpis.cobros_vencidos * 8)}%` }} /></div><strong>{data.kpis.cobros_vencidos}</strong></div>
            <div className="new-era-progress-row"><span>Asistencia</span><div className="new-era-progress-track"><div className="h-full rounded-full bg-[#ffb020]" style={{ width: `${Math.min(100, data.prioridades.alertas_asistencia.length * 20)}%` }} /></div><strong>{data.prioridades.alertas_asistencia.length}</strong></div>
            <div className="new-era-progress-row"><span>Sin profesor</span><div className="new-era-progress-track"><div className="h-full rounded-full bg-[#3e7bff]" style={{ width: `${Math.min(100, data.prioridades.categorias_sin_profesor.length * 25)}%` }} /></div><strong>{data.prioridades.categorias_sin_profesor.length}</strong></div>
          </div>
          {!priorities ? <div className="new-era-empty mt-5"><CheckCircleIcon className="mx-auto h-7 w-7 text-[#16a36a]" /><p className="mt-2 font-black text-[#111511]">Nada urgente por ahora</p></div> : null}
        </article>
      </section>

      <section className="new-era-card p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div><p className="new-era-section-kicker">Hazlo rápido</p><h2 className="new-era-section-title mt-1">Accesos directos</h2></div>
          <span className="hidden text-xs font-bold text-[#737a71] sm:inline">Menos clics. Más cancha.</span>
        </div>
        <div className="new-era-quick-grid mt-5">
          <QuickAction to="/matricula" label="Nueva matrícula" icon={PlusIcon} primary />
          <QuickAction to="/asistencias" label="Registrar asistencia" icon={ClipboardDocumentCheckIcon} />
          <QuickAction to="/partidos" label="Programar encuentro" icon={TrophyIcon} />
          <QuickAction to="/finanzas" label="Cobros y pagos" icon={BanknotesIcon} />
          <QuickAction to="/profesores" label="Equipo técnico" icon={AcademicCapIcon} />
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.08fr_.92fr]">
        <article className="new-era-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="new-era-section-kicker">Agenda</p><h2 className="new-era-section-title mt-1">Lo próximo</h2></div>
            <Link to="/partidos" className="text-xs font-black text-[#111511]">Ver agenda →</Link>
          </div>
          <div className="mt-3">
            {data.proximos_partidos.length ? data.proximos_partidos.slice(0, 5).map((match) => {
              const formatted = shortDate(match.fecha).split(' ');
              return (
                <article key={match.id} className="new-era-list-item">
                  <div className="new-era-date"><strong>{formatted[1] || formatted[0]}</strong><span>{formatted[0]}</span></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-black text-[#111511]">vs {match.rival}</p><span className="rounded-full bg-[#f0f2ec] px-2 py-1 text-[9px] font-black uppercase text-[#6f756f]">{match.condicion || 'Encuentro'}</span></div>
                    <p className="mt-1 truncate text-xs text-[#737a71]">{match.categorias?.nombre || 'Sin categoría'} · {match.ubicacion || 'Lugar por confirmar'}</p>
                    <p className="mt-2 text-xs font-black text-[#4d554b]">{match.hora_citacion ? `Citación ${match.hora_citacion.slice(0, 5)} · ` : ''}Inicio {match.hora?.slice(0, 5)}</p>
                  </div>
                  <ArrowRightIcon className="h-4 w-4 shrink-0 text-[#90968e]" />
                </article>
              );
            }) : <div className="new-era-empty mt-4"><ClockIcon className="mx-auto h-7 w-7" /><p className="mt-2 font-black text-[#111511]">No hay encuentros programados</p><Link to="/partidos" className="mt-3 inline-block font-black text-[#44503d]">Programar uno →</Link></div>}
          </div>
        </article>

        <article className="new-era-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="new-era-section-kicker">Prioridades</p><h2 className="new-era-section-title mt-1">Para revisar hoy</h2></div>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${priorities ? 'bg-[#fff0cb] text-[#7b5300]' : 'bg-[#e8f7ef] text-[#087346]'}`}>{priorities}</span>
          </div>
          <div className="mt-3">
            {data.kpis.cobros_vencidos > 0 ? <Link to="/finanzas" className="new-era-alert"><span className="new-era-alert-dot is-danger" /><div className="min-w-0 flex-1"><p className="font-black text-[#111511]">{data.kpis.cobros_vencidos} pagos vencidos</p><p className="text-xs text-[#737a71]">Hay familias con pagos pendientes.</p></div><ArrowRightIcon className="h-4 w-4 text-[#949a92]" /></Link> : null}
            {data.prioridades.alertas_asistencia.slice(0, 3).map((alert) => <div key={alert.id} className="new-era-alert"><span className="new-era-alert-dot" /><div className="min-w-0 flex-1"><p className="font-black text-[#111511]">{alert.jugadores?.nombre || 'Deportista'} · {alert.racha} ausencias</p><p className="text-xs text-[#737a71]">{alert.categorias?.nombre || 'Categoría'} necesita seguimiento</p></div><button type="button" onClick={() => void reviewAlert(alert.id)} className="shrink-0 rounded-xl border border-[#d9ddd5] px-3 py-2 text-xs font-black text-[#414840]">Revisado</button></div>)}
            {data.prioridades.categorias_sin_profesor.length > 0 ? <Link to="/profesores" className="new-era-alert"><span className="new-era-alert-dot is-blue" /><div className="min-w-0 flex-1"><p className="font-black text-[#111511]">{data.prioridades.categorias_sin_profesor.length} categorías sin profesor</p><p className="truncate text-xs text-[#737a71]">{data.prioridades.categorias_sin_profesor.map((item) => item.nombre).join(', ')}</p></div><ArrowRightIcon className="h-4 w-4 text-[#949a92]" /></Link> : null}
            {!priorities ? <div className="new-era-empty mt-4"><CheckCircleIcon className="mx-auto h-7 w-7 text-[#16a36a]" /><p className="mt-2 font-black text-[#111511]">Todo al día</p><p className="mt-1">No tienes pendientes importantes.</p></div> : null}
          </div>
        </article>
      </section>

      {showOnboarding ? (
        <section className="new-era-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#c8ff00]"><RocketLaunchIcon className="h-5 w-5" /></span>
              <div><p className="new-era-section-kicker">Primeros pasos</p><h2 className="new-era-section-title mt-1">Deja Lestra listo para trabajar contigo</h2><p className="mt-1 text-sm text-[#737a71]">Esta guía desaparece cuando termines.</p></div>
            </div>
            <div className="min-w-52">
              <div className="flex justify-between text-xs font-black text-[#6f756f]"><span>Avance</span><span>{completedOnboarding}/{onboardingSteps.length}</span></div>
              <div className="new-era-progress-track mt-2"><div className="new-era-progress-fill" style={{ width: `${(completedOnboarding / onboardingSteps.length) * 100}%` }} /></div>
            </div>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {onboardingSteps.map(({ code, label, detail, done, to, icon: Icon }) => (
              <Link key={code} to={to} className={`rounded-2xl border p-4 ${done ? 'border-[#dce8df] bg-[#f2faf5]' : 'border-[#e0e3dc] bg-[#fafbf8]'}`}>
                <div className="flex items-center justify-between"><Icon className="h-5 w-5 text-[#4d554b]" />{done ? <CheckCircleIcon className="h-5 w-5 text-[#16a36a]" /> : <ArrowRightIcon className="h-4 w-4 text-[#7b8179]" />}</div>
                <p className="mt-4 text-sm font-black text-[#111511]">{label}</p>
                <p className="mt-1 text-xs leading-5 text-[#737a71]">{done ? 'Listo' : detail}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
};

export default Dashboard;
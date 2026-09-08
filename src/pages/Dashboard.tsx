import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  AcademicCapIcon,
  ArrowRightIcon,
  BanknotesIcon,
  BuildingOffice2Icon,
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
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

const longToday = () => new Intl.DateTimeFormat('es-CL', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date());

const clampPercent = (value: number) => Math.min(100, Math.max(0, Math.round(value || 0)));

const DirectorAction = ({
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
  <Link
    to={to}
    className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition ${primary
      ? 'border-[var(--ls-accent-strong)] bg-[var(--ls-accent)] text-[var(--ls-ink)] hover:bg-[var(--ls-accent-strong)]'
      : 'border-[var(--ls-line-strong)] bg-[var(--ls-surface)] text-[var(--ls-ink)] hover:bg-[var(--ls-surface-soft)]'}`}
  >
    <Icon aria-hidden="true" className="h-4 w-4" />
    {label}
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
      await notify(reviewError.response?.data?.error || 'No pudimos marcar esta alerta como revisada. Intenta nuevamente.', {
        title: getAcademyName(user?.nombre_academia),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="grid min-h-[62vh] place-items-center" role="status" aria-live="polite">
        <div className="text-center">
          <div aria-hidden="true" className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[var(--ls-line)] border-t-[var(--ls-accent-strong)]" />
          <p className="mt-4 font-black text-[var(--ls-muted)]">Preparando la jornada deportiva…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="mx-auto max-w-xl rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)] p-7 text-center">
        <ExclamationTriangleIcon aria-hidden="true" className="mx-auto h-9 w-9 text-[var(--ls-danger)]" />
        <h1 className="mt-3 text-xl font-black text-[var(--ls-ink)]">No pudimos abrir la jornada</h1>
        <p className="mt-2 text-sm text-[var(--ls-muted)]">No mostraremos información anterior como si estuviera actualizada. Revisa tu conexión e intenta nuevamente.</p>
        <button type="button" onClick={() => void refetch()} className="mt-5 min-h-11 rounded-xl bg-[var(--ls-ink)] px-5 text-sm font-black text-white hover:opacity-90">
          Sincronizar jornada
        </button>
      </section>
    );
  }

  const attendance = clampPercent(data.kpis.asistencia_mes ?? 0);
  const attentionCount = data.kpis.cobros_vencidos
    + data.prioridades.alertas_asistencia.length
    + data.prioridades.categorias_sin_profesor.length
    + data.kpis.uniformes_pendientes;
  const nextMatch = data.proximos_partidos[0] || null;
  const remainingMatches = data.proximos_partidos.slice(1, 5);
  const professorCapacity = data.kpis.profesores.limite > 0
    ? `${data.kpis.profesores.activos}/${data.kpis.profesores.limite}`
    : String(data.kpis.profesores.activos);

  const structureReady = Boolean(structure?.some((site) => site.activa !== false && site.ramas?.some((branch) => branch.activa !== false)));
  const onboardingSteps = [
    { code: 'structure', label: 'Estructura deportiva', detail: 'Agrega una sede y una disciplina.', done: structureReady, to: '/configuracion/estructura', icon: BuildingOffice2Icon },
    { code: 'category', label: 'Categorías', detail: 'Organiza a tus deportistas.', done: data.kpis.categorias > 0, to: '/alumnos', icon: UserGroupIcon },
    { code: 'player', label: 'Plantel', detail: 'Completa la primera matrícula.', done: data.kpis.jugadores > 0, to: '/matricula', icon: UsersIcon },
    { code: 'professor', label: 'Cuerpo técnico', detail: 'Asigna responsables por categoría.', done: data.kpis.profesores.activos > 0, to: '/profesores', icon: AcademicCapIcon },
    { code: 'attendance', label: 'Primera jornada', detail: 'Registra asistencia y comienza el historial.', done: data.kpis.asistencia_mes !== null, to: '/asistencias', icon: ClipboardDocumentCheckIcon },
  ];
  const completedOnboarding = onboardingSteps.filter((step) => step.done).length;
  const showOnboarding = !structureLoading && !structureError && completedOnboarding < onboardingSteps.length;

  return (
    <main className="mx-auto max-w-[1440px] space-y-5 pb-14" aria-labelledby="director-day-title">
      <section className="overflow-hidden rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)]">
        <div className="border-l-[6px] border-l-[var(--ls-accent)] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[.15em] text-[var(--ls-muted)]">Jornada · <span className="capitalize">{longToday()}</span></p>
              <h1 id="director-day-title" className="mt-2 text-3xl font-black tracking-[-.04em] text-[var(--ls-ink)] sm:text-4xl">{data.academia.nombre}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-[var(--ls-muted)]">
                <span>{data.kpis.jugadores} deportistas</span>
                <span>{data.kpis.categorias} categorías</span>
                <span>{data.kpis.profesores.activos} profesores activos</span>
                <span className={attentionCount ? 'font-black text-[var(--ls-warning)]' : 'font-black text-[var(--ls-success)]'}>{attentionCount ? `${attentionCount} asuntos requieren atención` : 'Operación sin pendientes críticos'}</span>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Acciones de la jornada">
              <DirectorAction to="/asistencias" label="Pasar asistencia" icon={ClipboardDocumentCheckIcon} primary />
              <DirectorAction to="/matricula" label="Matricular" icon={PlusIcon} />
              <DirectorAction to="/partidos" label="Programar partido" icon={TrophyIcon} />
            </nav>
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,.65fr)]">
        <section className="overflow-hidden rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)]" aria-labelledby="next-match-title">
          <header className="flex items-center justify-between gap-4 border-b border-[var(--ls-line)] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--ls-accent-text)]">Match Command</p>
              <h2 id="next-match-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[var(--ls-ink)]">Próximo hito deportivo</h2>
            </div>
            <Link to="/partidos" className="inline-flex min-h-11 items-center gap-1.5 rounded-xl px-3 text-xs font-black text-[var(--ls-muted)] hover:bg-[var(--ls-surface-soft)] hover:text-[var(--ls-ink)]">Agenda completa <ArrowRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
          </header>

          {nextMatch ? (
            <div className="p-5 sm:p-6">
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_220px] lg:items-stretch">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-black text-[var(--ls-muted)]">
                    <span className="rounded-full border border-[var(--ls-line)] bg-[var(--ls-surface-soft)] px-3 py-1.5">{nextMatch.categorias?.nombre || 'Categoría por confirmar'}</span>
                    {nextMatch.condicion ? <span className="rounded-full border border-[var(--ls-line)] px-3 py-1.5">{nextMatch.condicion}</span> : null}
                  </div>
                  <div className="mt-5 flex items-end gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-[.12em] text-[var(--ls-muted)]">Rival</p>
                      <p className="mt-1 truncate text-3xl font-black tracking-[-.045em] text-[var(--ls-ink)] sm:text-4xl">{nextMatch.rival}</p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-3 sm:grid-cols-3">
                    <MatchFact label="Fecha" value={shortDate(nextMatch.fecha)} />
                    <MatchFact label="Citación" value={nextMatch.hora_citacion?.slice(0, 5) || 'Por confirmar'} />
                    <MatchFact label="Inicio" value={nextMatch.hora?.slice(0, 5) || 'Por confirmar'} />
                  </div>
                  <p className="mt-5 text-sm font-semibold text-[var(--ls-muted)]">{nextMatch.ubicacion || 'Ubicación por confirmar'}</p>
                </div>

                <div className="flex flex-col justify-between rounded-[var(--ls-radius)] bg-[var(--ls-ink)] p-5 text-white">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[.13em] text-[var(--ls-accent-on-dark)]">Preparación</p>
                    <p className="mt-2 text-lg font-black leading-tight">La próxima decisión está en el encuentro.</p>
                    <p className="mt-2 text-xs leading-5 text-white/70">Revisa convocatoria, citación, plantel y detalles antes de salir a cancha.</p>
                  </div>
                  <Link to="/partidos" className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--ls-accent)] px-4 text-sm font-black text-[var(--ls-ink)] hover:bg-[var(--ls-accent-strong)]">Abrir preparación <ArrowRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid min-h-[300px] place-items-center p-6 text-center">
              <div className="max-w-md">
                <TrophyIcon aria-hidden="true" className="mx-auto h-9 w-9 text-[var(--ls-muted)]" />
                <p className="mt-4 text-lg font-black text-[var(--ls-ink)]">La temporada no tiene un próximo encuentro programado</p>
                <p className="mt-2 text-sm leading-6 text-[var(--ls-muted)]">Programa el siguiente partido o amistoso cuando esté confirmado. No inventaremos una agenda que todavía no existe.</p>
                <DirectorAction to="/partidos" label="Programar encuentro" icon={TrophyIcon} primary />
              </div>
            </div>
          )}
        </section>

        <section className="rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)]" aria-labelledby="attention-title">
          <header className="border-b border-[var(--ls-line)] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--ls-warning)]">Decisiones</p>
            <div className="mt-1 flex items-center justify-between gap-3">
              <h2 id="attention-title" className="text-xl font-black tracking-[-.03em] text-[var(--ls-ink)]">Requiere atención</h2>
              <span className="text-sm font-black tabular-nums text-[var(--ls-muted)]">{attentionCount}</span>
            </div>
          </header>
          <div className="divide-y divide-[var(--ls-line)] px-5">
            {data.kpis.cobros_vencidos > 0 ? (
              <AttentionLink to="/finanzas" tone="danger" title={`${data.kpis.cobros_vencidos} pagos vencidos`} detail="Familias con deuda que requiere seguimiento." />
            ) : null}

            {data.prioridades.alertas_asistencia.slice(0, 3).map((alert) => (
              <div key={alert.id} className="py-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[var(--ls-warning)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-[var(--ls-ink)]">{alert.jugadores?.nombre || 'Deportista'} · {alert.racha} ausencias</p>
                    <p className="mt-1 truncate text-xs leading-5 text-[var(--ls-muted)]">{alert.categorias?.nombre || 'Categoría'} necesita seguimiento técnico.</p>
                    <button type="button" onClick={() => void reviewAlert(alert.id)} className="mt-2 min-h-9 rounded-lg border border-[var(--ls-line-strong)] px-3 text-xs font-black text-[var(--ls-ink)] hover:bg-[var(--ls-surface-soft)]">Marcar revisado</button>
                  </div>
                </div>
              </div>
            ))}

            {data.prioridades.categorias_sin_profesor.length > 0 ? (
              <AttentionLink to="/profesores" tone="info" title={`${data.prioridades.categorias_sin_profesor.length} categorías sin profesor`} detail={data.prioridades.categorias_sin_profesor.map((item) => item.nombre).join(', ')} />
            ) : null}

            {data.kpis.uniformes_pendientes > 0 ? (
              <AttentionLink to="/uniformes" tone="default" title={`${data.kpis.uniformes_pendientes} uniformes pendientes`} detail="Entregas o solicitudes aún sin resolver." />
            ) : null}

            {!attentionCount ? (
              <div className="py-10 text-center">
                <CheckCircleIcon aria-hidden="true" className="mx-auto h-8 w-8 text-[var(--ls-success)]" />
                <p className="mt-3 font-black text-[var(--ls-ink)]">Sin pendientes críticos</p>
                <p className="mt-1 text-sm text-[var(--ls-muted)]">La jornada puede concentrarse en plantel y cancha.</p>
              </div>
            ) : null}
          </div>
        </section>
      </div>

      <section className="rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)]" aria-labelledby="roster-pulse-title">
        <div className="grid lg:grid-cols-[240px_minmax(0,1fr)]">
          <header className="border-b border-[var(--ls-line)] p-5 lg:border-b-0 lg:border-r">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--ls-accent-text)]">Plantel</p>
            <h2 id="roster-pulse-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[var(--ls-ink)]">Pulso operativo</h2>
            <p className="mt-2 text-xs leading-5 text-[var(--ls-muted)]">Contexto técnico para decidir, no métricas decorativas.</p>
          </header>
          <div className="grid divide-y divide-[var(--ls-line)] sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            <PulseLink to="/alumnos" label="Plantel activo" value={`${data.kpis.jugadores} deportistas`} detail={`${data.kpis.categorias} categorías`} icon={UsersIcon} />
            <PulseLink to="/profesores" label="Cuerpo técnico" value={`${professorCapacity} profesores`} detail={data.kpis.profesores.limite > 0 ? 'activos / capacidad del plan' : 'profesores activos'} icon={AcademicCapIcon} />
            <PulseLink to="/asistencias" label="Asistencia" value={data.kpis.asistencia_mes === null ? 'Sin registro mensual' : `${attendance}% este mes`} detail={data.kpis.asistencia_mes === null ? 'Registra la primera jornada' : attendance < 75 ? 'Conviene revisar continuidad' : 'Seguimiento mensual'} icon={ClipboardDocumentCheckIcon} progress={data.kpis.asistencia_mes === null ? undefined : attendance} />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.25fr)_minmax(300px,.75fr)]">
        <section className="rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)]" aria-labelledby="season-timeline-title">
          <header className="flex items-center justify-between gap-4 border-b border-[var(--ls-line)] px-5 py-4 sm:px-6">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--ls-accent-text)]">Season Timeline</p>
              <h2 id="season-timeline-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[var(--ls-ink)]">Lo que viene en competencia</h2>
            </div>
            <CalendarDaysIcon aria-hidden="true" className="h-5 w-5 text-[var(--ls-muted)]" />
          </header>
          <div className="px-5 py-2 sm:px-6">
            {nextMatch ? <TimelineMatch match={nextMatch} active /> : null}
            {remainingMatches.map((match) => <TimelineMatch key={match.id} match={match} />)}
            {!nextMatch ? (
              <div className="py-10 text-center text-sm font-semibold text-[var(--ls-muted)]">No hay encuentros en la línea de temporada.</div>
            ) : null}
          </div>
        </section>

        <section className="rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)]" aria-labelledby="finance-title">
          <header className="border-b border-[var(--ls-line)] px-5 py-4">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--ls-muted)]">Soporte a la operación</p>
            <h2 id="finance-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[var(--ls-ink)]">Caja de la academia</h2>
          </header>
          <div className="px-5 py-3">
            <LedgerRow label="Ingresos del mes" value={money(data.kpis.ingresos_mes)} tone="success" />
            <LedgerRow label="Egresos del mes" value={money(data.kpis.egresos_mes)} tone="danger" />
            <LedgerRow label="Saldo del mes" value={money(data.kpis.saldo_mes)} tone={data.kpis.saldo_mes < 0 ? 'danger' : 'default'} strong />
            <LedgerRow label="Por cobrar" value={money(data.kpis.por_cobrar)} tone={data.kpis.cobros_vencidos ? 'warning' : 'default'} />
          </div>
          <div className="border-t border-[var(--ls-line)] p-4">
            <Link to="/finanzas" className="inline-flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-sm font-black text-[var(--ls-ink)] hover:bg-[var(--ls-surface-soft)]">Abrir mesa financiera <ArrowRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
          </div>
        </section>
      </div>

      {showOnboarding ? (
        <section className="rounded-[var(--ls-radius-lg)] border border-[var(--ls-line)] bg-[var(--ls-surface)]" aria-labelledby="onboarding-title">
          <div className="flex flex-col gap-4 border-b border-[var(--ls-line)] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--ls-accent)] text-[var(--ls-ink)]"><RocketLaunchIcon aria-hidden="true" className="h-5 w-5" /></span>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[.14em] text-[var(--ls-muted)]">Puesta en marcha</p>
                <h2 id="onboarding-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[var(--ls-ink)]">Deja la academia lista para operar en cancha</h2>
              </div>
            </div>
            <p className="text-xs font-black tabular-nums text-[var(--ls-muted)]">{completedOnboarding} / {onboardingSteps.length} listo</p>
          </div>
          <div className="divide-y divide-[var(--ls-line)] px-5 sm:px-6">
            {onboardingSteps.map(({ code, label, detail, done, to, icon: Icon }, index) => (
              <Link key={code} to={to} className="group grid grid-cols-[28px_36px_minmax(0,1fr)_auto] items-center gap-3 py-3.5">
                <span className="text-center text-[10px] font-black tabular-nums text-[var(--ls-muted)]">{String(index + 1).padStart(2, '0')}</span>
                <span className={`grid h-9 w-9 place-items-center rounded-full border ${done ? 'border-[var(--ls-success)] text-[var(--ls-success)]' : 'border-[var(--ls-line-strong)] text-[var(--ls-muted)]'}`}>
                  {done ? <CheckCircleIcon aria-hidden="true" className="h-5 w-5" /> : <Icon aria-hidden="true" className="h-4 w-4" />}
                </span>
                <div className="min-w-0"><p className="font-black text-[var(--ls-ink)]">{label}</p><p className="mt-0.5 text-xs text-[var(--ls-muted)]">{done ? 'Listo para operar' : detail}</p></div>
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4 text-[var(--ls-muted)] group-hover:text-[var(--ls-ink)]" />
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs font-semibold text-[var(--ls-muted)]">
        <p>{data.plan.plan.trial ? 'Prueba Full activa' : `Plan ${data.plan.plan.name}`}</p>
        <div className="flex flex-wrap items-center gap-4">
          <Link to="/profesores" className="inline-flex items-center gap-1.5 hover:text-[var(--ls-ink)]"><AcademicCapIcon aria-hidden="true" className="h-4 w-4" />Cuerpo técnico</Link>
          <Link to="/partidos" className="inline-flex items-center gap-1.5 hover:text-[var(--ls-ink)]"><CalendarDaysIcon aria-hidden="true" className="h-4 w-4" />Temporada</Link>
          <Link to="/finanzas" className="inline-flex items-center gap-1.5 hover:text-[var(--ls-ink)]"><BanknotesIcon aria-hidden="true" className="h-4 w-4" />Finanzas</Link>
        </div>
      </footer>
    </main>
  );
};

function MatchFact({ label, value }: { label: string; value: string }) {
  return <div className="border-l-2 border-l-[var(--ls-line-strong)] pl-3"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[var(--ls-muted)]">{label}</p><p className="mt-1 text-sm font-black capitalize tabular-nums text-[var(--ls-ink)]">{value}</p></div>;
}

function AttentionLink({ to, tone, title, detail }: { to: string; tone: 'danger' | 'info' | 'default'; title: string; detail: string }) {
  const dot = tone === 'danger' ? 'bg-[var(--ls-danger)]' : tone === 'info' ? 'bg-[var(--ls-blue)]' : 'bg-[var(--ls-muted)]';
  return <Link to={to} className="group flex items-start gap-3 py-4"><span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} /><div className="min-w-0 flex-1"><p className="text-sm font-black text-[var(--ls-ink)]">{title}</p><p className="mt-1 line-clamp-2 text-xs leading-5 text-[var(--ls-muted)]">{detail}</p></div><ArrowRightIcon aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[var(--ls-muted)] group-hover:text-[var(--ls-ink)]" /></Link>;
}

function PulseLink({ to, label, value, detail, icon: Icon, progress }: { to: string; label: string; value: string; detail: string; icon: typeof UsersIcon; progress?: number }) {
  return <Link to={to} className="group min-w-0 p-5 hover:bg-[var(--ls-surface-soft)]"><div className="flex items-start gap-3"><Icon aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-[var(--ls-muted)]" /><div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-[.1em] text-[var(--ls-muted)]">{label}</p><p className="mt-1 text-lg font-black tracking-[-.025em] text-[var(--ls-ink)]">{value}</p><p className="mt-1 text-xs leading-5 text-[var(--ls-muted)]">{detail}</p>{typeof progress === 'number' ? <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--ls-line)]"><div className="h-full rounded-full bg-[var(--ls-accent-strong)]" style={{ width: `${clampPercent(progress)}%` }} /></div> : null}</div><ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[var(--ls-muted)] opacity-0 transition group-hover:opacity-100" /></div></Link>;
}

function TimelineMatch({ match, active = false }: { match: Match; active?: boolean }) {
  return <Link to="/partidos" className="group grid grid-cols-[82px_16px_minmax(0,1fr)_auto] items-stretch gap-3 py-3.5"><div className="self-center text-right"><p className="text-xs font-black capitalize text-[var(--ls-ink)]">{shortDate(match.fecha)}</p><p className="mt-1 text-[11px] font-semibold tabular-nums text-[var(--ls-muted)]">{match.hora?.slice(0, 5) || '—'}</p></div><div className="relative flex justify-center"><span className={`relative z-10 mt-2 h-2.5 w-2.5 rounded-full ${active ? 'bg-[var(--ls-accent-strong)]' : 'bg-[var(--ls-line-strong)]'}`} /><span aria-hidden="true" className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-[var(--ls-line)]" /></div><div className="min-w-0 self-center"><p className="truncate font-black text-[var(--ls-ink)]">{match.categorias?.nombre || 'Categoría'} · vs {match.rival}</p><p className="mt-1 truncate text-xs text-[var(--ls-muted)]">{match.ubicacion || 'Lugar por confirmar'}{match.condicion ? ` · ${match.condicion}` : ''}</p></div><ArrowRightIcon aria-hidden="true" className="h-4 w-4 self-center text-[var(--ls-muted)] group-hover:text-[var(--ls-ink)]" /></Link>;
}

function LedgerRow({ label, value, tone = 'default', strong = false }: { label: string; value: string; tone?: 'default' | 'success' | 'warning' | 'danger'; strong?: boolean }) {
  const valueTone = tone === 'success' ? 'text-[var(--ls-success)]' : tone === 'warning' ? 'text-[var(--ls-warning)]' : tone === 'danger' ? 'text-[var(--ls-danger)]' : 'text-[var(--ls-ink)]';
  return <div className={`flex items-center justify-between gap-4 border-b border-[var(--ls-line)] py-3 last:border-b-0 ${strong ? 'font-black' : ''}`}><span className="text-sm text-[var(--ls-muted)]">{label}</span><strong className={`text-sm tabular-nums ${valueTone}`}>{value}</strong></div>;
}

export default Dashboard;

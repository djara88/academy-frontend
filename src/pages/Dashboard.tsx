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

const MetricCard = ({
  label,
  value,
  detail,
  to,
}: {
  label: string;
  value: string | number;
  detail: string;
  to: string;
}) => (
  <Link
    to={to}
    className="group rounded-2xl border border-[#dde3db] bg-white p-4 hover:border-[#c6cec3] hover:bg-[#fbfcfa] sm:p-5"
  >
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[11px] font-black uppercase tracking-[.08em] text-[#707970]">{label}</p>
        <p className="mt-2 text-2xl font-black tracking-[-.04em] text-[#151a16] sm:text-3xl [font-variant-numeric:tabular-nums]">{value}</p>
        <p className="mt-1 text-xs leading-5 text-[#788078]">{detail}</p>
      </div>
      <ArrowRightIcon aria-hidden="true" className="mt-1 h-4 w-4 shrink-0 text-[#a4aba3] group-hover:text-[#485147]" />
    </div>
  </Link>
);

const QuickAction = ({
  to,
  label,
  detail,
  icon: Icon,
  primary = false,
}: {
  to: string;
  label: string;
  detail: string;
  icon: typeof PlusIcon;
  primary?: boolean;
}) => (
  <Link
    to={to}
    className={`group flex min-h-24 items-center gap-4 rounded-2xl border p-4 ${primary
      ? 'border-[#a8d900] bg-[#b8ee13] text-[#151a16] hover:bg-[#c3f52f]'
      : 'border-[#dde3db] bg-white text-[#151a16] hover:border-[#c6cec3] hover:bg-[#fbfcfa]'}`}
  >
    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${primary ? 'bg-[#151a16] text-white' : 'bg-[#f0f2ed] text-[#4f584f]'}`}>
      <Icon aria-hidden="true" className="h-5 w-5" />
    </span>
    <span className="min-w-0 flex-1">
      <span className="block font-black">{label}</span>
      <span className={`mt-0.5 block text-xs leading-5 ${primary ? 'text-[#465133]' : 'text-[#788078]'}`}>{detail}</span>
    </span>
    <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 opacity-45 group-hover:opacity-100" />
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
          <div aria-hidden="true" className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-[#d9ded4] border-t-[#8fb900]" />
          <p className="mt-4 font-black text-[#596057]">Preparando tu centro de control…</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <section className="mx-auto max-w-xl rounded-2xl border border-[#e0e4dc] bg-white p-7 text-center">
        <ExclamationTriangleIcon aria-hidden="true" className="mx-auto h-9 w-9 text-[#d93643]" />
        <h1 className="mt-3 text-xl font-black text-[#151a16]">No pudimos abrir tu resumen</h1>
        <p className="mt-2 text-sm text-[#6f776f]">Revisa tu conexión e intenta cargar la información nuevamente.</p>
        <button type="button" onClick={() => void refetch()} className="mt-5 min-h-11 rounded-xl bg-[#151a16] px-5 text-sm font-black text-white hover:bg-[#2a312b]">
          Intentar nuevamente
        </button>
      </section>
    );
  }

  const attendance = clampPercent(data.kpis.asistencia_mes ?? 0);
  const attentionCount = data.kpis.cobros_vencidos
    + data.prioridades.alertas_asistencia.length
    + data.prioridades.categorias_sin_profesor.length
    + data.kpis.uniformes_pendientes;

  const structureReady = Boolean(structure?.some((site) => site.activa !== false && site.ramas?.some((branch) => branch.activa !== false)));
  const onboardingSteps = [
    { code: 'structure', label: 'Configura tu academia', detail: 'Agrega una sede y una disciplina.', done: structureReady, to: '/configuracion/estructura', icon: BuildingOffice2Icon },
    { code: 'category', label: 'Crea una categoría', detail: 'Organiza a tus deportistas.', done: data.kpis.categorias > 0, to: '/alumnos', icon: UserGroupIcon },
    { code: 'player', label: 'Agrega un deportista', detail: 'Completa su matrícula.', done: data.kpis.jugadores > 0, to: '/matricula', icon: UsersIcon },
    { code: 'professor', label: 'Suma a un profesor', detail: 'Asigna responsables técnicos.', done: data.kpis.profesores.activos > 0, to: '/profesores', icon: AcademicCapIcon },
    { code: 'attendance', label: 'Registra asistencia', detail: 'Comienza el historial del equipo.', done: data.kpis.asistencia_mes !== null, to: '/asistencias', icon: ClipboardDocumentCheckIcon },
  ];
  const completedOnboarding = onboardingSteps.filter((step) => step.done).length;
  const showOnboarding = !structureLoading && !structureError && completedOnboarding < onboardingSteps.length;

  return (
    <div className="mx-auto max-w-[1380px] space-y-4 pb-12 sm:space-y-5">
      <header className="rounded-[22px] border border-[#dde3db] bg-white p-5 sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[.1em] text-[#727b72]">Centro de control</p>
            <h1 className="mt-2 text-pretty text-3xl font-black tracking-[-.045em] text-[#151a16] sm:text-4xl lg:text-5xl">{data.academia.nombre}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#697169] sm:text-base">Lo importante de hoy, sin ruido. Revisa pendientes, próximos encuentros y mueve la operación desde aquí.</p>
          </div>
          <div className={`inline-flex w-fit items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-black ${attentionCount ? 'border-[#efd99b] bg-[#fff8e8] text-[#765000]' : 'border-[#cfe7d8] bg-[#eff9f2] text-[#106742]'}`}>
            <span aria-hidden="true" className={`h-2 w-2 rounded-full ${attentionCount ? 'bg-[#d99a00]' : 'bg-[#17a66a]'}`} />
            {attentionCount ? `${attentionCount} pendientes por revisar` : 'Todo al día'}
          </div>
        </div>

        <div className="mt-6 grid gap-2 sm:grid-cols-3">
          <QuickAction to="/matricula" label="Nueva matrícula" detail="Agrega un deportista" icon={PlusIcon} primary />
          <QuickAction to="/asistencias" label="Registrar asistencia" detail="Actualiza la lista de hoy" icon={ClipboardDocumentCheckIcon} />
          <QuickAction to="/partidos" label="Programar encuentro" detail="Agenda competencia o amistoso" icon={TrophyIcon} />
        </div>
      </header>

      <section aria-labelledby="dashboard-summary-title">
        <h2 id="dashboard-summary-title" className="sr-only">Resumen operativo</h2>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Deportistas" value={data.kpis.jugadores} detail={`${data.kpis.categorias} categorías activas`} to="/alumnos" />
          <MetricCard label="Asistencia del mes" value={data.kpis.asistencia_mes === null ? 'Sin datos' : `${attendance}%`} detail="Promedio registrado" to="/asistencias" />
          <MetricCard label="Por cobrar" value={money(data.kpis.por_cobrar)} detail={`${data.kpis.cobros_vencidos} pagos vencidos`} to="/finanzas" />
          <MetricCard label="Próximos encuentros" value={data.kpis.proximos_partidos} detail={`${data.kpis.profesores.activos} profesores activos`} to="/partidos" />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_.95fr]">
        <section className="rounded-2xl border border-[#dde3db] bg-white p-5 sm:p-6" aria-labelledby="attention-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.1em] text-[#7a827a]">Prioridad</p>
              <h2 id="attention-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[#151a16]">Para revisar hoy</h2>
            </div>
            <span className="rounded-full bg-[#f1f3ee] px-3 py-1 text-xs font-black text-[#5e665e] [font-variant-numeric:tabular-nums]">{attentionCount}</span>
          </div>

          <div className="mt-4 divide-y divide-[#edf0eb]">
            {data.kpis.cobros_vencidos > 0 ? (
              <Link to="/finanzas" className="group flex items-center gap-3 py-3.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d93643]" />
                <div className="min-w-0 flex-1"><p className="font-black text-[#1b201c]">{data.kpis.cobros_vencidos} pagos vencidos</p><p className="mt-0.5 text-xs text-[#798179]">Revisa familias con cobros pendientes.</p></div>
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a2aaa2] group-hover:text-[#4f584f]" />
              </Link>
            ) : null}

            {data.prioridades.alertas_asistencia.slice(0, 3).map((alert) => (
              <div key={alert.id} className="flex items-center gap-3 py-3.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#d99a00]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-[#1b201c]">{alert.jugadores?.nombre || 'Deportista'} · {alert.racha} ausencias</p>
                  <p className="mt-0.5 truncate text-xs text-[#798179]">{alert.categorias?.nombre || 'Categoría'} necesita seguimiento.</p>
                </div>
                <button type="button" onClick={() => void reviewAlert(alert.id)} className="shrink-0 rounded-lg border border-[#d9ded6] px-3 py-2 text-xs font-black text-[#4d554d] hover:bg-[#f5f7f3]">Marcar revisado</button>
              </div>
            ))}

            {data.prioridades.categorias_sin_profesor.length > 0 ? (
              <Link to="/profesores" className="group flex items-center gap-3 py-3.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#3157ff]" />
                <div className="min-w-0 flex-1"><p className="font-black text-[#1b201c]">{data.prioridades.categorias_sin_profesor.length} categorías sin profesor</p><p className="mt-0.5 truncate text-xs text-[#798179]">{data.prioridades.categorias_sin_profesor.map((item) => item.nombre).join(', ')}</p></div>
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a2aaa2] group-hover:text-[#4f584f]" />
              </Link>
            ) : null}

            {data.kpis.uniformes_pendientes > 0 ? (
              <Link to="/uniformes" className="group flex items-center gap-3 py-3.5">
                <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full bg-[#7c55d9]" />
                <div className="min-w-0 flex-1"><p className="font-black text-[#1b201c]">{data.kpis.uniformes_pendientes} uniformes pendientes</p><p className="mt-0.5 text-xs text-[#798179]">Hay entregas o solicitudes por resolver.</p></div>
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a2aaa2] group-hover:text-[#4f584f]" />
              </Link>
            ) : null}

            {!attentionCount ? (
              <div className="py-8 text-center">
                <CheckCircleIcon aria-hidden="true" className="mx-auto h-8 w-8 text-[#158a59]" />
                <p className="mt-3 font-black text-[#1b201c]">No hay pendientes importantes</p>
                <p className="mt-1 text-sm text-[#798179]">Puedes concentrarte en la operación del día.</p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="rounded-2xl border border-[#dde3db] bg-white p-5 sm:p-6" aria-labelledby="upcoming-title">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.1em] text-[#7a827a]">Agenda</p>
              <h2 id="upcoming-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[#151a16]">Próximos encuentros</h2>
            </div>
            <Link to="/partidos" className="text-xs font-black text-[#4f584f] hover:text-[#151a16]">Ver agenda</Link>
          </div>

          <div className="mt-4 divide-y divide-[#edf0eb]">
            {data.proximos_partidos.length ? data.proximos_partidos.slice(0, 5).map((match) => (
              <Link key={match.id} to="/partidos" className="group flex items-center gap-3 py-3.5">
                <div className="w-14 shrink-0 text-center">
                  <p className="text-xs font-black capitalize text-[#535b53]">{shortDate(match.fecha).split(' ')[0]}</p>
                  <p className="mt-0.5 text-sm font-black text-[#1b201c] [font-variant-numeric:tabular-nums]">{shortDate(match.fecha).split(' ').slice(1).join(' ')}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-black text-[#1b201c]">vs {match.rival}</p>
                  <p className="mt-0.5 truncate text-xs text-[#798179]">{match.categorias?.nombre || 'Sin categoría'} · {match.ubicacion || 'Lugar por confirmar'}</p>
                  <p className="mt-1 text-xs font-bold text-[#596259]">{match.hora_citacion ? `Citación ${match.hora_citacion.slice(0, 5)} · ` : ''}Inicio {match.hora?.slice(0, 5)}</p>
                </div>
                <ArrowRightIcon aria-hidden="true" className="h-4 w-4 shrink-0 text-[#a2aaa2] group-hover:text-[#4f584f]" />
              </Link>
            )) : (
              <div className="py-8 text-center">
                <ClockIcon aria-hidden="true" className="mx-auto h-8 w-8 text-[#879087]" />
                <p className="mt-3 font-black text-[#1b201c]">No hay encuentros programados</p>
                <Link to="/partidos" className="mt-2 inline-flex items-center gap-1 text-sm font-black text-[#4d5745] hover:text-[#151a16]">Programar encuentro <ArrowRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
              </div>
            )}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-[#dde3db] bg-white p-5 sm:p-6" aria-labelledby="finance-title">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[.1em] text-[#7a827a]">Finanzas</p>
            <h2 id="finance-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[#151a16]">Movimiento del mes</h2>
          </div>
          <Link to="/finanzas" className="inline-flex items-center gap-1 text-xs font-black text-[#4f584f] hover:text-[#151a16]">Abrir finanzas <ArrowRightIcon aria-hidden="true" className="h-4 w-4" /></Link>
        </div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Ingresos', money(data.kpis.ingresos_mes)],
            ['Egresos', money(data.kpis.egresos_mes)],
            ['Saldo', money(data.kpis.saldo_mes)],
            ['Por cobrar', money(data.kpis.por_cobrar)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#f4f6f1] p-4">
              <p className="text-[10px] font-black uppercase tracking-[.08em] text-[#7a827a]">{label}</p>
              <p className={`mt-2 text-xl font-black tracking-[-.03em] [font-variant-numeric:tabular-nums] ${label === 'Saldo' && data.kpis.saldo_mes < 0 ? 'text-[#c5303d]' : 'text-[#1b201c]'}`}>{value}</p>
            </div>
          ))}
        </div>
      </section>

      {showOnboarding ? (
        <section className="rounded-2xl border border-[#dfe4dc] bg-[#fbfcfa] p-5 sm:p-6" aria-labelledby="onboarding-title">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#b8ee13] text-[#151a16]"><RocketLaunchIcon aria-hidden="true" className="h-5 w-5" /></span>
              <div><p className="text-[10px] font-black uppercase tracking-[.1em] text-[#7a827a]">Configuración inicial</p><h2 id="onboarding-title" className="mt-1 text-xl font-black tracking-[-.03em] text-[#151a16]">Deja tu academia lista para operar</h2><p className="mt-1 text-sm text-[#737b73]">Completa sólo lo que falta.</p></div>
            </div>
            <p className="text-xs font-black text-[#656e65] [font-variant-numeric:tabular-nums]">{completedOnboarding} de {onboardingSteps.length} pasos listos</p>
          </div>
          <div className="mt-5 grid gap-2 md:grid-cols-2 xl:grid-cols-5">
            {onboardingSteps.map(({ code, label, detail, done, to, icon: Icon }) => (
              <Link key={code} to={to} className={`rounded-xl border p-4 ${done ? 'border-[#d8e8dd] bg-[#f2faf5]' : 'border-[#e0e4dc] bg-white hover:border-[#c9d1c7]'}`}>
                <div className="flex items-center justify-between"><Icon aria-hidden="true" className="h-5 w-5 text-[#4d554b]" />{done ? <CheckCircleIcon aria-hidden="true" className="h-5 w-5 text-[#158a59]" /> : <ArrowRightIcon aria-hidden="true" className="h-4 w-4 text-[#7b8179]" />}</div>
                <p className="mt-4 text-sm font-black text-[#151a16]">{label}</p>
                <p className="mt-1 text-xs leading-5 text-[#737b73]">{done ? 'Listo' : detail}</p>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <footer className="flex flex-wrap items-center justify-between gap-3 px-1 text-xs text-[#7c847c]">
        <p>{data.plan.plan.trial ? 'Prueba Full activa' : `Plan ${data.plan.plan.name}`}</p>
        <div className="flex items-center gap-4">
          <Link to="/profesores" className="inline-flex items-center gap-1 hover:text-[#151a16]"><AcademicCapIcon aria-hidden="true" className="h-4 w-4" />{data.kpis.profesores.activos} profesores</Link>
          <Link to="/partidos" className="inline-flex items-center gap-1 hover:text-[#151a16]"><CalendarDaysIcon aria-hidden="true" className="h-4 w-4" />Agenda</Link>
          <Link to="/finanzas" className="inline-flex items-center gap-1 hover:text-[#151a16]"><BanknotesIcon aria-hidden="true" className="h-4 w-4" />Finanzas</Link>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;
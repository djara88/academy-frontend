import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ArrowTrendingUpIcon, BanknotesIcon, CalendarDaysIcon, CheckBadgeIcon,
  ClockIcon, ExclamationTriangleIcon, UserGroupIcon, UsersIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { getAcademyName } from '../config/brand';

type Alert = { id: string; racha: number; ultima_ausencia: string; jugadores?: { nombre: string } | null; categorias?: { nombre: string } | null };
type Match = { id: string; rival: string; fecha: string; hora: string; hora_citacion?: string | null; ubicacion?: string | null; condicion?: string | null; categorias?: { nombre: string } | null };
type DashboardData = {
  academia: { nombre: string; estado?: string | null };
  plan: { plan: { name: string; trial: boolean }; limits: { professors: number }; addOns: { guardians: boolean }; features: string[] };
  kpis: {
    jugadores: number; profesores: { activos: number; limite: number }; categorias: number; proximos_partidos: number;
    asistencia_mes: number | null; ingresos_mes: number; egresos_mes: number; saldo_mes: number; por_cobrar: number;
    cobros_vencidos: number; uniformes_pendientes: number;
  };
  prioridades: { alertas_asistencia: Alert[]; categorias_sin_profesor: { id: string; nombre: string }[] };
  proximos_partidos: Match[];
};

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);
const shortDate = (value: string) => new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${value}T12:00:00`));

const KpiCard = ({ label, value, detail, icon: Icon, tone = 'cyan' }: { label: string; value: string | number; detail: string; icon: typeof UsersIcon; tone?: 'cyan' | 'green' | 'amber' | 'violet' }) => {
  const tones = {
    cyan: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-300',
    green: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    amber: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    violet: 'border-violet-500/20 bg-violet-500/10 text-violet-300',
  };
  return <article className="group relative overflow-hidden rounded-2xl border border-white/10 bg-[#151b25] p-5 shadow-xl shadow-black/10 transition hover:-translate-y-0.5 hover:border-[#289E9D]/40">
    <div className="flex items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[0.15em] text-[#7d8999]">{label}</p><p className="mt-3 text-3xl font-black tracking-tight text-white">{value}</p></div><div className={`rounded-2xl border p-3 ${tones[tone]}`}><Icon className="h-6 w-6" /></div></div>
    <p className="mt-3 text-xs text-[#8995a4]">{detail}</p>
  </article>;
};

const Dashboard = () => {
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['dashboard-resumen'],
    queryFn: async () => (await api.get('/api/dashboard/resumen')).data.data as DashboardData,
    refetchInterval: 120_000,
  });

  const reviewAlert = async (id: string) => {
    try {
      await api.patch(`/api/profesores/alertas/asistencia/${id}/revisada`);
      await refetch();
    } catch (reviewError: any) {
      await notify(reviewError.response?.data?.error || 'No fue posible revisar la alerta.', { title: getAcademyName(user?.nombre_academia) });
    }
  };

  if (isLoading) return <div className="flex min-h-[70vh] items-center justify-center"><div className="text-center"><div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[#289E9D]/20 border-t-[#48d8d0]" /><p className="mt-4 font-bold text-[#8995a4]">Preparando el centro de control...</p></div></div>;
  if (error || !data) return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">No fue posible cargar el centro de control. <button type="button" onClick={() => void refetch()} className="ml-2 font-black underline">Reintentar</button></div>;

  const priorities = data.prioridades.alertas_asistencia.length + data.prioridades.categorias_sin_profesor.length + data.kpis.cobros_vencidos;
  const maxFinance = Math.max(data.kpis.ingresos_mes, data.kpis.egresos_mes, 1);

  return <div className="mx-auto max-w-[1500px] space-y-6 pb-12">
    <section className="relative overflow-hidden rounded-[28px] border border-[#289E9D]/30 bg-[radial-gradient(circle_at_top_right,rgba(72,216,208,0.22),transparent_34%),linear-gradient(135deg,#172530_0%,#111722_50%,#0f141d_100%)] p-6 shadow-2xl shadow-black/25 sm:p-8">
      <div className="absolute -right-14 -top-16 h-56 w-56 rounded-full border border-[#48d8d0]/20" /><div className="absolute -right-2 -top-4 h-32 w-32 rounded-full border border-[#48d8d0]/20" />
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
        <div><div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#48d8d0]/30 bg-[#289E9D]/15 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-[#70e4df]">Centro de dirección</span><span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-bold text-[#b9c3cf]">{data.plan.plan.trial ? 'Prueba activa' : `Plan ${data.plan.plan.name}`}</span>{data.plan.addOns.guardians ? <span className="rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-bold text-violet-200">Apoderados activo</span> : null}</div>
          <h1 className="mt-5 max-w-4xl text-3xl font-black tracking-tight text-white sm:text-5xl">{data.academia.nombre}</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#9aa6b5] sm:text-base">Una vista ejecutiva para decidir rápido: operación, recaudación, equipo técnico y próximos compromisos.</p>
        </div>
        <div className={`flex items-center gap-3 self-start rounded-2xl border px-4 py-3 xl:self-auto ${priorities ? 'border-amber-400/30 bg-amber-500/10' : 'border-emerald-400/30 bg-emerald-500/10'}`}><CheckBadgeIcon className={`h-8 w-8 ${priorities ? 'text-amber-300' : 'text-emerald-300'}`} /><div><p className="text-xs font-bold uppercase tracking-wider text-[#8995a4]">Estado operativo</p><p className="font-black text-white">{priorities ? `${priorities} puntos por revisar` : 'Todo bajo control'}</p></div></div>
      </div>
    </section>

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <KpiCard label="Jugadores" value={data.kpis.jugadores} detail={`${data.kpis.categorias} categorías activas`} icon={UsersIcon} />
      <KpiCard label="Asistencia mensual" value={data.kpis.asistencia_mes === null ? 'Sin datos' : `${data.kpis.asistencia_mes}%`} detail="Promedio de entrenamientos registrados" icon={CheckBadgeIcon} tone="green" />
      <KpiCard label="Ingresos del mes" value={money(data.kpis.ingresos_mes)} detail={`${money(data.kpis.por_cobrar)} aún por cobrar`} icon={BanknotesIcon} tone="violet" />
      <KpiCard label="Próximos partidos" value={data.kpis.proximos_partidos} detail={`${data.kpis.profesores.activos} de ${data.kpis.profesores.limite} profesores activos`} icon={CalendarDaysIcon} tone="amber" />
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5 shadow-xl shadow-black/10 sm:p-6">
        <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-amber-300">Acción directiva</p><h2 className="mt-1 text-2xl font-black text-white">Prioridades</h2></div><span className={`rounded-full px-3 py-1 text-sm font-black ${priorities ? 'bg-amber-500 text-[#1a1307]' : 'bg-emerald-500/15 text-emerald-300'}`}>{priorities}</span></div>
        <div className="mt-5 space-y-3">
          {data.kpis.cobros_vencidos > 0 ? <Link to="/finanzas" className="flex items-center gap-4 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 hover:border-red-400/50"><ExclamationTriangleIcon className="h-7 w-7 shrink-0 text-red-300" /><div className="min-w-0 flex-1"><p className="font-black text-white">{data.kpis.cobros_vencidos} cobros vencidos</p><p className="text-sm text-[#9aa6b5]">Revisar cuentas y seguimiento de pagos.</p></div><span className="text-red-200">→</span></Link> : null}
          {data.prioridades.alertas_asistencia.map((alert) => <article key={alert.id} className="flex flex-col gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/5 p-4 sm:flex-row sm:items-center"><div className="flex min-w-0 flex-1 items-center gap-4"><ExclamationTriangleIcon className="h-7 w-7 shrink-0 text-amber-300" /><div><p className="font-black text-white">{alert.jugadores?.nombre || 'Jugador'} · {alert.racha} ausencias</p><p className="text-sm text-[#9aa6b5]">{alert.categorias?.nombre || 'Categoría'} · requiere seguimiento</p></div></div><button type="button" onClick={() => void reviewAlert(alert.id)} className="min-h-11 rounded-xl border border-amber-400/30 px-4 text-sm font-black text-amber-200 hover:bg-amber-500/10">Marcar revisada</button></article>)}
          {data.prioridades.categorias_sin_profesor.length > 0 ? <Link to="/profesores" className="flex items-center gap-4 rounded-2xl border border-violet-500/20 bg-violet-500/5 p-4 hover:border-violet-400/40"><UserGroupIcon className="h-7 w-7 shrink-0 text-violet-300" /><div className="min-w-0 flex-1"><p className="font-black text-white">{data.prioridades.categorias_sin_profesor.length} categorías sin profesor titular</p><p className="truncate text-sm text-[#9aa6b5]">{data.prioridades.categorias_sin_profesor.map((item) => item.nombre).join(', ')}</p></div><span className="text-violet-200">→</span></Link> : null}
          {!priorities ? <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-8 text-center"><CheckBadgeIcon className="mx-auto h-10 w-10 text-emerald-300" /><p className="mt-3 font-black text-white">Sin alertas críticas</p><p className="mt-1 text-sm text-[#8995a4]">La operación está al día.</p></div> : null}
        </div>
      </div>

      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5 shadow-xl shadow-black/10 sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-[#70e4df]">Agenda deportiva</p><h2 className="mt-1 text-2xl font-black text-white">Próximos partidos</h2></div><Link to="/partidos" className="text-sm font-black text-[#70e4df]">Ver fixture →</Link></div>
        <div className="mt-5 space-y-3">{data.proximos_partidos.length ? data.proximos_partidos.slice(0, 5).map((match) => <article key={match.id} className="grid grid-cols-[72px_1fr] gap-4 rounded-2xl border border-white/10 bg-[#101620] p-4"><div className="rounded-xl bg-[#289E9D]/15 p-2 text-center"><p className="text-xs font-bold uppercase text-[#70e4df]">{shortDate(match.fecha).split(' ')[0]}</p><p className="text-lg font-black text-white">{shortDate(match.fecha).split(' ')[1]}</p></div><div className="min-w-0"><div className="flex items-start justify-between gap-3"><p className="truncate font-black text-white">vs {match.rival}</p><span className="shrink-0 text-xs font-bold text-[#8995a4]">{match.condicion || 'Partido'}</span></div><p className="mt-1 truncate text-xs text-[#8995a4]">{match.categorias?.nombre || 'Sin categoría'} · {match.ubicacion || 'Lugar por confirmar'}</p><div className="mt-3 flex gap-3 text-xs font-bold"><span className="text-[#70e4df]">Citación {match.hora_citacion?.slice(0, 5) || '—'}</span><span className="text-white">Inicio {match.hora?.slice(0, 5)}</span></div></div></article>) : <div className="rounded-2xl border border-dashed border-white/15 p-8 text-center"><ClockIcon className="mx-auto h-9 w-9 text-[#607080]" /><p className="mt-3 text-sm text-[#8995a4]">No hay partidos próximos.</p><Link to="/partidos" className="mt-3 inline-block font-black text-[#70e4df]">Programar partido</Link></div>}</div>
      </div>
    </section>

    <section className="grid gap-6 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-[0.16em] text-violet-300">Pulso financiero</p><h2 className="mt-1 text-xl font-black text-white">Resultado del mes</h2></div><ArrowTrendingUpIcon className={`h-8 w-8 ${data.kpis.saldo_mes >= 0 ? 'text-emerald-300' : 'text-red-300'}`} /></div><div className="mt-6 grid gap-5 sm:grid-cols-3"><div><p className="text-xs text-[#8995a4]">Ingresos</p><p className="mt-1 text-xl font-black text-emerald-300">{money(data.kpis.ingresos_mes)}</p></div><div><p className="text-xs text-[#8995a4]">Egresos</p><p className="mt-1 text-xl font-black text-red-300">{money(data.kpis.egresos_mes)}</p></div><div><p className="text-xs text-[#8995a4]">Saldo</p><p className={`mt-1 text-xl font-black ${data.kpis.saldo_mes >= 0 ? 'text-white' : 'text-red-300'}`}>{money(data.kpis.saldo_mes)}</p></div></div><div className="mt-6 space-y-3"><div><div className="mb-1 flex justify-between text-xs text-[#8995a4]"><span>Ingresos</span><span>{Math.round((data.kpis.ingresos_mes / maxFinance) * 100)}%</span></div><div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-emerald-400" style={{ width: `${(data.kpis.ingresos_mes / maxFinance) * 100}%` }} /></div></div><div><div className="mb-1 flex justify-between text-xs text-[#8995a4]"><span>Egresos</span><span>{Math.round((data.kpis.egresos_mes / maxFinance) * 100)}%</span></div><div className="h-2 rounded-full bg-white/5"><div className="h-2 rounded-full bg-red-400" style={{ width: `${(data.kpis.egresos_mes / maxFinance) * 100}%` }} /></div></div></div><Link to="/finanzas" className="mt-5 inline-flex min-h-11 items-center rounded-xl border border-violet-400/25 px-4 font-black text-violet-200 hover:bg-violet-500/10">Abrir Finanzas y ERP →</Link></div>
      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-6"><p className="text-xs font-black uppercase tracking-[0.16em] text-[#70e4df]">Accesos rápidos</p><h2 className="mt-1 text-xl font-black text-white">Operación diaria</h2><div className="mt-5 grid grid-cols-2 gap-3">{[
        ['/matricula', 'Nueva matrícula', '📝'], ['/partidos', 'Programar partido', '⚽'], ['/profesores', 'Profesores', '🧑‍🏫'], ['/uniformes', `${data.kpis.uniformes_pendientes} uniformes pendientes`, '👕'],
      ].map(([to, label, emoji]) => <Link key={to} to={to} className="rounded-2xl border border-white/10 bg-[#101620] p-4 transition hover:border-[#289E9D]/40 hover:bg-[#16222c]"><span className="text-2xl">{emoji}</span><p className="mt-3 text-sm font-black text-white">{label}</p></Link>)}</div></div>
    </section>
  </div>;
};

export default Dashboard;

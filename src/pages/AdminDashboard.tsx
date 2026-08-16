import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { BanknotesIcon, BellAlertIcon, BuildingOffice2Icon, ChartBarIcon, CheckCircleIcon, ClockIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAdminTheme } from '../contexts/AdminThemeContext';
import { useAppDialog } from '../contexts/DialogContext';

type Academy = { id: string; nombre: string; plan: string; estado: string; subscription_status: string; jugadores_count?: number; subscription: { blocked: boolean; trial: boolean; remainingDays?: number | null; urgency?: string | null; reason?: string | null } };
type Summary = { kpis: { academies: number; active: number; trials: number; blocked: number; mrrClpNet: number; mrrClpGross: number; income: number; expenses: number; net: number; receivable: number; conversionRate: number }; academies: Academy[]; alerts: { type: string; severity: string; academyId: string; academyName: string; message: string }[]; gateway: { provider: string; configured: boolean } };
type FunnelStage = { code: string; label: string; count: number; rate: number };
type ActivationFunnel = { windowDays: number; cohort: number; stages: FunnelStage[]; productDepth: { evaluated: number; evaluationRate: number }; academies: { academyId: string; academyName: string; registeredAt: string; currentMilestone: string; lastMilestoneAt: string }[] };

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(value || 0);

const AdminDashboard = () => {
  const { theme } = useAdminTheme();
  const light = theme === 'light';
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['saas-resumen'], queryFn: async () => (await api.get('/api/saas-admin/resumen')).data.data as Summary });
  const { data: activation, isLoading: activationLoading } = useQuery({
    queryKey: ['saas-activation-funnel', 30],
    queryFn: async () => (await api.get('/api/saas-admin/activation-funnel', { params: { days: 30 } })).data.data as ActivationFunnel,
  });
  const panel = light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#1C212D]';
  const muted = light ? 'text-slate-500' : 'text-[#91a0b2]';
  const text = light ? 'text-slate-950' : 'text-white';
  const soft = light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/15';
  const extend = async (academyId: string) => {
    try { await api.post(`/api/saas-admin/academias/${academyId}/extender-prueba`, { dias: 7 }); await queryClient.invalidateQueries({ queryKey: ['saas-resumen'] }); await notify('Prueba extendida por 7 días.', { title: 'Syncademia' }); }
    catch (err: any) { await notify(err.response?.data?.error || 'No fue posible extender la prueba.', { title: 'Syncademia' }); }
  };
  if (isLoading) return <div className={`p-10 text-center ${muted}`}>Preparando visión ejecutiva...</div>;
  if (error || !data) return <div className="rounded-2xl border border-red-400/30 bg-red-500/10 p-6 text-red-300">No fue posible cargar el panel maestro.</div>;
  const cards = [
    ['MRR estimado', money(data.kpis.mrrClpGross), `${money(data.kpis.mrrClpNet)} neto`, BanknotesIcon, 'text-emerald-500'],
    ['Academias activas', String(data.kpis.active), `${data.kpis.academies} registradas`, BuildingOffice2Icon, 'text-[#289E9D]'],
    ['Conversión', `${data.kpis.conversionRate}%`, `${data.kpis.trials} en prueba`, ChartBarIcon, 'text-violet-500'],
    ['Por cobrar', money(data.kpis.receivable), `${data.kpis.blocked} bloqueadas`, ClockIcon, 'text-amber-500'],
  ] as const;
  return <div className="space-y-6 pb-12">
    <section className={`relative overflow-hidden rounded-[30px] border p-7 sm:p-9 ${light ? 'border-cyan-200 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,0.18),transparent_38%),white]' : 'border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,0.2),transparent_38%),#17202b]'}`}>
      <div className="relative flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#289E9D]">Control central · Syncademia</p><h1 className={`mt-3 max-w-3xl text-4xl font-black leading-tight sm:text-5xl ${text}`}>Tu negocio completo, visible en una sola mirada.</h1><p className={`mt-4 max-w-2xl leading-7 ${muted}`}>Suscripciones, conversión, caja, pruebas y riesgos comerciales actualizados en tiempo real.</p></div><div className={`rounded-2xl border p-5 ${panel}`}><p className={`text-xs font-bold uppercase ${muted}`}>Estado comercial</p><div className="mt-2 flex items-center gap-2"><CheckCircleIcon className="h-7 w-7 text-emerald-500" /><span className={`text-xl font-black ${text}`}>{data.gateway.configured ? 'Operación conectada' : `${data.gateway.provider || 'Pasarela'} pendiente de configuración`}</span></div><p className={`mt-2 text-sm ${muted}`}>Cobros mensuales en pesos chilenos</p></div></div>
    </section>
    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label, value, detail, Icon, color]) => <article key={label} className={`rounded-2xl border p-5 ${panel}`}><div className="flex items-start justify-between"><div><p className={`text-xs font-black uppercase tracking-wider ${muted}`}>{label}</p><p className={`mt-3 text-3xl font-black ${text}`}>{value}</p><p className={`mt-2 text-sm ${muted}`}>{detail}</p></div><Icon className={`h-8 w-8 ${color}`} /></div></article>)}</section>

    <section className={`rounded-2xl border p-6 ${panel}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-wider text-violet-500">Activación basada en uso real</p><h2 className={`mt-1 text-2xl font-black ${text}`}>Embudo · últimos 30 días</h2><p className={`mt-2 max-w-3xl text-sm leading-6 ${muted}`}>Cada porcentaje muestra qué parte de la cohorte alcanzó un hito real dentro del producto. No contabiliza visitas ni clics.</p></div>
        {activation ? <div className={`rounded-xl border px-4 py-3 text-right ${soft}`}><p className={`text-xs font-bold uppercase ${muted}`}>Cohorte</p><p className={`text-2xl font-black ${text}`}>{activation.cohort}</p></div> : null}
      </div>
      {activationLoading ? <div className={`py-10 text-center ${muted}`}>Calculando activación...</div> : !activation || activation.cohort === 0 ? <div className={`mt-6 rounded-xl border p-6 text-center ${soft} ${muted}`}>Aún no hay academias registradas en esta cohorte.</div> : <div className="mt-6 space-y-3">{activation.stages.map((stage) => <div key={stage.code} className={`rounded-xl border p-4 ${soft}`}><div className="flex items-center justify-between gap-4"><div><p className={`font-black ${text}`}>{stage.label}</p><p className={`mt-1 text-xs ${muted}`}>{stage.count} de {activation.cohort} academias</p></div><strong className={`text-xl ${stage.rate >= 70 ? 'text-emerald-500' : stage.rate >= 35 ? 'text-amber-500' : 'text-red-500'}`}>{stage.rate}%</strong></div><div className={`mt-3 h-2 overflow-hidden rounded-full ${light ? 'bg-slate-200' : 'bg-white/10'}`}><div className="h-full rounded-full bg-[#289E9D] transition-all" style={{ width: `${Math.max(0, Math.min(100, stage.rate))}%` }} /></div></div>)}</div>}
      {activation && activation.cohort > 0 ? <div className={`mt-5 flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${soft}`}><div><p className={`font-black ${text}`}>Profundidad deportiva</p><p className={`mt-1 text-sm ${muted}`}>Academias que ya registraron al menos una evaluación deportiva.</p></div><div className="text-right"><strong className="text-2xl text-violet-500">{activation.productDepth.evaluationRate}%</strong><p className={`text-xs ${muted}`}>{activation.productDepth.evaluated} academias</p></div></div> : null}
    </section>

    <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <div className={`rounded-2xl border p-6 ${panel}`}><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-amber-500">Atención ejecutiva</p><h2 className={`mt-1 text-2xl font-black ${text}`}>Alertas prioritarias</h2></div><BellAlertIcon className="h-8 w-8 text-amber-500" /></div><div className="mt-5 space-y-3">{data.alerts.length ? data.alerts.slice(0, 8).map((alert, index) => <article key={`${alert.type}-${alert.academyId}-${index}`} className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${soft}`}><div><p className={`font-black ${text}`}>{alert.academyName}</p><p className={`mt-1 text-sm ${alert.severity === 'critical' ? 'text-red-500' : 'text-amber-500'}`}>{alert.message}</p></div>{alert.type === 'trial' ? <button onClick={() => void extend(alert.academyId)} className="rounded-lg border border-[#289E9D]/40 px-3 py-2 text-sm font-black text-[#289E9D]">+7 días</button> : null}</article>) : <div className={`py-10 text-center ${muted}`}><CheckCircleIcon className="mx-auto h-10 w-10 text-emerald-500" /><p className="mt-3 font-bold">No hay alertas críticas.</p></div>}</div></div>
      <div className={`rounded-2xl border p-6 ${panel}`}><p className="text-xs font-black uppercase tracking-wider text-[#289E9D]">Resultado del mes</p><h2 className={`mt-1 text-2xl font-black ${text}`}>Caja de la plataforma</h2><div className="mt-6 space-y-4"><div className="flex justify-between"><span className={muted}>Ingresos recibidos</span><strong className="text-emerald-500">{money(data.kpis.income)}</strong></div><div className="flex justify-between"><span className={muted}>Egresos</span><strong className="text-red-500">{money(data.kpis.expenses)}</strong></div><div className={`border-t pt-4 ${light ? 'border-slate-200' : 'border-white/10'}`}><div className="flex justify-between"><span className={`font-black ${text}`}>Resultado neto</span><strong className={`text-xl ${data.kpis.net >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{money(data.kpis.net)}</strong></div></div></div><div className="mt-7 grid gap-3"><Link to="/admin/finanzas" className="rounded-xl bg-[#289E9D] px-4 py-3 text-center font-black text-white">Abrir financiero</Link><Link to="/admin/academias" className={`rounded-xl border px-4 py-3 text-center font-black ${light ? 'border-slate-300 text-slate-700' : 'border-white/15 text-white'}`}>Gestionar academias</Link></div></div>
    </section>
  </div>;
};

export default AdminDashboard;

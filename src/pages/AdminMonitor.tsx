import { useQuery } from '@tanstack/react-query';
import { ArrowPathIcon, CheckCircleIcon, CircleStackIcon, CloudIcon, CpuChipIcon, EnvelopeIcon, ExclamationTriangleIcon, ServerStackIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAdminTheme } from '../contexts/AdminThemeContext';
import MemoryHistoryPanel from '../components/MemoryHistoryPanel';

type ComponentState = { key: string; label: string; status: 'ok'|'warning'|'critical'; detail: string; metrics?: any };
type Monitor = {
  checked_at: string;
  overall: 'ok'|'warning'|'critical';
  components: ComponentState[];
  configuration: { label: string; configured: boolean }[];
  alerts: { severity: string; type: string; message: string }[];
  operations: { http_5xx_24h: number; http_5xx_15m: number; prematriculas_error_24h: number; privacy_open: number; privacy_overdue: number; privacy_due_5d: number };
  recent_events: { id: string; severidad: string; categoria: string; fuente: string; http_status?: number | null; metodo?: string | null; ruta?: string | null; mensaje: string; created_at: string }[];
};

const iconByKey: Record<string, any> = { backend: ServerStackIcon, database: CircleStackIcon, auth: ShieldCheckIcon, storage: CloudIcon, frontend: CloudIcon, email: EnvelopeIcon, whatsapp: CloudIcon };
const tone = (status: string) => status === 'critical' ? 'text-red-500 bg-red-500/10 border-red-500/25' : status === 'warning' ? 'text-amber-500 bg-amber-500/10 border-amber-500/25' : 'text-emerald-500 bg-emerald-500/10 border-emerald-500/25';
const statusLabel = (status: string) => status === 'critical' ? 'Crítico' : status === 'warning' ? 'Atención' : 'Operativo';

const AdminMonitor = () => {
  const { theme } = useAdminTheme();
  const light = theme === 'light';
  const query = useQuery({
    queryKey: ['system-monitor'],
    queryFn: async () => (await api.get('/api/saas-admin/monitor')).data.data as Monitor,
    refetchInterval: 60_000,
    staleTime: 20_000,
  });
  const data = query.data;
  const panel = light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#1C212D]';
  const text = light ? 'text-slate-950' : 'text-white';
  const muted = light ? 'text-slate-500' : 'text-[#91a0b2]';
  if (query.isLoading) return <div className={`p-12 text-center font-bold ${muted}`}>Comprobando servicios...</div>;
  if (query.error || !data) return <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-red-400">No fue posible cargar el monitor. Si esta pantalla abre pero el monitor falla, revisa primero el backend y Supabase.</div>;

  const summaryCards = [
    ['Errores 5xx · 15 min', data.operations.http_5xx_15m, data.operations.http_5xx_15m ? 'text-red-500' : 'text-emerald-500'],
    ['Errores 5xx · 24 h', data.operations.http_5xx_24h, data.operations.http_5xx_24h ? 'text-amber-500' : 'text-emerald-500'],
    ['Pre-matrículas con error', data.operations.prematriculas_error_24h, data.operations.prematriculas_error_24h ? 'text-amber-500' : 'text-emerald-500'],
    ['Privacidad abierta', data.operations.privacy_open, data.operations.privacy_overdue ? 'text-red-500' : data.operations.privacy_due_5d ? 'text-amber-500' : 'text-[#289E9D]'],
  ] as const;

  return <div className="space-y-6 pb-12">
    <section className={`rounded-[30px] border p-6 sm:p-8 ${light ? 'border-slate-200 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,0.16),transparent_40%),white]' : 'border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,0.16),transparent_40%),#17202b]'}`}><div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.22em] text-[#289E9D]">Observabilidad · Syncademia</p><h1 className={`mt-2 text-3xl font-black sm:text-4xl ${text}`}>Monitor del sistema</h1><p className={`mt-3 max-w-3xl text-sm leading-6 ${muted}`}>Chequeo real de backend, Supabase, Storage, frontend, correo y WhatsApp. Se actualiza automáticamente cada 60 segundos.</p></div><div className={`min-w-48 rounded-2xl border p-5 ${tone(data.overall)}`}><p className="text-xs font-black uppercase tracking-wider">Estado global</p><p className="mt-1 text-2xl font-black">{statusLabel(data.overall)}</p><p className="mt-2 text-xs opacity-80">{new Date(data.checked_at).toLocaleString('es-CL')}</p></div></div><button onClick={() => void query.refetch()} disabled={query.isFetching} className={`mt-5 inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-black ${light ? 'border-slate-300 text-slate-700' : 'border-white/15 text-white'}`}><ArrowPathIcon className={`h-5 w-5 ${query.isFetching ? 'animate-spin' : ''}`} /> Comprobar ahora</button></section>

    {data.alerts.length ? <section className={`rounded-2xl border p-5 ${panel}`}><div className="flex items-center gap-3"><ExclamationTriangleIcon className="h-7 w-7 text-amber-500" /><div><p className={`font-black ${text}`}>Requiere atención</p><p className={`text-sm ${muted}`}>Estas alertas no siempre significan caída, pero sí ameritan revisión.</p></div></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{data.alerts.map((alert, index) => <div key={`${alert.type}-${index}`} className={`rounded-xl border p-4 ${tone(alert.severity)}`}><p className="text-sm font-bold">{alert.message}</p></div>)}</div></section> : <section className={`rounded-2xl border p-5 ${panel}`}><div className="flex items-center gap-3 text-emerald-500"><CheckCircleIcon className="h-8 w-8" /><div><p className="font-black">Sin alertas operativas</p><p className={`text-sm ${muted}`}>Todos los chequeos actuales están dentro de parámetros normales.</p></div></div></section>}

    <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{summaryCards.map(([label, value, color]) => <article key={label} className={`rounded-2xl border p-5 ${panel}`}><p className={`text-xs font-black uppercase tracking-wider ${muted}`}>{label}</p><p className={`mt-2 text-3xl font-black ${color}`}>{value}</p></article>)}</section>

    <MemoryHistoryPanel light={light} />

    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.components.map((component) => { const Icon = iconByKey[component.key] || CpuChipIcon; return <article key={component.key} className={`rounded-2xl border p-5 ${panel}`}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className={`grid h-11 w-11 place-items-center rounded-xl border ${tone(component.status)}`}><Icon className="h-6 w-6" /></div><div><p className={`font-black ${text}`}>{component.label}</p><p className={`mt-1 text-sm ${muted}`}>{component.detail}</p></div></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${tone(component.status)}`}>{statusLabel(component.status)}</span></div>{component.key === 'backend' && component.metrics ? <div className={`mt-4 grid grid-cols-2 gap-2 text-xs ${muted}`}><div className={`rounded-lg p-3 ${light ? 'bg-slate-50' : 'bg-black/15'}`}><p>Memoria</p><p className={`mt-1 font-black ${text}`}>{component.metrics.memory_rss_mb} MB · {component.metrics.memory_percent}%</p></div><div className={`rounded-lg p-3 ${light ? 'bg-slate-50' : 'bg-black/15'}`}><p>Commit</p><p className={`mt-1 font-black ${text}`}>{component.metrics.commit || '—'}</p></div></div> : null}</article>; })}</section>

    <section className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]"><div className={`rounded-2xl border p-5 ${panel}`}><h2 className={`text-xl font-black ${text}`}>Configuración crítica</h2><p className={`mt-1 text-sm ${muted}`}>El monitor nunca expone el valor de las claves.</p><div className="mt-4 space-y-2">{data.configuration.map((item) => <div key={item.label} className={`flex items-center justify-between rounded-xl p-3 ${light ? 'bg-slate-50' : 'bg-black/15'}`}><span className={`text-sm font-bold ${text}`}>{item.label}</span><span className={`rounded-full px-2 py-1 text-xs font-black ${item.configured ? 'bg-emerald-500/15 text-emerald-500' : 'bg-amber-500/15 text-amber-500'}`}>{item.configured ? 'OK' : 'Revisar'}</span></div>)}</div></div>
      <div className={`rounded-2xl border p-5 ${panel}`}><h2 className={`text-xl font-black ${text}`}>Eventos recientes del backend</h2><p className={`mt-1 text-sm ${muted}`}>Solo se registran metadatos técnicos seguros, sin cuerpos de peticiones ni datos personales.</p><div className="mt-4 max-h-[430px] space-y-2 overflow-y-auto">{data.recent_events.length ? data.recent_events.map((event) => <div key={event.id} className={`rounded-xl border p-3 ${light ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/15'}`}><div className="flex flex-wrap items-center justify-between gap-2"><p className={`text-sm font-black ${text}`}>{event.http_status ? `HTTP ${event.http_status}` : event.categoria}</p><span className={`text-xs ${muted}`}>{new Date(event.created_at).toLocaleString('es-CL')}</span></div><p className={`mt-1 text-sm ${muted}`}>{event.mensaje}</p>{event.ruta ? <p className="mt-1 break-all text-xs text-[#289E9D]">{event.metodo} {event.ruta}</p> : null}</div>) : <p className={`py-12 text-center text-sm ${muted}`}>No hay eventos técnicos recientes.</p>}</div></div></section>
  </div>;
};

export default AdminMonitor;

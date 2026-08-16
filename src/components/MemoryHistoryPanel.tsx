import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowTrendingUpIcon, CircleStackIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type Metric = {
  captured_at: string;
  instance_id?: string | null;
  commit_sha?: string | null;
  uptime_seconds: number;
  memory_rss_mb: number;
  heap_used_mb: number;
  memory_percent: number;
  memory_limit_mb: number;
};
type MemoryHistory = {
  range_hours: number;
  sample_interval_minutes: number;
  retention_days: number;
  rows: Metric[];
  summary: {
    current_rss_mb: number;
    current_percent: number;
    avg_1h_mb?: number | null;
    avg_6h_mb?: number | null;
    avg_24h_mb?: number | null;
    min_24h_mb?: number | null;
    max_24h_mb?: number | null;
    delta_1h_mb?: number | null;
    delta_6h_mb?: number | null;
    delta_24h_mb?: number | null;
    slope_6h_mb_per_hour?: number | null;
    suspected_leak: boolean;
    status: 'collecting' | 'stable' | 'warning' | 'critical';
    samples: number;
  };
};

const signed = (value?: number | null) => value == null ? '—' : `${value > 0 ? '+' : ''}${value} MB`;

const MemoryHistoryPanel = ({ light }: { light: boolean }) => {
  const query = useQuery({
    queryKey: ['system-memory-history', 24],
    queryFn: async () => (await api.get('/api/saas-admin/metrics/memory?hours=24')).data.data as MemoryHistory,
    refetchInterval: 5 * 60_000,
    staleTime: 60_000,
  });
  const data = query.data;
  const panel = light ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#1C212D]';
  const text = light ? 'text-slate-950' : 'text-white';
  const muted = light ? 'text-slate-500' : 'text-[#91a0b2]';
  if (query.isLoading) return <section className={`rounded-2xl border p-5 ${panel}`}><p className={`text-sm font-bold ${muted}`}>Cargando histórico de memoria...</p></section>;
  if (!data) return null;

  const chart = data.rows.map((row) => ({
    ...row,
    time: new Date(row.captured_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
  }));
  const statusTone = data.summary.status === 'critical' ? 'text-red-500 bg-red-500/10 border-red-500/30'
    : data.summary.status === 'warning' ? 'text-amber-500 bg-amber-500/10 border-amber-500/30'
      : data.summary.status === 'stable' ? 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30'
        : 'text-sky-500 bg-sky-500/10 border-sky-500/30';
  const statusText = data.summary.status === 'critical' ? 'Tendencia crítica'
    : data.summary.status === 'warning' ? 'Revisar tendencia'
      : data.summary.status === 'stable' ? 'Tendencia estable' : 'Recolectando historial';

  return <section className={`rounded-2xl border p-5 sm:p-6 ${panel}`}>
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-3"><CircleStackIcon className="h-7 w-7 text-[#289E9D]" /><h2 className={`text-xl font-black ${text}`}>Histórico de memoria · 24 horas</h2></div><p className={`mt-2 text-sm ${muted}`}>Una muestra cada {data.sample_interval_minutes} minutos. Conservación: {data.retention_days} días. Los reinicios permanecen visibles porque el historial vive en Supabase.</p></div><div className={`rounded-xl border px-4 py-3 ${statusTone}`}><p className="text-xs font-black uppercase tracking-wider">Análisis automático</p><p className="mt-1 font-black">{statusText}</p>{data.summary.slope_6h_mb_per_hour != null ? <p className="mt-1 text-xs">Pendiente 6 h: {data.summary.slope_6h_mb_per_hour} MB/h</p> : null}</div></div>

    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      {[
        ['Ahora', `${data.summary.current_rss_mb} MB · ${data.summary.current_percent}%`],
        ['Promedio 1 h', data.summary.avg_1h_mb != null ? `${data.summary.avg_1h_mb} MB` : '—'],
        ['Cambio 1 h', signed(data.summary.delta_1h_mb)],
        ['Cambio 6 h', signed(data.summary.delta_6h_mb)],
        ['Rango 24 h', data.summary.min_24h_mb != null ? `${data.summary.min_24h_mb}–${data.summary.max_24h_mb} MB` : '—'],
      ].map(([label, value]) => <div key={label} className={`rounded-xl p-3 ${light ? 'bg-slate-50' : 'bg-black/15'}`}><p className={`text-[11px] font-black uppercase tracking-wider ${muted}`}>{label}</p><p className={`mt-1 font-black ${text}`}>{value}</p></div>)}
    </div>

    {chart.length >= 2 ? <div className="mt-6 h-72 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}><defs><linearGradient id="memoryFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#289E9D" stopOpacity={0.45}/><stop offset="95%" stopColor="#289E9D" stopOpacity={0.02}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" stroke={light ? '#e2e8f0' : '#30363d'} /><XAxis dataKey="time" minTickGap={28} tick={{ fontSize: 11, fill: light ? '#64748b' : '#8b949e' }} /><YAxis unit=" MB" tick={{ fontSize: 11, fill: light ? '#64748b' : '#8b949e' }} domain={['dataMin - 10', 'dataMax + 20']} /><Tooltip contentStyle={{ background: light ? '#fff' : '#161b22', border: `1px solid ${light ? '#e2e8f0' : '#30363d'}`, borderRadius: 12 }} formatter={(value: number, name: string) => [`${value} MB`, name === 'memory_rss_mb' ? 'RSS' : 'Heap']} labelFormatter={(_label, payload) => payload?.[0]?.payload?.captured_at ? new Date(payload[0].payload.captured_at).toLocaleString('es-CL') : ''} /><Area type="monotone" dataKey="memory_rss_mb" stroke="#289E9D" strokeWidth={2.5} fill="url(#memoryFill)" /><Area type="monotone" dataKey="heap_used_mb" stroke="#8b5cf6" strokeWidth={1.5} fillOpacity={0} /></AreaChart></ResponsiveContainer></div> : <div className={`mt-6 rounded-xl border border-dashed p-8 text-center ${light ? 'border-slate-300' : 'border-white/15'}`}><ArrowTrendingUpIcon className="mx-auto h-10 w-10 text-sky-500" /><p className={`mt-3 font-black ${text}`}>Recolectando las primeras muestras</p><p className={`mt-1 text-sm ${muted}`}>En unos minutos aparecerá la curva. El detector necesita varias muestras antes de evaluar una tendencia.</p></div>}

    {data.summary.suspected_leak ? <div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm font-bold text-amber-500">La memoria muestra una subida sostenida que merece revisión. Esto no declara automáticamente una fuga: el monitor la marca para correlacionarla con tráfico, generación de PDFs, WhatsApp y reinicios.</div> : null}
  </section>;
};

export default MemoryHistoryPanel;

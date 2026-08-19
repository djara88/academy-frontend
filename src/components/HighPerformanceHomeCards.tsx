import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { ArrowRightIcon, ChartBarSquareIcon, HeartIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';

type Props={features:string[]};
type HealthSummary={resumen:{por_estado:Record<string,number>;lesiones_activas:number;certificados_vencidos:number}};

export default function HighPerformanceHomeCards({features}:Props){
 const hasAnalytics=features.includes('analitica_avanzada');
 const hasHealth=features.includes('ficha_medica');
 const {data}=useQuery({queryKey:['home-health-summary'],enabled:hasHealth,queryFn:async()=>((await api.get('/api/ficha-medica/resumen')).data.data as HealthSummary),staleTime:60_000,retry:1});
 if(!hasAnalytics&&!hasHealth)return null;
 return <section className="grid gap-4 lg:grid-cols-2">
  {hasAnalytics?<Link to="/rendimiento/analitica" className="group relative overflow-hidden rounded-3xl border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.18),transparent_38%),#151b25] p-6 transition hover:-translate-y-0.5 hover:border-violet-300/40"><ChartBarSquareIcon className="h-8 w-8 text-violet-300"/><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-violet-300">Alto Rendimiento</p><h2 className="mt-1 text-2xl font-black text-white">Analítica deportiva</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#9aa6b5]">Convierte eventos, métricas, PB/SB y temporadas en lectura longitudinal del rendimiento.</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-violet-200">Abrir analítica <ArrowRightIcon className="h-4 w-4"/></span></Link>:null}
  {hasHealth?<Link to="/salud-deportiva" className="group relative overflow-hidden rounded-3xl border border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,.16),transparent_38%),#151b25] p-6 transition hover:-translate-y-0.5 hover:border-emerald-300/40"><HeartIcon className="h-8 w-8 text-emerald-300"/><p className="mt-5 text-xs font-black uppercase tracking-[.16em] text-emerald-300">Perfil 360°</p><h2 className="mt-1 text-2xl font-black text-white">Salud y disponibilidad</h2><p className="mt-2 max-w-xl text-sm leading-6 text-[#9aa6b5]">{data?`${data.resumen.por_estado?.Disponible||0} disponibles · ${data.resumen.lesiones_activas||0} seguimientos activos · ${data.resumen.certificados_vencidos||0} certificados vencidos`:'Conecta disponibilidad, lesiones, certificados, asistencia y rendimiento sin convertir Lestra en una historia clínica.'}</p><span className="mt-5 inline-flex items-center gap-2 text-sm font-black text-emerald-200">Abrir Salud y disponibilidad <ArrowRightIcon className="h-4 w-4"/></span></Link>:null}
 </section>;
}

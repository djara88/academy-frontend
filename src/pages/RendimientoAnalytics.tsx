import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_FIELD, DirectorHero, DirectorPage, DirectorPanel, DirectorStat } from '../components/director/DirectorModule';

type Branch = { id: string; nombre: string; disciplina: string; sedes?: { id: string; nombre: string } | null };
type Category = { id: string; nombre: string; rama_id?: string | null };
type MetricValue = { code: string; label: string; value: number; unit?: string | null; decimals?: number; samples?: number };
type Athlete = { jugador_id: string; nombre: string; participaciones: number; titularidades: number; minutos: number; mvp: number; metricas: MetricValue[] };
type Discipline = { profile: { code: string; label: string; icon: string; usesHeadToHeadScore: boolean; metrics: Array<{ code: string; label: string; tier?: string }> }; resumen: { eventos: number; deportistas: number; participaciones: number; minutos: number; destacados: number; victorias: number; empates: number; derrotas: number; a_favor: number; en_contra: number }; metricas_equipo: MetricValue[]; deportistas_ranking: Athlete[]; tendencia: Array<{ id: string; fecha: string; evento: string; competencia?: string | null; categoria?: string | null; resultado_favor?: number | null; resultado_contra?: number | null }> };
type Mark = { jugador_id: string; jugador_nombre: string; disciplina_codigo: string; prueba_nombre: string; metrica_label: string; valor: number; unidad?: string | null; temporada: string; fecha: string; valor_pb_anterior?: number | null };
type Analytics = { resumen: { eventos: number; disciplinas: number; deportistas: number; participaciones: number; minutos: number; destacados: number; pb_vigentes: number; sb_vigentes: number }; disciplinas: Discipline[]; marcas: { personal_bests: Mark[]; season_bests: Mark[]; mejoras_recientes: Mark[] }; truncated?: boolean };

const formatNumber=(value:number,decimals=0)=>Number(value||0).toLocaleString('es-CL',{maximumFractionDigits:decimals});
const valueText=(metric:MetricValue)=>`${formatNumber(metric.value,metric.decimals||0)}${metric.unit?` ${metric.unit}`:''}`;

export default function RendimientoAnalytics(){
  const {notify}=useAppDialog();
  const [branches,setBranches]=useState<Branch[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [branchId,setBranchId]=useState('');
  const [categoryId,setCategoryId]=useState('');
  const [season,setSeason]=useState(String(new Date().getFullYear()));
  const [data,setData]=useState<Analytics|null>(null);
  const [loading,setLoading]=useState(true);
  const [locked,setLocked]=useState(false);

  const categoryOptions=useMemo(()=>categories.filter(item=>!branchId||item.rama_id===branchId),[categories,branchId]);
  const seasonOptions=useMemo(()=>{const current=new Date().getFullYear();return Array.from({length:6},(_,index)=>String(current-index));},[]);
  const loadCatalog=useCallback(async()=>{try{const [primaryResponse,categoriesResponse]=await Promise.all([api.get('/api/academias/rama-principal'),api.get('/api/jugadores/categorias')]);setBranches(primaryResponse.data.data?.ramas||[]);setCategories(categoriesResponse.data.data||[]);}catch(error:any){await notify(error.response?.data?.error||'No fue posible cargar los filtros deportivos.');}},[notify]);
  const loadAnalytics=useCallback(async()=>{setLoading(true);setLocked(false);try{const response=await api.get('/api/rendimiento/analitica',{params:{...(branchId?{rama_id:branchId}:{}),...(categoryId?{categoria_id:categoryId}:{}),...(season?{temporada:season}:{})}});setData(response.data.data||null);}catch(error:any){if(error.response?.status===403&&error.response?.data?.feature==='analitica_avanzada'){setLocked(true);setData(null);}else{await notify(error.response?.data?.error||'No fue posible cargar la analítica deportiva.');}}finally{setLoading(false);}},[branchId,categoryId,season,notify]);
  useEffect(()=>{void loadCatalog();},[loadCatalog]);
  useEffect(()=>{void loadAnalytics();},[loadAnalytics]);
  useEffect(()=>{if(categoryId&&!categoryOptions.some(item=>item.id===categoryId))setCategoryId('');},[branchId,categoryId,categoryOptions]);

  if(locked)return <DirectorPage className="max-w-5xl"><DirectorHero eyebrow="Alto Rendimiento" title="Analítica deportiva avanzada" description="La captura de resultados y métricas está disponible desde Competencia. Este panel consolida tendencias, rankings, métricas colectivas y marcas PB/SB para Alto Rendimiento." actions={<Link to="/suscripcion" className={DIRECTOR_BUTTON}>Revisar Alto Rendimiento</Link>}/></DirectorPage>;

  return <DirectorPage>
    <DirectorHero eyebrow="Alto Rendimiento" title="Analítica deportiva" description="Convierte cada evento y resultado en información útil para decisiones deportivas: participación, carga competitiva, resultados, métricas de equipo, desempeño individual y evolución de marcas." actions={<Link to="/partidos" className={DIRECTOR_BUTTON_DARK}>← Eventos y rendimiento</Link>}/>

    <DirectorPanel className="p-4"><div className="grid gap-3 md:grid-cols-3"><select value={branchId} onChange={event=>setBranchId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Todas las ramas</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select><select value={categoryId} onChange={event=>setCategoryId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Todas las categorías</option>{categoryOptions.map(category=><option key={category.id} value={category.id}>{category.nombre}</option>)}</select><select value={season} onChange={event=>setSeason(event.target.value)} className={DIRECTOR_FIELD}><option value="">Toda la historia</option>{seasonOptions.map(year=><option key={year} value={year}>Temporada {year}</option>)}</select></div></DirectorPanel>

    {loading?<DirectorPanel className="p-12 text-center text-sm font-bold text-[#697468]">Calculando analítica deportiva…</DirectorPanel>:data?<>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><DirectorStat label="Eventos" value={data.resumen.eventos} tone="lime"/><DirectorStat label="Deportistas" value={data.resumen.deportistas}/><DirectorStat label="Participaciones" value={data.resumen.participaciones} detail={`${formatNumber(data.resumen.minutos,1)} min acumulados`}/><DirectorStat label="PB vigentes" value={data.resumen.pb_vigentes} tone="dark"/></section>

      {data.disciplinas.map(discipline=>{
        const visibleTeamMetrics=discipline.metricas_equipo.filter(metric=>metric.samples&&metric.samples>0).slice(0,8);
        const headlineMetrics=discipline.profile.metrics.filter(metric=>metric.tier!=='advanced').slice(0,4);
        const disciplinePB=data.marcas.personal_bests.filter(mark=>mark.disciplina_codigo===discipline.profile.code).length;
        return <DirectorPanel key={discipline.profile.code} className="overflow-hidden">
          <div className="border-b border-[#e2e7df] p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">{discipline.profile.icon} {discipline.profile.label}</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Radiografía competitiva</h2></div><div className="flex flex-wrap gap-2"><span className="rounded-full border border-[#d9e0d6] bg-[#f5f7f3] px-3 py-1.5 text-xs font-black text-[#111711]">{discipline.resumen.eventos} eventos</span><span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-3 py-1.5 text-xs font-black text-[#5f7900]">{discipline.resumen.deportistas} deportistas</span></div></div>
            {discipline.profile.usesHeadToHeadScore?<div className="mt-4 grid gap-2 grid-cols-3 sm:grid-cols-5"><Mini label="Victorias" value={discipline.resumen.victorias}/><Mini label="Empates" value={discipline.resumen.empates}/><Mini label="Derrotas" value={discipline.resumen.derrotas}/><Mini label="A favor" value={discipline.resumen.a_favor}/><Mini label="En contra" value={discipline.resumen.en_contra}/></div>:<div className="mt-4 grid gap-2 sm:grid-cols-3"><Mini label="Participaciones" value={discipline.resumen.participaciones}/><Mini label="PB vigentes" value={disciplinePB}/><Mini label="Destacados" value={discipline.resumen.destacados}/></div>}
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-2"><div><h3 className="text-sm font-black text-[#111711]">Métricas colectivas promedio</h3>{visibleTeamMetrics.length?<div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{visibleTeamMetrics.map(metric=><div key={metric.code} className="rounded-[16px] border border-[#dfe5dc] bg-[#f8faf6] p-3"><p className="text-[9px] font-black uppercase text-[#758074]">{metric.label}</p><p className="mt-1 text-lg font-black text-[#4f6900]">{valueText(metric)}</p><p className="text-[9px] text-[#758074]">{metric.samples} eventos</p></div>)}</div>:<p className="mt-3 rounded-[16px] border border-dashed border-[#d9e0d6] p-5 text-xs text-[#697468]">Aún no hay métricas colectivas suficientes.</p>}</div><div><h3 className="text-sm font-black text-[#111711]">Últimos eventos</h3><div className="mt-3 space-y-2">{discipline.tendencia.slice(-6).reverse().map(event=><div key={event.id} className="flex items-center justify-between gap-3 rounded-[14px] border border-[#dfe5dc] bg-[#f8faf6] px-3 py-2"><div className="min-w-0"><p className="truncate text-xs font-black text-[#111711]">{event.evento}</p><p className="text-[10px] text-[#697468]">{event.fecha}{event.categoria?` · ${event.categoria}`:''}</p></div>{event.resultado_favor!==null&&event.resultado_favor!==undefined?<span className="shrink-0 rounded-lg bg-[#111711] px-2 py-1 text-xs font-black text-white">{event.resultado_favor} — {event.resultado_contra}</span>:<span className="text-[10px] font-black text-[#5f7900]">Registrado</span>}</div>)}</div></div></div>

          <div className="border-t border-[#e2e7df] p-5"><h3 className="text-sm font-black text-[#111711]">Rendimiento de deportistas</h3><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr className="border-b border-[#dfe5dc] text-[9px] uppercase tracking-[.1em] text-[#697468]"><th className="px-3 py-2">Deportista</th><th className="px-3 py-2">Eventos</th><th className="px-3 py-2">Titular</th><th className="px-3 py-2">Minutos</th><th className="px-3 py-2">Destacado</th>{headlineMetrics.map(metric=><th key={metric.code} className="px-3 py-2">{metric.label}</th>)}</tr></thead><tbody>{discipline.deportistas_ranking.slice(0,10).map(athlete=><tr key={athlete.jugador_id} className="border-b border-[#edf0eb]"><td className="px-3 py-3 font-black text-[#111711]">{athlete.nombre}</td><td className="px-3 py-3 text-[#596458]">{athlete.participaciones}</td><td className="px-3 py-3 text-[#596458]">{athlete.titularidades}</td><td className="px-3 py-3 text-[#596458]">{formatNumber(athlete.minutos,1)}</td><td className="px-3 py-3 font-black text-[#5f7900]">{athlete.mvp}</td>{headlineMetrics.map(metric=>{const value=athlete.metricas.find(item=>item.code===metric.code);return <td key={metric.code} className="px-3 py-3 font-bold text-[#4f6900]">{value?valueText(value):'—'}</td>;})}</tr>)}</tbody></table></div>{!discipline.deportistas_ranking.length?<p className="mt-4 text-xs text-[#697468]">Aún no hay rendimiento individual registrado.</p>:null}</div>
        </DirectorPanel>;
      })}

      {data.marcas.mejoras_recientes.length?<DirectorPanel className="p-5 sm:p-6"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">PB / SB</p><h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Evolución de marcas</h2><p className="mt-1 text-sm text-[#697468]">Mejoras detectadas automáticamente desde Eventos y Rendimiento.</p></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.marcas.mejoras_recientes.slice(0,12).map((mark,index)=><article key={`${mark.jugador_id}-${mark.prueba_nombre}-${mark.fecha}-${index}`} className="rounded-[18px] border border-[#cde995] bg-[#f3fadf] p-4"><p className="text-sm font-black text-[#111711]">🏆 {mark.jugador_nombre}</p><p className="mt-1 text-xs font-bold text-[#5f7900]">{mark.prueba_nombre} · {mark.metrica_label}</p><p className="mt-3 text-2xl font-black text-[#111711]">{formatNumber(mark.valor,3)}{mark.unidad?` ${mark.unidad}`:''}</p>{mark.valor_pb_anterior!==null&&mark.valor_pb_anterior!==undefined?<p className="mt-1 text-[10px] text-[#697468]">PB anterior: {formatNumber(mark.valor_pb_anterior,3)}{mark.unidad?` ${mark.unidad}`:''}</p>:<p className="mt-1 text-[10px] font-black text-[#5f7900]">Primera marca registrada</p>}<p className="mt-2 text-[10px] text-[#758074]">{mark.fecha} · Temporada {mark.temporada}</p></article>)}</div></DirectorPanel>:null}

      {!data.resumen.eventos?<DirectorPanel className="p-10 text-center"><p className="text-lg font-black text-[#111711]">Todavía no hay rendimiento para analizar.</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#697468]">Crea eventos, registra resultados y completa métricas. Este panel se irá poblando automáticamente.</p></DirectorPanel>:null}
      {data.truncated?<p className="text-center text-[10px] font-semibold text-amber-700">La vista está limitada a los 500 registros más recientes para mantener una respuesta rápida.</p>:null}
    </>:null}
  </DirectorPage>;
}

function Mini({label,value}:{label:string;value:number}){return <div className="rounded-[14px] border border-[#dfe5dc] bg-[#f7f9f5] p-3 text-center"><p className="text-[9px] font-black uppercase text-[#758074]">{label}</p><p className="mt-1 text-xl font-black text-[#111711]">{value}</p></div>}

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_FIELD, DirectorPage } from '../components/director/DirectorModule';

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

  if(locked)return <DirectorPage className="evolution-board max-w-5xl"><section className="evolution-board-locked"><div><p>Evolution Board · Alto Rendimiento</p><h1>Analítica deportiva avanzada</h1><span>La captura de resultados sigue disponible desde Competencia. Este espacio compara temporada, carga competitiva, rendimiento individual y marcas PB/SB cuando el plan habilita analítica avanzada.</span></div><Link to="/suscripcion" className={DIRECTOR_BUTTON}>Revisar Alto Rendimiento</Link></section></DirectorPage>;

  return <DirectorPage className="evolution-board max-w-[1450px]">
    <section className="evolution-board-command" aria-labelledby="evolution-board-title">
      <div className="evolution-board-command-copy"><p className="evolution-board-kicker">Evolution Board · Alto Rendimiento</p><h1 id="evolution-board-title">Qué cambió en esta temporada</h1><p>Lee evolución, carga competitiva, resultados y marcas como señales para decidir. La analítica no domina por cantidad de números: prioriza cambios útiles para cuerpo técnico y dirección.</p></div>
      <Link to="/partidos" className={DIRECTOR_BUTTON_DARK}>← Eventos y rendimiento</Link>
    </section>

    <section className="evolution-board-filters" aria-label="Contexto de analítica">
      <select aria-label="Rama deportiva" value={branchId} onChange={event=>setBranchId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Todas las ramas</option>{branches.map(branch=><option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre?` · ${branch.sedes.nombre}`:''}</option>)}</select>
      <select aria-label="Categoría" value={categoryId} onChange={event=>setCategoryId(event.target.value)} className={DIRECTOR_FIELD}><option value="">Todas las categorías</option>{categoryOptions.map(category=><option key={category.id} value={category.id}>{category.nombre}</option>)}</select>
      <select aria-label="Temporada" value={season} onChange={event=>setSeason(event.target.value)} className={DIRECTOR_FIELD}><option value="">Toda la historia</option>{seasonOptions.map(year=><option key={year} value={year}>Temporada {year}</option>)}</select>
    </section>

    {loading?<div className="evolution-board-loading" role="status">Calculando evolución deportiva…</div>:data?<>
      <section className="evolution-board-pulse" aria-label="Pulso de la temporada">
        <div className="evolution-board-pulse-main"><small>Contexto analizado</small><strong>{data.resumen.eventos} eventos</strong><span>{data.resumen.disciplinas} disciplina{data.resumen.disciplinas===1?'':'s'} · {data.resumen.deportistas} deportistas</span></div>
        <div><small>Participaciones</small><strong>{data.resumen.participaciones}</strong><span>{formatNumber(data.resumen.minutos,1)} min acumulados</span></div>
        <div><small>PB vigentes</small><strong>{data.resumen.pb_vigentes}</strong><span>{data.resumen.sb_vigentes} mejores de temporada</span></div>
        <div><small>Destacados</small><strong>{data.resumen.destacados}</strong><span>registros MVP / destaque</span></div>
      </section>

      {data.disciplinas.map(discipline=>{
        const visibleTeamMetrics=discipline.metricas_equipo.filter(metric=>metric.samples&&metric.samples>0).slice(0,8);
        const headlineMetrics=discipline.profile.metrics.filter(metric=>metric.tier!=='advanced').slice(0,4);
        const disciplinePB=data.marcas.personal_bests.filter(mark=>mark.disciplina_codigo===discipline.profile.code).length;
        return <article key={discipline.profile.code} className="evolution-board-discipline">
          <header className="evolution-board-discipline-head"><div><p>{discipline.profile.icon} {discipline.profile.label}</p><h2>Radiografía competitiva</h2></div><div><span>{discipline.resumen.eventos} eventos</span><span>{discipline.resumen.deportistas} deportistas</span><span>{disciplinePB} PB</span></div></header>

          {discipline.profile.usesHeadToHeadScore?<div className="evolution-board-scoreline" aria-label="Balance de resultados"><span><small>Victorias</small><strong>{discipline.resumen.victorias}</strong></span><span><small>Empates</small><strong>{discipline.resumen.empates}</strong></span><span><small>Derrotas</small><strong>{discipline.resumen.derrotas}</strong></span><span><small>A favor</small><strong>{discipline.resumen.a_favor}</strong></span><span><small>En contra</small><strong>{discipline.resumen.en_contra}</strong></span></div>:<div className="evolution-board-scoreline" aria-label="Balance de participación"><span><small>Participaciones</small><strong>{discipline.resumen.participaciones}</strong></span><span><small>PB vigentes</small><strong>{disciplinePB}</strong></span><span><small>Destacados</small><strong>{discipline.resumen.destacados}</strong></span><span><small>Eventos</small><strong>{discipline.resumen.eventos}</strong></span><span><small>Deportistas</small><strong>{discipline.resumen.deportistas}</strong></span></div>}

          <div className="evolution-board-context-grid">
            <section><h3>Métricas colectivas con muestra</h3>{visibleTeamMetrics.length?<div className="evolution-board-metrics">{visibleTeamMetrics.map(metric=><div key={metric.code} className="evolution-board-metric"><small>{metric.label}</small><strong>{valueText(metric)}</strong><span>{metric.samples} eventos</span></div>)}</div>:<div className="evolution-board-empty mt-3 !p-5">Aún no hay métricas colectivas suficientes.</div>}</section>
            <section><h3>Season Timeline · últimos eventos</h3><div className="evolution-board-timeline">{discipline.tendencia.slice(-6).reverse().map(event=><div key={event.id} className="evolution-board-event"><div><strong>{event.evento}</strong><small>{event.fecha}{event.categoria?` · ${event.categoria}`:''}{event.competencia?` · ${event.competencia}`:''}</small></div>{event.resultado_favor!==null&&event.resultado_favor!==undefined?<span>{event.resultado_favor} — {event.resultado_contra}</span>:<span>Registrado</span>}</div>)}{!discipline.tendencia.length?<div className="evolution-board-empty !p-5">Sin eventos en este alcance.</div>:null}</div></section>
          </div>

          <section className="evolution-board-ranking"><h3>Rendimiento de deportistas</h3><div className="evolution-board-ranking-wrap"><table><thead><tr><th>Deportista</th><th>Eventos</th><th>Titular</th><th>Minutos</th><th>Destacado</th>{headlineMetrics.map(metric=><th key={metric.code}>{metric.label}</th>)}</tr></thead><tbody>{discipline.deportistas_ranking.slice(0,10).map(athlete=><tr key={athlete.jugador_id}><td>{athlete.nombre}</td><td>{athlete.participaciones}</td><td>{athlete.titularidades}</td><td>{formatNumber(athlete.minutos,1)}</td><td className="is-highlight">{athlete.mvp}</td>{headlineMetrics.map(metric=>{const value=athlete.metricas.find(item=>item.code===metric.code);return <td key={metric.code} className="is-highlight">{value?valueText(value):'—'}</td>;})}</tr>)}</tbody></table></div>{!discipline.deportistas_ranking.length?<div className="evolution-board-empty !p-5 mt-3">Aún no hay rendimiento individual registrado.</div>:null}</section>
        </article>;
      })}

      {data.marcas.mejoras_recientes.length?<section className="evolution-board-pb" aria-labelledby="evolution-pb-title"><header className="evolution-board-pb-head"><p>PB / SB · mejoras detectadas</p><h2 id="evolution-pb-title">Evolución de marcas</h2><span>Registros construidos automáticamente desde Eventos y Rendimiento.</span></header><div className="evolution-board-pb-list">{data.marcas.mejoras_recientes.slice(0,12).map((mark,index)=><article key={`${mark.jugador_id}-${mark.prueba_nombre}-${mark.fecha}-${index}`} className="evolution-board-pb-row"><strong>{mark.jugador_nombre}</strong><span>{mark.prueba_nombre} · {mark.metrica_label}{mark.valor_pb_anterior!==null&&mark.valor_pb_anterior!==undefined?` · PB anterior ${formatNumber(mark.valor_pb_anterior,3)}${mark.unidad?` ${mark.unidad}`:''}`:' · Primera marca'}</span><b>{formatNumber(mark.valor,3)}{mark.unidad?` ${mark.unidad}`:''}</b><time>{mark.fecha} · {mark.temporada}</time></article>)}</div></section>:null}

      {!data.resumen.eventos?<div className="evolution-board-empty"><strong>Todavía no hay rendimiento para analizar.</strong><span>Crea eventos, registra resultados y completa métricas. Evolution Board se poblará automáticamente.</span></div>:null}
      {data.truncated?<p className="text-center text-[10px] font-semibold text-amber-700">La vista está limitada a los 500 registros más recientes para mantener una respuesta rápida.</p>:null}
    </>:null}
  </DirectorPage>;
}

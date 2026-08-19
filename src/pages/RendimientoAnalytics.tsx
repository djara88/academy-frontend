import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch = { id: string; nombre: string; disciplina: string; sedes?: { id: string; nombre: string } | null };
type Category = { id: string; nombre: string; rama_id?: string | null };
type MetricValue = { code: string; label: string; value: number; unit?: string | null; decimals?: number; samples?: number };
type Athlete = { jugador_id: string; nombre: string; participaciones: number; titularidades: number; minutos: number; mvp: number; metricas: MetricValue[] };
type Discipline = {
  profile: { code: string; label: string; icon: string; usesHeadToHeadScore: boolean; metrics: Array<{ code: string; label: string; tier?: string }> };
  resumen: { eventos: number; deportistas: number; participaciones: number; minutos: number; destacados: number; victorias: number; empates: number; derrotas: number; a_favor: number; en_contra: number };
  metricas_equipo: MetricValue[];
  deportistas_ranking: Athlete[];
  tendencia: Array<{ id: string; fecha: string; evento: string; competencia?: string | null; categoria?: string | null; resultado_favor?: number | null; resultado_contra?: number | null }>;
};
type Mark = { jugador_id: string; jugador_nombre: string; disciplina_codigo: string; prueba_nombre: string; metrica_label: string; valor: number; unidad?: string | null; temporada: string; fecha: string; valor_pb_anterior?: number | null };
type Analytics = {
  resumen: { eventos: number; disciplinas: number; deportistas: number; participaciones: number; minutos: number; destacados: number; pb_vigentes: number; sb_vigentes: number };
  disciplinas: Discipline[];
  marcas: { personal_bests: Mark[]; season_bests: Mark[]; mejoras_recientes: Mark[] };
  truncated?: boolean;
};

const panel = 'rounded-[24px] border border-white/10 bg-[#151b25]';
const field = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#C8A96B]';
const formatNumber = (value: number, decimals = 0) => Number(value || 0).toLocaleString('es-CL', { maximumFractionDigits: decimals });
const valueText = (metric: MetricValue) => `${formatNumber(metric.value, metric.decimals || 0)}${metric.unit ? ` ${metric.unit}` : ''}`;

export default function RendimientoAnalytics() {
  const { notify } = useAppDialog();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branchId, setBranchId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [season, setSeason] = useState(String(new Date().getFullYear()));
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [locked, setLocked] = useState(false);

  const categoryOptions = useMemo(() => categories.filter((item) => !branchId || item.rama_id === branchId), [categories, branchId]);
  const seasonOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, index) => String(current - index));
  }, []);

  const loadCatalog = useCallback(async () => {
    try {
      const [primaryResponse, categoriesResponse] = await Promise.all([
        api.get('/api/academias/rama-principal'),
        api.get('/api/jugadores/categorias'),
      ]);
      setBranches(primaryResponse.data.data?.ramas || []);
      setCategories(categoriesResponse.data.data || []);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar los filtros deportivos.');
    }
  }, [notify]);

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setLocked(false);
    try {
      const response = await api.get('/api/rendimiento/analitica', {
        params: {
          ...(branchId ? { rama_id: branchId } : {}),
          ...(categoryId ? { categoria_id: categoryId } : {}),
          ...(season ? { temporada: season } : {}),
        },
      });
      setData(response.data.data || null);
    } catch (error: any) {
      if (error.response?.status === 403 && error.response?.data?.feature === 'analitica_avanzada') {
        setLocked(true);
        setData(null);
      } else {
        await notify(error.response?.data?.error || 'No fue posible cargar la analítica deportiva.');
      }
    } finally { setLoading(false); }
  }, [branchId, categoryId, season, notify]);

  useEffect(() => { void loadCatalog(); }, [loadCatalog]);
  useEffect(() => { void loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => { if (categoryId && !categoryOptions.some((item) => item.id === categoryId)) setCategoryId(''); }, [branchId, categoryId, categoryOptions]);

  if (locked) return <div className="mx-auto max-w-6xl space-y-6 pb-16"><section className="rounded-[30px] border border-[#C8A96B]/30 bg-[radial-gradient(circle_at_top_right,rgba(200,169,107,.18),transparent_40%),#151b25] p-8"><p className="text-xs font-black uppercase tracking-[.18em] text-[#D8BE87]">Alto Rendimiento</p><h1 className="mt-2 text-3xl font-black text-white">Analítica deportiva avanzada</h1><p className="mt-3 max-w-3xl text-sm leading-6 text-[#9aa6b5]">La captura de resultados y métricas está disponible desde Competencia. Este panel consolida tendencias, rankings, métricas colectivas y marcas PB/SB y forma parte de Alto Rendimiento.</p><a href="/suscripcion" className="mt-5 inline-flex rounded-xl bg-[#C8A96B] px-5 py-3 text-sm font-black text-[#15120c]">Revisar Alto Rendimiento</a></section></div>;

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[30px] border border-[#C8A96B]/25 bg-[radial-gradient(circle_at_top_right,rgba(200,169,107,.16),transparent_40%),#151b25] p-6 sm:p-7"><div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#D8BE87]">Alto Rendimiento</p><h1 className="mt-2 text-3xl font-black text-white">Analítica deportiva</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-[#8b949e]">Convierte cada Evento y Rendimiento en información útil para decisiones deportivas: participación, carga competitiva, resultados, métricas de equipo, desempeño individual y evolución de marcas.</p></div><a href="/partidos" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 px-5 text-sm font-black text-[#70e4df]">← Eventos y Rendimiento</a></div></section>

    <section className={`${panel} p-4`}><div className="grid gap-3 md:grid-cols-3"><select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={field}><option value="">Todas las ramas</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre ? ` · ${branch.sedes.nombre}` : ''}</option>)}</select><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={field}><option value="">Todas las categorías</option>{categoryOptions.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select><select value={season} onChange={(event) => setSeason(event.target.value)} className={field}><option value="">Toda la historia</option>{seasonOptions.map((year) => <option key={year} value={year}>Temporada {year}</option>)}</select></div></section>

    {loading ? <div className={`${panel} p-12 text-center text-[#8b949e]`}>Calculando analítica deportiva…</div> : data ? <>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Eventos', data.resumen.eventos, 'Partidos, duelos, pruebas y presentaciones'],
          ['Deportistas', data.resumen.deportistas, 'Con rendimiento registrado'],
          ['Participaciones', data.resumen.participaciones, `${formatNumber(data.resumen.minutos, 1)} min acumulados`],
          ['Destacados', data.resumen.destacados, 'Reconocimientos MVP/destacado'],
          ['PB vigentes', data.resumen.pb_vigentes, 'Mejores marcas personales'],
          ['SB vigentes', data.resumen.sb_vigentes, `Temporada ${season || 'histórica'}`],
          ['Disciplinas', data.resumen.disciplinas, 'Con datos competitivos'],
          ['Carga registrada', formatNumber(data.resumen.minutos, 1), 'Minutos en deportes colectivos'],
        ].map(([label, value, subtitle]) => <article key={String(label)} className={`${panel} p-4`}><p className="text-[10px] font-black uppercase tracking-[.12em] text-[#697586]">{label}</p><p className="mt-2 text-2xl font-black text-white">{value}</p><p className="mt-1 text-[11px] text-[#697586]">{subtitle}</p></article>)}
      </section>

      {data.disciplinas.map((discipline) => {
        const visibleTeamMetrics = discipline.metricas_equipo.filter((metric) => metric.samples && metric.samples > 0).slice(0, 8);
        const headlineMetrics = discipline.profile.metrics.filter((metric) => metric.tier !== 'advanced').slice(0, 4);
        const disciplinePB = data.marcas.personal_bests.filter((mark) => mark.disciplina_codigo === discipline.profile.code).length;
        return <section key={discipline.profile.code} className={`${panel} overflow-hidden`}>
          <div className="border-b border-white/10 p-5 sm:p-6"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#70e4df]">{discipline.profile.icon} {discipline.profile.label}</p><h2 className="mt-1 text-2xl font-black text-white">Radiografía competitiva</h2></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-white/5 px-3 py-1.5 text-xs font-black text-white">{discipline.resumen.eventos} eventos</span><span className="rounded-full bg-violet-500/10 px-3 py-1.5 text-xs font-black text-violet-300">{discipline.resumen.deportistas} deportistas</span></div></div>
            {discipline.profile.usesHeadToHeadScore ? <div className="mt-4 grid gap-2 grid-cols-3 sm:grid-cols-5"><div className="rounded-xl bg-emerald-500/10 p-3 text-center"><p className="text-[9px] uppercase text-emerald-400">Victorias</p><p className="text-xl font-black text-emerald-300">{discipline.resumen.victorias}</p></div><div className="rounded-xl bg-white/5 p-3 text-center"><p className="text-[9px] uppercase text-[#697586]">Empates</p><p className="text-xl font-black text-white">{discipline.resumen.empates}</p></div><div className="rounded-xl bg-red-500/10 p-3 text-center"><p className="text-[9px] uppercase text-red-400">Derrotas</p><p className="text-xl font-black text-red-300">{discipline.resumen.derrotas}</p></div><div className="rounded-xl bg-[#289E9D]/10 p-3 text-center"><p className="text-[9px] uppercase text-[#70e4df]">A favor</p><p className="text-xl font-black text-[#70e4df]">{discipline.resumen.a_favor}</p></div><div className="rounded-xl bg-[#C8A96B]/10 p-3 text-center"><p className="text-[9px] uppercase text-[#D8BE87]">En contra</p><p className="text-xl font-black text-[#D8BE87]">{discipline.resumen.en_contra}</p></div></div> : <div className="mt-4 grid gap-2 sm:grid-cols-3"><div className="rounded-xl bg-violet-500/10 p-3"><p className="text-[9px] uppercase text-violet-300">Participaciones</p><p className="text-xl font-black text-white">{discipline.resumen.participaciones}</p></div><div className="rounded-xl bg-[#C8A96B]/10 p-3"><p className="text-[9px] uppercase text-[#D8BE87]">PB vigentes</p><p className="text-xl font-black text-white">{disciplinePB}</p></div><div className="rounded-xl bg-[#289E9D]/10 p-3"><p className="text-[9px] uppercase text-[#70e4df]">Destacados</p><p className="text-xl font-black text-white">{discipline.resumen.destacados}</p></div></div>}
          </div>

          <div className="grid gap-5 p-5 xl:grid-cols-2">
            <div><h3 className="text-sm font-black text-white">Métricas colectivas promedio</h3>{visibleTeamMetrics.length ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{visibleTeamMetrics.map((metric) => <div key={metric.code} className="rounded-xl border border-sky-400/10 bg-sky-500/5 p-3"><p className="text-[9px] uppercase text-[#697586]">{metric.label}</p><p className="mt-1 text-lg font-black text-sky-300">{valueText(metric)}</p><p className="text-[9px] text-[#4f5b69]">{metric.samples} eventos</p></div>)}</div> : <p className="mt-3 rounded-xl border border-dashed border-white/10 p-5 text-xs text-[#697586]">Aún no hay métricas colectivas suficientes. Se irán poblando al registrar nuevos resultados.</p>}</div>
            <div><h3 className="text-sm font-black text-white">Últimos eventos</h3><div className="mt-3 space-y-2">{discipline.tendencia.slice(-6).reverse().map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#0d1117] px-3 py-2"><div className="min-w-0"><p className="truncate text-xs font-black text-white">{event.evento}</p><p className="text-[10px] text-[#697586]">{event.fecha}{event.categoria ? ` · ${event.categoria}` : ''}</p></div>{event.resultado_favor !== null && event.resultado_favor !== undefined ? <span className="shrink-0 rounded-lg bg-white/5 px-2 py-1 text-xs font-black text-white">{event.resultado_favor} — {event.resultado_contra}</span> : <span className="text-[10px] font-bold text-violet-300">Registrado</span>}</div>)}</div></div>
          </div>

          <div className="border-t border-white/10 p-5"><h3 className="text-sm font-black text-white">Rendimiento de deportistas</h3><div className="mt-3 overflow-x-auto"><table className="min-w-full text-left text-xs"><thead><tr className="border-b border-white/10 text-[9px] uppercase tracking-[.1em] text-[#697586]"><th className="px-3 py-2">Deportista</th><th className="px-3 py-2">Eventos</th><th className="px-3 py-2">Titular</th><th className="px-3 py-2">Minutos</th><th className="px-3 py-2">Destacado</th>{headlineMetrics.map((metric) => <th key={metric.code} className="px-3 py-2">{metric.label}</th>)}</tr></thead><tbody>{discipline.deportistas_ranking.slice(0, 10).map((athlete) => <tr key={athlete.jugador_id} className="border-b border-white/5"><td className="px-3 py-3 font-black text-white">{athlete.nombre}</td><td className="px-3 py-3 text-[#b6c0cc]">{athlete.participaciones}</td><td className="px-3 py-3 text-[#b6c0cc]">{athlete.titularidades}</td><td className="px-3 py-3 text-[#b6c0cc]">{formatNumber(athlete.minutos, 1)}</td><td className="px-3 py-3 text-[#D8BE87]">{athlete.mvp}</td>{headlineMetrics.map((metric) => { const value = athlete.metricas.find((item) => item.code === metric.code); return <td key={metric.code} className="px-3 py-3 font-bold text-[#70e4df]">{value ? valueText(value) : '—'}</td>; })}</tr>)}</tbody></table></div>{!discipline.deportistas_ranking.length ? <p className="mt-4 text-xs text-[#697586]">Aún no hay rendimiento individual registrado.</p> : null}</div>
        </section>;
      })}

      {data.marcas.mejoras_recientes.length ? <section className={`${panel} p-5 sm:p-6`}><div><p className="text-xs font-black uppercase tracking-[.14em] text-[#D8BE87]">PB / SB</p><h2 className="mt-1 text-xl font-black text-white">Evolución de marcas</h2><p className="mt-1 text-xs text-[#8b949e]">Mejoras detectadas automáticamente desde Eventos y Rendimiento.</p></div><div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{data.marcas.mejoras_recientes.slice(0, 12).map((mark, index) => <article key={`${mark.jugador_id}-${mark.prueba_nombre}-${mark.fecha}-${index}`} className="rounded-2xl border border-[#C8A96B]/20 bg-[#C8A96B]/5 p-4"><p className="text-sm font-black text-white">🏆 {mark.jugador_nombre}</p><p className="mt-1 text-xs font-bold text-[#D8BE87]">{mark.prueba_nombre} · {mark.metrica_label}</p><p className="mt-3 text-2xl font-black text-white">{formatNumber(mark.valor, 3)}{mark.unidad ? ` ${mark.unidad}` : ''}</p>{mark.valor_pb_anterior !== null && mark.valor_pb_anterior !== undefined ? <p className="mt-1 text-[10px] text-[#8b949e]">PB anterior: {formatNumber(mark.valor_pb_anterior, 3)}{mark.unidad ? ` ${mark.unidad}` : ''}</p> : <p className="mt-1 text-[10px] text-emerald-300">Primera marca registrada</p>}<p className="mt-2 text-[10px] text-[#697586]">{mark.fecha} · Temporada {mark.temporada}</p></article>)}</div></section> : null}

      {!data.resumen.eventos ? <section className={`${panel} p-10 text-center`}><p className="text-lg font-black text-white">Todavía no hay rendimiento para analizar.</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#697586]">Crea eventos, registra resultados y completa métricas. Este panel se irá poblando automáticamente sin volver a ingresar los datos.</p></section> : null}
      {data.truncated ? <p className="text-center text-[10px] text-amber-300">La vista está limitada a los 500 registros más recientes para mantener una respuesta rápida.</p> : null}
    </> : null}
  </div>;
}
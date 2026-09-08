import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import MatchPreparationPanel from './MatchPreparationPanel';
import TrainingLogPanel from './TrainingLogPanel';
import type { ProfessorAgendaEvent } from './types';

type Mode = 'entrenamientos' | 'partidos';
type TrainingView = 'proximos' | 'pendientes' | 'historial';
type Props = {
  mode: Mode;
  academyName?: string;
  onLiveMatch?: (matchId: string) => void;
  onAttendance?: (categoryId: string, date: string) => void;
};

const formatDate = (date: string) => new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`));
const todayChile = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const ProfessorAgendaPanel = ({ mode, academyName, onLiveMatch, onAttendance }: Props) => {
  const [events, setEvents] = useState<ProfessorAgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
  const [trainingView, setTrainingView] = useState<TrainingView>('proximos');
  const today = todayChile();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get('/api/profesores/me/agenda');
      setEvents(Array.isArray(response.data?.data) ? response.data.data : []);
      setVerified(true);
    } catch (error: any) {
      setVerified(false);
      setLoadError(error.response?.data?.error || 'No fue posible verificar tus actividades.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (mode === 'entrenamientos') setTrainingView('proximos'); }, [mode]);

  const trainings = useMemo(() => events.filter((event) => event.tipo === 'Entrenamiento'), [events]);
  const matches = useMemo(() => events.filter((event) => event.tipo === 'Partido'), [events]);

  const trainingCounts = useMemo(() => ({
    proximos: trainings.filter((event) => event.fecha >= today && event.estado !== 'Cancelado').length,
    pendientes: trainings.filter((event) => event.fecha <= today && !event.bitacora_completa && event.estado !== 'Cancelado').length,
    historial: trainings.filter((event) => event.fecha < today || event.estado === 'Realizado' || event.bitacora_completa).length,
  }), [today, trainings]);

  const visibleEvents = useMemo(() => {
    if (mode === 'partidos') return matches;
    if (trainingView === 'pendientes') return trainings.filter((event) => event.fecha <= today && !event.bitacora_completa && event.estado !== 'Cancelado');
    if (trainingView === 'historial') return trainings.filter((event) => event.fecha < today || event.estado === 'Realizado' || event.bitacora_completa).sort((a, b) => `${b.fecha} ${b.hora || ''}`.localeCompare(`${a.fecha} ${a.hora || ''}`));
    return trainings.filter((event) => event.fecha >= today && event.estado !== 'Cancelado');
  }, [matches, mode, today, trainingView, trainings]);

  if (selectedTrainingId) return <TrainingLogPanel trainingId={selectedTrainingId} academyName={academyName} onBack={() => setSelectedTrainingId(null)} onSaved={() => void load()} />;
  if (selectedMatchId) return <MatchPreparationPanel matchId={selectedMatchId} academyName={academyName} onBack={() => setSelectedMatchId(null)} onSaved={() => void load()} />;
  if (loading && !events.length) return <div className="card p-8 text-center text-[#8b949e]">Verificando actividades...</div>;

  const title = mode === 'entrenamientos' ? 'Entrenamientos' : 'Encuentros';
  const empty = mode === 'partidos'
    ? 'No hay encuentros próximos en tus categorías.'
    : trainingView === 'pendientes'
      ? 'No tienes bitácoras pendientes.'
      : trainingView === 'historial'
        ? 'Todavía no hay entrenamientos en el historial.'
        : 'No hay entrenamientos programados próximos.';

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-2xl font-black">{title}</h2>
        <p className="mt-1 text-sm text-[#8b949e]">{mode === 'entrenamientos' ? 'Planifica tu operación: próximos entrenamientos, bitácoras que debes cerrar e historial real de tus categorías.' : 'Encuentros de las categorías que tienes asignadas y sus acciones disponibles.'}</p>
      </div>

      {loadError ? <div role="status" className="rounded-2xl border border-orange-500/35 bg-orange-500/10 p-4"><p className="text-sm font-black text-orange-200">Agenda no verificada</p><p className="mt-1 text-sm leading-6 text-[#b1bac4]">{loadError} {events.length ? 'Las actividades visibles corresponden a la última carga disponible y pueden estar desactualizadas.' : 'No mostraremos una agenda vacía como si significara que no existen actividades.'}</p><button type="button" onClick={() => void load()} disabled={loading} className="mt-3 min-h-11 rounded-xl border border-orange-400/40 px-4 text-sm font-black text-orange-200 disabled:opacity-50">{loading ? 'Verificando…' : 'Reintentar'}</button></div> : null}

      {loading && events.length ? <div role="status" className="rounded-xl border border-[#30363d] bg-[#161b22] px-4 py-3 text-xs font-bold text-[#8b949e]">Actualizando la agenda sin ocultar la última carga disponible…</div> : null}

      {mode === 'entrenamientos' ? (
        <nav aria-label="Vistas de entrenamientos" className="grid grid-cols-3 gap-2 rounded-2xl border border-[#30363d] bg-[#161b22] p-2">
          {([
            ['proximos', `Próximos · ${trainingCounts.proximos}`],
            ['pendientes', `Bitácoras · ${trainingCounts.pendientes}`],
            ['historial', `Historial · ${trainingCounts.historial}`],
          ] as [TrainingView, string][]).map(([view, label]) => (
            <button key={view} type="button" onClick={() => setTrainingView(view)} aria-current={trainingView === view ? 'page' : undefined} className={`min-h-10 rounded-xl px-2 text-xs font-black sm:text-sm ${trainingView === view ? 'bg-[#289E9D] text-white' : 'text-[#8b949e] hover:bg-[#21262d] hover:text-white'}`}>{label}</button>
          ))}
        </nav>
      ) : null}

      {verified && !visibleEvents.length ? <div className="card border-dashed p-8 text-center text-[#8b949e]">{empty}</div> : null}
      <div className="space-y-3">
        {visibleEvents.map((event) => {
          const isTraining = event.tipo === 'Entrenamiento';
          const isToday = event.fecha === today;
          const canOperateMatch = !isTraining && event.estado !== 'Jugado' && event.estado !== 'Cancelado';
          return (
            <article key={`${event.tipo}-${event.id}`} className={`card border-l-4 p-4 ${event.en_vivo ? 'border-l-red-500 bg-red-500/[.04]' : isTraining ? 'border-l-[#289E9D]' : 'border-l-violet-400'}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-black ${isTraining ? 'bg-[#289E9D]/15 text-[#70e4df]' : 'bg-violet-500/15 text-violet-300'}`}>{event.tipo}</span>
                    {event.ramas?.disciplina ? <span className="rounded-full bg-[#21262d] px-2.5 py-1 text-xs font-bold text-[#8b949e]">{event.ramas.disciplina}</span> : null}
                    {isTraining && event.bitacora_completa ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">Bitácora lista</span> : null}
                    {isTraining && !event.bitacora_completa && event.fecha <= today && event.estado !== 'Cancelado' ? <span className="rounded-full bg-amber-500/15 px-2.5 py-1 text-xs font-bold text-amber-300">Bitácora pendiente</span> : null}
                    {!isTraining && event.preparacion_estado ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${event.preparacion_estado === 'Lista' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-yellow-500/15 text-yellow-300'}`}>{event.preparacion_estado}</span> : null}
                    {event.en_vivo ? <span className="rounded-full bg-red-500/20 px-2.5 py-1 text-xs font-black text-red-300">● EN VIVO</span> : null}
                  </div>
                  <h3 className="mt-2 truncate text-lg font-black">{isTraining ? event.categorias?.nombre || 'Entrenamiento' : `${event.categorias?.nombre || 'Categoría'} vs. ${event.rival}`}</h3>
                  <p className="mt-1 text-sm text-[#b1bac4]">{formatDate(event.fecha)} · {event.hora?.slice(0, 5) || 'Sin hora'} · {isTraining ? event.lugar || event.sedes?.nombre || 'Lugar por confirmar' : event.ubicacion || event.sedes?.nombre || 'Lugar por confirmar'}</p>
                  {!isTraining && event.en_vivo && event.sport_profile?.usesHeadToHeadScore ? <p className="mt-2 text-2xl font-black text-white">{Number(event.goles_favor) || 0} <span className="text-[#697586]">–</span> {Number(event.goles_contra) || 0} <span className="text-xs text-[#8b949e]">{event.sport_profile.scoreLabel}{event.live_etapa ? ` · ${event.live_etapa}` : ''}</span></p> : null}
                </div>
                <div className="grid shrink-0 gap-2 sm:grid-cols-2 lg:min-w-[310px]">
                  {isTraining ? <>
                    {isToday && onAttendance ? <button type="button" onClick={() => onAttendance(event.categoria_id, event.fecha)} className="min-h-11 rounded-xl bg-[#289E9D] px-4 py-2 text-sm font-black text-white">Pasar lista</button> : null}
                    <button type="button" onClick={() => setSelectedTrainingId(event.id)} className="min-h-11 rounded-xl border border-[#289E9D]/50 px-4 py-2 text-sm font-black text-[#70e4df] hover:bg-[#289E9D]/10">{event.bitacora_completa ? 'Editar bitácora' : event.fecha <= today ? 'Completar bitácora' : 'Preparar bitácora'}</button>
                  </> : <>
                    {canOperateMatch ? <button type="button" onClick={() => setSelectedMatchId(event.id)} className="min-h-11 rounded-xl border border-violet-400/35 bg-violet-500/10 px-4 py-2 text-sm font-black text-violet-200">{event.preparacion_estado ? 'Editar preparación' : 'Preparar encuentro'}</button> : null}
                    {(event.en_vivo || (isToday && canOperateMatch)) && onLiveMatch ? <button type="button" onClick={() => onLiveMatch(event.id)} className={`min-h-11 rounded-xl px-4 py-2 text-sm font-black text-white ${event.en_vivo ? 'bg-red-600' : 'bg-[#289E9D]'}`}>{event.en_vivo ? 'Continuar en vivo' : 'Abrir en vivo'}</button> : null}
                  </>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ProfessorAgendaPanel;

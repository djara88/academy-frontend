import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { useAppDialog } from '../../contexts/DialogContext';
import MatchPreparationPanel from './MatchPreparationPanel';
import TrainingLogPanel from './TrainingLogPanel';
import type { ProfessorAgendaEvent } from './types';

type Mode = 'agenda' | 'bitacoras' | 'partidos';

const formatDate = (date: string) => new Intl.DateTimeFormat('es-CL', { weekday: 'short', day: '2-digit', month: 'short' }).format(new Date(`${date}T12:00:00`));

const ProfessorAgendaPanel = ({ mode, academyName }: { mode: Mode; academyName?: string }) => {
  const { notify } = useAppDialog();
  const [events, setEvents] = useState<ProfessorAgendaEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string | null>(null);
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/profesores/me/agenda');
      setEvents(response.data.data || []);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar tu agenda.', { title: academyName });
    } finally {
      setLoading(false);
    }
  }, [academyName, notify]);

  useEffect(() => { void load(); }, [load]);

  const visibleEvents = useMemo(() => events.filter((event) => (
    mode === 'agenda' || (mode === 'bitacoras' && event.tipo === 'Entrenamiento') || (mode === 'partidos' && event.tipo === 'Partido')
  )), [events, mode]);

  if (selectedTrainingId) return <TrainingLogPanel trainingId={selectedTrainingId} academyName={academyName} onBack={() => setSelectedTrainingId(null)} onSaved={() => void load()} />;
  if (selectedMatchId) return <MatchPreparationPanel matchId={selectedMatchId} academyName={academyName} onBack={() => setSelectedMatchId(null)} onSaved={() => void load()} />;
  if (loading) return <div className="card p-8 text-center text-[#8b949e]">Cargando agenda...</div>;

  const title = mode === 'agenda' ? 'Mi agenda' : mode === 'bitacoras' ? 'Bitácoras de entrenamiento' : 'Próximos partidos';
  const empty = mode === 'agenda' ? 'No hay actividades programadas para los próximos 60 días.' : mode === 'bitacoras' ? 'No hay entrenamientos programados para completar.' : 'No hay partidos próximos en tus categorías.';

  return (
    <section className="space-y-4">
      <div><h2 className="text-2xl font-black">{title}</h2><p className="mt-1 text-sm text-[#8b949e]">Solo actividades de las categorías que tienes asignadas.</p></div>
      {!visibleEvents.length ? <div className="card border-dashed p-8 text-center text-[#8b949e]">{empty}</div> : null}
      <div className="space-y-3">
        {visibleEvents.map((event) => {
          const isTraining = event.tipo === 'Entrenamiento';
          return (
            <article key={`${event.tipo}-${event.id}`} className={`card border-l-4 p-4 ${isTraining ? 'border-l-[#289E9D]' : 'border-l-orange-400'}`}>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-xs font-black ${isTraining ? 'bg-[#289E9D]/15 text-[#70e4df]' : 'bg-orange-500/15 text-orange-300'}`}>{event.tipo}</span>{isTraining && event.bitacora_completa ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-bold text-emerald-300">Bitácora lista</span> : null}{!isTraining && event.preparacion_estado ? <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${event.preparacion_estado === 'Lista' ? 'bg-emerald-500/15 text-emerald-300' : 'bg-yellow-500/15 text-yellow-300'}`}>{event.preparacion_estado}</span> : null}</div>
                  <h3 className="mt-2 truncate text-lg font-black">{isTraining ? event.categorias?.nombre || 'Entrenamiento' : `${event.categorias?.nombre || 'Categoría'} vs. ${event.rival}`}</h3>
                  <p className="mt-1 text-sm text-[#b1bac4]">{formatDate(event.fecha)} · {event.hora?.slice(0, 5) || 'Sin hora'} · {isTraining ? event.lugar || 'Lugar por confirmar' : event.ubicacion || 'Lugar por confirmar'}</p>
                </div>
                <button type="button" onClick={() => isTraining ? setSelectedTrainingId(event.id) : setSelectedMatchId(event.id)} className="min-h-11 shrink-0 rounded-xl border border-[#289E9D]/50 px-4 py-2 text-sm font-black text-[#70e4df] hover:bg-[#289E9D]/10">{isTraining ? event.bitacora_completa ? 'Editar bitácora' : 'Completar bitácora' : event.preparacion_estado ? 'Editar preparación' : 'Preparar partido'}</button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default ProfessorAgendaPanel;

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CalendarDaysIcon,
  CheckCircleIcon,
  ClipboardDocumentCheckIcon,
  ExclamationTriangleIcon,
  PlayCircleIcon,
  TrophyIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axiosConfig';
import type { ProfessorAgendaEvent, ProfessorCase } from './types';

type Props = {
  academyName?: string;
  onAttendance: (categoryId: string, date: string) => void;
  onTrainingLog: (trainingId: string) => void;
  onMatchPreparation: (matchId: string) => void;
  onLiveMatch: (matchId: string) => void;
  onCases: () => void;
};

const todayChile = () => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(new Date());

const addDays = (date: string, days: number) => {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
};

const dayLabel = (date: string) => {
  if (date === todayChile()) return 'Hoy';
  return new Date(`${date}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: 'short' });
};

const timeLabel = (value?: string | null) => String(value || '').slice(0, 5) || 'Hora por confirmar';

export default function ProfessorTodayPanel({
  academyName,
  onAttendance,
  onTrainingLog,
  onMatchPreparation,
  onLiveMatch,
  onCases,
}: Props) {
  const [events, setEvents] = useState<ProfessorAgendaEvent[]>([]);
  const [cases, setCases] = useState<ProfessorCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const today = todayChile();

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [agendaResponse, casesResponse] = await Promise.all([
        api.get('/api/profesores/me/agenda', { params: { desde: today, hasta: addDays(today, 7) } }),
        api.get('/api/profesores/me/casos'),
      ]);
      setEvents((agendaResponse.data.data || []) as ProfessorAgendaEvent[]);
      setCases((casesResponse.data.data || []) as ProfessorCase[]);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'No fue posible preparar tu jornada.');
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { void load(); }, [load]);

  const todayEvents = useMemo(() => events.filter((event) => event.fecha === today), [events, today]);
  const nextEvents = useMemo(() => events.filter((event) => event.fecha > today).slice(0, 4), [events, today]);
  const openCases = useMemo(() => cases.filter((item) => item.estado !== 'resuelto'), [cases]);
  const urgentCases = useMemo(() => openCases.filter((item) => item.prioridad === 'urgente' || item.prioridad === 'alta'), [openCases]);
  const liveMatches = useMemo(() => todayEvents.filter((event) => event.tipo === 'Partido' && event.en_vivo), [todayEvents]);

  const eventCard = (event: ProfessorAgendaEvent, compact = false) => {
    const isTraining = event.tipo === 'Entrenamiento';
    const discipline = event.ramas?.disciplina || event.ramas?.nombre || 'Deporte';
    const title = isTraining ? `Entrenamiento · ${event.categorias?.nombre || 'Categoría'}` : `${event.sport_profile?.icon || '🏅'} ${event.rival || 'Encuentro'}`;
    return (
      <article key={`${event.tipo}-${event.id}`} className={`rounded-2xl border p-4 ${event.en_vivo ? 'border-red-400/40 bg-red-500/10' : 'border-[#30363d] bg-[#0d1117]'}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.14em] text-[#8b949e]">
              <span>{dayLabel(event.fecha)}</span><span>·</span><span>{timeLabel(event.hora)}</span><span>·</span><span>{discipline}</span>
              {event.en_vivo ? <span className="rounded-full bg-red-500/20 px-2 py-1 text-red-300">● EN VIVO</span> : null}
            </div>
            <h3 className="mt-2 text-base font-black text-white">{title}</h3>
            <p className="mt-1 text-xs text-[#8b949e]">{event.categorias?.nombre || ''}{event.sedes?.nombre ? ` · ${event.sedes.nombre}` : ''}{isTraining && event.lugar ? ` · ${event.lugar}` : ''}</p>
            {!isTraining && event.en_vivo && event.sport_profile?.usesHeadToHeadScore ? (
              <p className="mt-2 text-2xl font-black text-white">{Number(event.goles_favor) || 0} <span className="text-[#697586]">–</span> {Number(event.goles_contra) || 0} <span className="text-xs text-[#8b949e]">{event.sport_profile.scoreLabel}</span></p>
            ) : null}
          </div>
          <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${isTraining ? 'bg-[#289E9D]/15 text-[#70e4df]' : 'bg-violet-500/15 text-violet-300'}`}>{event.estado || (isTraining ? 'Programado' : 'Programado')}</span>
        </div>
        {!compact ? (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {isTraining ? (
              <>
                <button type="button" onClick={() => onAttendance(event.categoria_id, event.fecha)} className="min-h-11 rounded-xl bg-[#289E9D] px-3 text-sm font-black text-white"><CheckCircleIcon className="mr-1 inline h-5 w-5"/>Pasar lista</button>
                <button type="button" onClick={() => onTrainingLog(event.id)} className="min-h-11 rounded-xl border border-[#30363d] bg-[#161b22] px-3 text-sm font-black text-[#d0d7de]"><ClipboardDocumentCheckIcon className="mr-1 inline h-5 w-5"/>{event.bitacora_completa ? 'Ver bitácora' : 'Completar bitácora'}</button>
              </>
            ) : event.en_vivo ? (
              <button type="button" onClick={() => onLiveMatch(event.id)} className="min-h-12 rounded-xl bg-red-600 px-4 text-sm font-black text-white sm:col-span-2"><PlayCircleIcon className="mr-1 inline h-5 w-5"/>Continuar encuentro en vivo</button>
            ) : (
              <>
                {event.fecha === today && event.estado !== 'Jugado' && event.estado !== 'Cancelado' ? <button type="button" onClick={() => onLiveMatch(event.id)} className="min-h-11 rounded-xl bg-red-600 px-3 text-sm font-black text-white"><PlayCircleIcon className="mr-1 inline h-5 w-5"/>Abrir en vivo</button> : null}
                {event.estado !== 'Jugado' && event.estado !== 'Cancelado' ? <button type="button" onClick={() => onMatchPreparation(event.id)} className="min-h-11 rounded-xl border border-violet-400/30 bg-violet-500/10 px-3 text-sm font-black text-violet-200"><TrophyIcon className="mr-1 inline h-5 w-5"/>{event.preparacion_estado === 'Lista' ? 'Revisar preparación' : 'Preparar encuentro'}</button> : null}
              </>
            )}
          </div>
        ) : null}
      </article>
    );
  };

  if (loading) return <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-10 text-center text-sm font-bold text-[#8b949e]">Preparando la jornada...</div>;

  return (
    <div className="space-y-5">
      {error ? <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm font-bold text-red-200">{error}<button type="button" onClick={() => void load()} className="ml-3 underline">Reintentar</button></div> : null}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-[#289E9D]/25 bg-[#289E9D]/10 p-4"><CalendarDaysIcon className="h-6 w-6 text-[#70e4df]"/><p className="mt-3 text-2xl font-black text-white">{todayEvents.length}</p><p className="text-xs text-[#8b949e]">Actividades hoy</p></div>
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4"><CheckCircleIcon className="h-6 w-6 text-emerald-300"/><p className="mt-3 text-2xl font-black text-white">{todayEvents.filter((event) => event.tipo === 'Entrenamiento').length}</p><p className="text-xs text-[#8b949e]">Entrenamientos</p></div>
        <div className={`rounded-2xl border p-4 ${liveMatches.length ? 'border-red-400/40 bg-red-500/10' : 'border-violet-500/25 bg-violet-500/10'}`}><PlayCircleIcon className={`h-6 w-6 ${liveMatches.length ? 'text-red-300' : 'text-violet-300'}`}/><p className="mt-3 text-2xl font-black text-white">{todayEvents.filter((event) => event.tipo === 'Partido').length}</p><p className="text-xs text-[#8b949e]">Encuentros {liveMatches.length ? `· ${liveMatches.length} en vivo` : ''}</p></div>
        <button type="button" onClick={onCases} className={`rounded-2xl border p-4 text-left ${urgentCases.length ? 'border-orange-400/40 bg-orange-500/10' : 'border-[#30363d] bg-[#161b22]'}`}><ExclamationTriangleIcon className={`h-6 w-6 ${urgentCases.length ? 'text-orange-300' : 'text-[#8b949e]'}`}/><p className="mt-3 text-2xl font-black text-white">{openCases.length}</p><p className="text-xs text-[#8b949e]">Casos abiertos {urgentCases.length ? `· ${urgentCases.length} prioritarios` : ''}</p></button>
      </section>

      <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#48d8d0]">Tu jornada</p><h2 className="mt-1 text-xl font-black text-white">{todayEvents.length ? 'Lo que tienes hoy' : 'Hoy no tienes actividades programadas'}</h2></div><span className="text-xs font-bold text-[#697586]">{academyName || 'Lestra'}</span></div>
        <div className="mt-4 space-y-3">{todayEvents.length ? todayEvents.map((event) => eventCard(event)) : <div className="rounded-2xl border border-dashed border-[#30363d] p-7 text-center text-sm text-[#8b949e]">Puedes usar el día para revisar próximos encuentros, bitácoras pendientes o casos con dirección.</div>}</div>
      </section>

      {nextEvents.length ? <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-4 sm:p-5"><div className="flex items-center gap-2"><CalendarDaysIcon className="h-5 w-5 text-violet-300"/><h2 className="font-black text-white">Próximos 7 días</h2></div><div className="mt-4 grid gap-3 lg:grid-cols-2">{nextEvents.map((event) => eventCard(event, true))}</div></section> : null}
    </div>
  );
}

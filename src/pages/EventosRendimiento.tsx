import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch = { id: string; nombre: string; disciplina: string; sede_id: string; sedes?: { id: string; nombre: string } | null };
type Category = { id: string; nombre: string; rama_id?: string | null; sede_id?: string | null };
type Tournament = { id: string; nombre: string; rama_id?: string | null; ramas?: { id: string; nombre: string; disciplina: string } | null };
type Metric = { code: string; label: string; tier?: 'basic' | 'advanced'; unit?: string | null; decimals?: number; record?: { compare: string; unit?: string | null } | null };
type EventUi = { conditionMode: 'required' | 'optional' | 'hidden'; equipmentMode: 'uniform' | 'freeform'; equipmentLabel: string; equipmentPlaceholder?: string | null };
type SportProfile = {
  code: string;
  label: string;
  icon: string;
  activityLabel: string;
  opponentLabel: string;
  scoreLabel: string;
  usesHeadToHeadScore: boolean;
  eventUi?: EventUi;
  metrics: Metric[];
  teamMetrics?: Metric[];
  supportsTeamMetrics?: boolean;
  supportsPersonalRecords?: boolean;
};
type Match = {
  id: string;
  torneo_id?: string | null;
  categoria_id: string;
  rama_id?: string | null;
  sede_id?: string | null;
  disciplina_codigo?: string | null;
  es_amistoso: boolean;
  rival: string;
  fecha: string;
  hora: string;
  hora_citacion?: string | null;
  ubicacion?: string | null;
  link_maps?: string | null;
  color_uniforme?: string | null;
  condicion?: string | null;
  cobra_arbitraje: boolean;
  monto_arbitraje_jugador: number;
  estado: string;
  goles_favor?: number;
  goles_contra?: number;
  temporada?: string | null;
  prueba_nombre?: string | null;
  torneos?: { id?: string; nombre: string } | null;
  categorias?: { id?: string; nombre: string } | null;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
  sedes?: { id: string; nombre: string } | null;
  sport_profile: SportProfile;
};
type RecordRow = {
  metrica_codigo?: string;
  metrica_label: string;
  valor: number;
  unidad?: string | null;
  temporada: string;
  fecha: string;
};
type PlayerStat = {
  jugador_id: string;
  nombre: string;
  foto_base64?: string | null;
  metricas_competitivas: Record<string, number | undefined>;
  participo: boolean;
  titular: boolean;
  minutos: number;
  rol: string;
  observaciones: string;
  es_mvp: boolean;
  records?: { pb: RecordRow[]; sb: RecordRow[] };
};

type TimeValueProps = {
  value?: number;
  disabled?: boolean;
  onChange: (value: number | undefined) => void;
};

type TimeSelectProps = {
  label: string;
  helper: string;
  value: string;
  onChange: (value: string) => void;
};

const panel = 'rounded-[24px] border border-white/10 bg-[#151b25]';
const field = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';
const smallField = 'w-full rounded-lg border border-[#30363d] bg-[#0d1117] px-2 py-2 text-center text-sm font-black text-white outline-none focus:border-[#289E9D]';
const TEAM_CODES = new Set(['futbol', 'futsal', 'basquetbol', 'voleibol', 'hockey', 'rugby']);
const FIELD_EVENT_PATTERN = /(salto|lanzamiento|peso|disco|jabalina|martillo|altura|longitud|garrocha|triple)/i;
const defaultEventUi: EventUi = { conditionMode: 'optional', equipmentMode: 'freeform', equipmentLabel: 'Indumentaria / equipamiento', equipmentPlaceholder: 'Equipamiento requerido' };
const legacyUniformValues = new Set(['Principal', 'Titular', 'Visita', 'Ambas', 'Ambas (Llevar ambos)', 'Indumentaria principal']);
const blankForm = {
  rama_id: '', categoria_id: '', torneo_id: '', es_amistoso: false, rival: '', fecha: '', hora: '12:00', hora_citacion: '11:00',
  ubicacion: '', link_maps: '', color_uniforme: 'Titular', condicion: 'Local', cobra_arbitraje: false, monto_arbitraje_jugador: '0',
};
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const BASE_MINUTE_OPTIONS = Array.from({ length: 12 }, (_, index) => String(index * 5).padStart(2, '0'));

const numberStep = (metric: Metric) => metric.decimals ? String(1 / (10 ** metric.decimals)) : '1';
const normalizeTime = (value: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : '00:00';
const splitTime = (value: string) => normalizeTime(value).split(':');
const replaceTimePart = (value: string, part: 'hour' | 'minute', next: string) => {
  const [hour, minute] = splitTime(value);
  return part === 'hour' ? `${next}:${minute}` : `${hour}:${next}`;
};
const subtractMinutes = (value: string, amount: number) => {
  const [hour, minute] = splitTime(value).map(Number);
  const total = (hour * 60 + minute - amount + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};
const leadMinutes = (eventTime: string, callTime: string) => {
  const [eh, em] = splitTime(eventTime).map(Number);
  const [ch, cm] = splitTime(callTime).map(Number);
  return eh * 60 + em - (ch * 60 + cm);
};
const isAthleticsFieldEvent = (testName?: string) => FIELD_EVENT_PATTERN.test(String(testName || ''));
const isTimedMetric = (profile: SportProfile, metric: Metric, testName?: string) => {
  if (profile.code === 'natacion' && metric.code === 'tiempo_segundos') return true;
  if (profile.code === 'atletismo' && metric.code === 'marca') return !isAthleticsFieldEvent(testName);
  return metric.unit === 's' && Boolean(metric.record) && metric.record?.compare === 'min';
};
const isOptionalPointsMetric = (profile: SportProfile, metric: Metric) => ['atletismo', 'natacion'].includes(profile.code) && metric.code === 'puntos';
const metricLabel = (profile: SportProfile, metric: Metric, testName?: string) => {
  if (isTimedMetric(profile, metric, testName)) return 'Tiempo oficial';
  if (profile.code === 'atletismo' && metric.code === 'marca') return 'Marca oficial';
  if (isOptionalPointsMetric(profile, metric)) return 'Puntos de competencia';
  return metric.label;
};
const metricUnit = (profile: SportProfile, metric: Metric, testName?: string) => {
  if (isTimedMetric(profile, metric, testName)) return null;
  if (profile.code === 'atletismo' && metric.code === 'marca' && isAthleticsFieldEvent(testName)) return 'm';
  return metric.unit || null;
};
const formatOfficialTime = (value: number) => {
  const totalMs = Math.max(0, Math.round(Number(value || 0) * 1000));
  const minutes = Math.floor(totalMs / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const millis = totalMs % 1000;
  return `${minutes ? `${minutes}:` : ''}${minutes ? String(seconds).padStart(2, '0') : seconds}.${String(millis).padStart(3, '0')}`;
};

function TimeSelect({ label, helper, value, onChange }: TimeSelectProps) {
  const [hour, minute] = splitTime(value);
  const minuteOptions = BASE_MINUTE_OPTIONS.includes(minute) ? BASE_MINUTE_OPTIONS : [...BASE_MINUTE_OPTIONS, minute].sort();
  return <div className="rounded-2xl border border-white/10 bg-[#0d1117] p-3">
    <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#70e4df]">{label}</p>
    <p className="mt-1 min-h-9 text-[11px] leading-4 text-[#7f8b99]">{helper}</p>
    <div className="mt-2 grid grid-cols-[1fr_auto_1fr] items-center gap-2">
      <label><span className="mb-1 block text-center text-[9px] uppercase text-[#5f6b78]">Hora</span><select value={hour} onChange={(event) => onChange(replaceTimePart(value, 'hour', event.target.value))} className={smallField}>{HOUR_OPTIONS.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
      <span className="pt-5 text-lg font-black text-[#697586]">:</span>
      <label><span className="mb-1 block text-center text-[9px] uppercase text-[#5f6b78]">Min</span><select value={minute} onChange={(event) => onChange(replaceTimePart(value, 'minute', event.target.value))} className={smallField}>{minuteOptions.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
    </div>
  </div>;
}

function OfficialTimeInput({ value, disabled, onChange }: TimeValueProps) {
  const hasValue = Number.isFinite(Number(value)) && Number(value) > 0;
  const totalMs = hasValue ? Math.round(Number(value) * 1000) : 0;
  const parts = {
    minutes: hasValue ? Math.floor(totalMs / 60000) : '',
    seconds: hasValue ? Math.floor((totalMs % 60000) / 1000) : '',
    millis: hasValue ? totalMs % 1000 : '',
  };
  const update = (part: 'minutes' | 'seconds' | 'millis', raw: string) => {
    if (raw === '' && !hasValue) return onChange(undefined);
    const next = {
      minutes: part === 'minutes' ? Math.max(0, Math.min(999, Number(raw) || 0)) : Number(parts.minutes || 0),
      seconds: part === 'seconds' ? Math.max(0, Math.min(59, Number(raw) || 0)) : Number(parts.seconds || 0),
      millis: part === 'millis' ? Math.max(0, Math.min(999, Number(raw) || 0)) : Number(parts.millis || 0),
    };
    const seconds = next.minutes * 60 + next.seconds + next.millis / 1000;
    onChange(seconds > 0 ? Math.round(seconds * 1000) / 1000 : undefined);
  };
  return <div>
    <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-end gap-1.5">
      <label><span className="mb-1 block text-center text-[8px] font-bold uppercase text-[#697586]">Min</span><input type="number" min="0" max="999" disabled={disabled} value={parts.minutes} onChange={(event) => update('minutes', event.target.value)} className={smallField} placeholder="0" /></label>
      <span className="pb-2 text-[#697586]">:</span>
      <label><span className="mb-1 block text-center text-[8px] font-bold uppercase text-[#697586]">Seg</span><input type="number" min="0" max="59" disabled={disabled} value={parts.seconds} onChange={(event) => update('seconds', event.target.value)} className={smallField} placeholder="00" /></label>
      <span className="pb-2 text-[#697586]">.</span>
      <label><span className="mb-1 block text-center text-[8px] font-bold uppercase text-[#697586]">Milésimas</span><input type="number" min="0" max="999" disabled={disabled} value={parts.millis} onChange={(event) => update('millis', event.target.value)} className={smallField} placeholder="000" /></label>
    </div>
    <div className="mt-1.5 flex items-center justify-between gap-2"><span className="text-[10px] text-[#697586]">{hasValue ? `Registro: ${formatOfficialTime(Number(value))}` : 'Sin registro aún'}</span>{hasValue ? <button type="button" disabled={disabled} onClick={() => onChange(undefined)} className="text-[10px] font-bold text-red-300 disabled:opacity-30">Limpiar</button> : null}</div>
  </div>;
}

export default function EventosRendimiento() {
  const { notify, confirmAction } = useAppDialog();
  const [searchParams] = useSearchParams();
  const requestedTournamentId = searchParams.get('torneo_id') || '';
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [branchId, setBranchId] = useState('');
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Match | null>(null);
  const [form, setForm] = useState({ ...blankForm });
  const [formProfile, setFormProfile] = useState<SportProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [citationTouched, setCitationTouched] = useState(false);
  const [statsMatch, setStatsMatch] = useState<Match | null>(null);
  const [statsProfile, setStatsProfile] = useState<SportProfile | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [teamMetrics, setTeamMetrics] = useState<Record<string, number | undefined>>({});
  const [score, setScore] = useState({ favor: '0', contra: '0' });
  const [statsContext, setStatsContext] = useState<{ temporada?: string; prueba_nombre?: string; roster_source?: string }>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sendReport, setSendReport] = useState(false);
  const [savingStats, setSavingStats] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [primaryResponse, categoriesResponse, tournamentsResponse, matchesResponse] = await Promise.all([
        api.get('/api/academias/rama-principal'),
        api.get('/api/jugadores/categorias'),
        api.get('/api/torneos'),
        api.get('/api/partidos', { params: requestedTournamentId ? { torneo_id: requestedTournamentId } : branchId ? { rama_id: branchId } : undefined }),
      ]);
      const primary = primaryResponse.data.data;
      setBranches(primary?.ramas || []);
      setCategories(categoriesResponse.data.data || []);
      setTournaments(tournamentsResponse.data.data || []);
      setMatches(matchesResponse.data.data || []);
      if (!branchId && primary?.rama_principal_id) setBranchId(primary.rama_principal_id);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar Eventos y Rendimiento.');
    } finally { setLoading(false); }
  }, [branchId, notify, requestedTournamentId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!modalOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [modalOpen]);

  const branchCategories = useMemo(() => categories.filter((item) => !form.rama_id || item.rama_id === form.rama_id), [categories, form.rama_id]);
  const branchTournaments = useMemo(() => tournaments.filter((item) => !form.rama_id || item.rama_id === form.rama_id), [tournaments, form.rama_id]);
  const selectedBranch = branches.find((item) => item.id === form.rama_id) || null;
  const formEventUi = formProfile?.eventUi || defaultEventUi;
  const testName = statsContext.prueba_nombre || statsMatch?.rival || '';
  const basicMetrics = (statsProfile?.metrics || []).filter((item) => item.tier !== 'advanced' && !(statsProfile && isOptionalPointsMetric(statsProfile, item)));
  const advancedMetrics = (statsProfile?.metrics || []).filter((item) => item.tier === 'advanced' || Boolean(statsProfile && isOptionalPointsMetric(statsProfile, item)));
  const basicTeamMetrics = (statsProfile?.teamMetrics || []).filter((item) => item.tier !== 'advanced');
  const advancedTeamMetrics = (statsProfile?.teamMetrics || []).filter((item) => item.tier === 'advanced');
  const teamParticipation = Boolean(statsProfile && TEAM_CODES.has(statsProfile.code));
  const scheduleLead = leadMinutes(form.hora, form.hora_citacion);

  const applyProfile = (profile: SportProfile | null) => {
    setFormProfile(profile);
    const ui = profile?.eventUi || defaultEventUi;
    setForm((current) => {
      const equipment = String(current.color_uniforme || '').trim();
      const color_uniforme = ui.equipmentMode === 'uniform'
        ? (legacyUniformValues.has(equipment) ? (equipment === 'Principal' ? 'Titular' : equipment) : 'Titular')
        : (legacyUniformValues.has(equipment) ? '' : equipment);
      const condicion = ui.conditionMode === 'hidden' ? 'Evento' : ui.conditionMode === 'required'
        ? (['Local', 'Visita'].includes(current.condicion) ? current.condicion : 'Local')
        : (['Local', 'Visita', 'Evento'].includes(current.condicion) ? current.condicion : 'Evento');
      return { ...current, color_uniforme, condicion };
    });
  };

  const loadPerformanceProfile = async (ramaId: string) => {
    if (!ramaId) { applyProfile(null); return; }
    setProfileLoading(true);
    try {
      const response = await api.get('/api/rendimiento/perfil', { params: { rama_id: ramaId } });
      applyProfile(response.data.data || null);
    } catch (error: any) {
      console.error('No fue posible cargar perfil de rendimiento:', error);
      await notify(error.response?.data?.error || 'No fue posible adaptar el evento a la disciplina.');
    } finally { setProfileLoading(false); }
  };

  const openCreate = () => {
    const requested = tournaments.find((item) => item.id === requestedTournamentId) || null;
    const initialBranch = requested?.rama_id || branchId || branches[0]?.id || '';
    setEditing(null);
    setCitationTouched(false);
    setForm({ ...blankForm, rama_id: initialBranch, torneo_id: requested?.id || '' });
    setFormProfile(null);
    setModalOpen(true);
    if (initialBranch) void loadPerformanceProfile(initialBranch);
  };

  const openEdit = (match: Match) => {
    setEditing(match);
    setCitationTouched(true);
    setForm({
      rama_id: match.rama_id || '', categoria_id: match.categoria_id || '', torneo_id: match.torneo_id || '', es_amistoso: match.es_amistoso,
      rival: match.rival || '', fecha: match.fecha || '', hora: String(match.hora || '').slice(0, 5) || '12:00',
      hora_citacion: String(match.hora_citacion || '').slice(0, 5) || '11:00', ubicacion: match.ubicacion || '', link_maps: match.link_maps || '',
      color_uniforme: match.color_uniforme || '', condicion: match.condicion || 'Evento', cobra_arbitraje: Boolean(match.cobra_arbitraje),
      monto_arbitraje_jugador: String(match.monto_arbitraje_jugador || 0),
    });
    setModalOpen(true);
    if (match.rama_id) void loadPerformanceProfile(match.rama_id);
  };

  const changeBranch = (next: string) => {
    setForm((current) => ({ ...current, rama_id: next, categoria_id: '', torneo_id: '' }));
    void loadPerformanceProfile(next);
  };

  const changeEventTime = (next: string) => {
    setForm((current) => ({ ...current, hora: next, hora_citacion: citationTouched ? current.hora_citacion : subtractMinutes(next, 60) }));
  };

  const setCitationTime = (next: string) => {
    setCitationTouched(true);
    setForm((current) => ({ ...current, hora_citacion: next }));
  };

  const setCitationOffset = (minutes: number) => {
    setCitationTouched(true);
    setForm((current) => ({ ...current, hora_citacion: subtractMinutes(current.hora, minutes) }));
  };

  const saveMatch = async () => {
    if (!form.rama_id || !form.categoria_id || !form.rival.trim() || !form.fecha || !form.hora) {
      return void notify('Rama, categoría, rival/prueba, fecha y hora del evento son obligatorios.');
    }
    if (scheduleLead <= 0) return void notify('La hora de citación debe ser anterior a la hora de inicio del evento.');
    try {
      const body = { ...form, monto_arbitraje_jugador: Number(form.monto_arbitraje_jugador) || 0 };
      if (editing) await api.put(`/api/partidos/${editing.id}`, body); else await api.post('/api/partidos', body);
      setModalOpen(false);
      await load();
      await notify(editing ? 'Evento actualizado.' : 'Evento deportivo creado.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible guardar el evento.'); }
  };

  const sendCitation = async (match: Match) => {
    const accepted = await confirmAction(`Se enviará la citación de ${match.sport_profile?.activityLabel?.toLowerCase() || 'este evento'} a los alumnos correspondientes.`, { confirmLabel: 'Enviar citación' });
    if (!accepted) return;
    try {
      const response = await api.post(`/api/partidos/${match.id}/citacion`);
      await notify(response.data.message || 'Citaciones enviadas.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible enviar las citaciones.'); }
  };

  const remove = async (match: Match) => {
    const accepted = await confirmAction(`¿Eliminar ${match.rival}?`, { tone: 'danger', confirmLabel: 'Eliminar' });
    if (!accepted) return;
    try { await api.delete(`/api/partidos/${match.id}`); await load(); }
    catch (error: any) { await notify(error.response?.data?.error || 'No fue posible eliminar el evento.'); }
  };

  const openStats = async (match: Match) => {
    try {
      const response = await api.get(`/api/partidos/${match.id}/estadisticas`);
      setStatsMatch(match);
      setStatsProfile(response.data.profile || match.sport_profile);
      setStats((response.data.data || []).map((item: PlayerStat) => ({
        ...item,
        metricas_competitivas: item.metricas_competitivas || {},
        participo: item.participo !== false,
        titular: Boolean(item.titular),
        minutos: Number(item.minutos) || 0,
        rol: item.rol || '', observaciones: item.observaciones || '',
      })));
      setTeamMetrics(response.data.team_metrics || {});
      setStatsContext(response.data.context || {});
      setScore({ favor: String(match.goles_favor || 0), contra: String(match.goles_contra || 0) });
      setShowAdvanced(false);
      setSendReport(false);
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible cargar el rendimiento del evento.'); }
  };

  const changePlayer = (playerId: string, patch: Partial<PlayerStat>) => setStats((current) => current.map((item) => item.jugador_id === playerId ? { ...item, ...patch } : item));
  const changeMetric = (playerId: string, code: string, value: number | undefined) => setStats((current) => current.map((item) => {
    if (item.jugador_id !== playerId) return item;
    const next = { ...item.metricas_competitivas };
    if (value === undefined || !Number.isFinite(Number(value))) delete next[code]; else next[code] = Number(value);
    return { ...item, metricas_competitivas: next };
  }));
  const changeTeamMetric = (code: string, raw: string) => setTeamMetrics((current) => {
    const next = { ...current };
    if (raw === '') delete next[code]; else next[code] = Number(raw);
    return next;
  });
  const setMvp = (playerId: string) => setStats((current) => current.map((item) => ({ ...item, es_mvp: item.jugador_id === playerId })));

  const saveStats = async () => {
    if (!statsMatch) return;
    setSavingStats(true);
    try {
      const response = await api.post(`/api/partidos/${statsMatch.id}/guardar-resultado`, {
        resultado_favor: Number(score.favor) || 0,
        resultado_contra: Number(score.contra) || 0,
        metricas_equipo: teamMetrics,
        temporada: statsContext.temporada,
        prueba_nombre: statsContext.prueba_nombre || statsMatch.rival,
        enviarWhatsapp: sendReport,
        estadisticas: stats.map((item) => ({
          jugador_id: item.jugador_id, metricas_competitivas: item.metricas_competitivas, participo: item.participo,
          titular: teamParticipation ? item.titular : false, minutos: teamParticipation ? item.minutos : 0,
          rol: item.rol, observaciones: item.observaciones, es_mvp: item.es_mvp,
        })),
      });
      const pb = Number(response.data?.records?.pb_count) || 0;
      const sb = Number(response.data?.records?.sb_count) || 0;
      setStatsMatch(null);
      await load();
      const recordText = pb ? ` · 🏆 ${pb} nueva${pb === 1 ? '' : 's'} PB` : sb ? ` · 📈 ${sb} nueva${sb === 1 ? '' : 's'} SB` : '';
      await notify(`${sendReport ? 'Resultado guardado e informes enviados' : 'Resultado y rendimiento guardados'}${recordText}.`);
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible guardar el rendimiento.'); }
    finally { setSavingStats(false); }
  };

  const renderMetric = (player: PlayerStat, metric: Metric) => {
    if (!statsProfile) return null;
    const currentValue = player.metricas_competitivas?.[metric.code];
    const timed = isTimedMetric(statsProfile, metric, testName);
    const unit = metricUnit(statsProfile, metric, testName);
    const pb = player.records?.pb?.find((row) => row.metrica_codigo === metric.code || row.metrica_label === metric.label);
    return <label key={metric.code} className={`rounded-xl border p-3 ${metric.record ? 'border-[#C8A96B]/30 bg-[#C8A96B]/5' : 'border-white/10 bg-[#151b25]'}`}>
      <span className="flex items-center justify-between gap-2 text-[10px] font-black uppercase text-[#697586]"><span>{metricLabel(statsProfile, metric, testName)}</span>{metric.record ? <span title="Este resultado alimenta automáticamente PB/SB">🏆</span> : null}</span>
      {timed ? <div className="mt-2"><OfficialTimeInput disabled={!player.participo} value={currentValue} onChange={(value) => changeMetric(player.jugador_id, metric.code, value)} /></div> : <div className="mt-1 flex items-center gap-1"><input type="number" min="0" step={numberStep(metric)} disabled={!player.participo} value={currentValue ?? ''} onChange={(event) => changeMetric(player.jugador_id, metric.code, event.target.value === '' ? undefined : Number(event.target.value))} placeholder="—" className="min-w-0 flex-1 bg-transparent text-lg font-black text-[#70e4df] outline-none disabled:opacity-30" />{unit ? <span className="text-xs font-bold text-[#697586]">{unit}</span> : null}</div>}
      {metric.record ? <p className="mt-2 text-[10px] leading-4 text-[#a89772]">{pb ? `PB actual: ${timed ? formatOfficialTime(pb.valor) : pb.valor}${!timed && pb.unidad ? ` ${pb.unidad}` : ''}. Aquí ingresas el resultado de este evento.` : 'Primera marca: ingresa el resultado de este evento. Al guardar, Lestra lo registrará automáticamente como PB y SB.'}</p> : null}
      {isOptionalPointsMetric(statsProfile, metric) ? <p className="mt-2 text-[10px] leading-4 text-[#697586]">Opcional. Úsalo solo si la competencia entrega puntaje oficial por resultado o posición.</p> : null}
    </label>;
  };

  const renderMetrics = (player: PlayerStat, metrics: Metric[]) => <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{metrics.map((metric) => renderMetric(player, metric))}</div>;

  const roleLabel = statsProfile?.code === 'atletismo' ? 'Serie / carril / especialidad (opcional)'
    : statsProfile?.code === 'natacion' ? 'Serie / carril (opcional)'
      : statsProfile?.code === 'gimnasia' ? 'Aparato / especialidad (opcional)'
        : teamParticipation ? 'Posición / función' : 'Rol / modalidad (opcional)';

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.17),transparent_38%),#151b25] p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Motor deportivo multirrama</p><h1 className="mt-2 text-3xl font-black text-white">Eventos y Rendimiento</h1><p className="mt-2 max-w-4xl text-sm leading-6 text-[#8b949e]">Registra cada partido, duelo, prueba, carrera, combate o presentación. Lestra adapta las métricas a la disciplina y construye el historial deportivo de alumnos, equipos y ramas.</p></div><button onClick={openCreate} className="rounded-xl bg-[#289E9D] px-5 py-2.5 text-sm font-black text-white">+ Nuevo evento</button></div>
    </section>

    <section className={`${panel} p-4`}><select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={`${field} max-w-lg`}><option value="">Todas las ramas</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre ? ` · ${branch.sedes.nombre}` : ''}</option>)}</select></section>

    {loading ? <div className={`${panel} p-10 text-center text-[#8b949e]`}>Cargando Eventos y Rendimiento...</div> : <section className="grid gap-4 lg:grid-cols-2">{matches.map((match) => <article key={match.id} className={`${panel} overflow-hidden`}>
      <div className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-violet-300">{match.ramas?.disciplina || match.sport_profile?.label || 'Histórico'}</span><span className="rounded-full bg-[#289E9D]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[#70e4df]">{match.sport_profile?.activityLabel || 'Evento'}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${match.estado === 'Jugado' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-[#289E9D]/10 text-[#70e4df]'}`}>{match.estado}</span></div><h2 className="mt-3 text-xl font-black text-white">{match.sport_profile?.icon || '🏅'} {match.rival}</h2><p className="mt-1 text-xs text-[#8b949e]">{match.ramas?.nombre || 'Sin rama'} · {match.categorias?.nombre || 'Sin categoría'}{match.torneos?.nombre ? ` · ${match.torneos.nombre}` : ' · Evento independiente'}</p></div><div className="text-right"><p className="text-sm font-black text-white">{match.fecha}</p><p className="text-xs text-[#8995a4]">Inicio {String(match.hora || '').slice(0, 5)} hrs</p></div></div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[9px] uppercase text-[#697586]">Llegada / citación</p><p className="text-sm font-black text-white">{String(match.hora_citacion || '').slice(0, 5) || '—'}</p></div>{match.sport_profile?.eventUi?.conditionMode !== 'hidden' ? <div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[9px] uppercase text-[#697586]">Condición</p><p className="text-sm font-black text-white">{match.condicion || '—'}</p></div> : null}<div className={`rounded-xl bg-[#0d1117] p-3 ${match.sport_profile?.eventUi?.conditionMode === 'hidden' ? 'col-span-1 sm:col-span-3' : 'sm:col-span-2'}`}><p className="text-[9px] uppercase text-[#697586]">Lugar</p><p className="truncate text-sm font-black text-white">{match.ubicacion || 'Por confirmar'}</p></div></div>
      {match.estado === 'Jugado' && match.sport_profile?.usesHeadToHeadScore ? <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-center text-lg font-black text-emerald-200">{match.goles_favor || 0} — {match.goles_contra || 0}</div> : null}</div>
      <div className="flex flex-wrap gap-2 border-t border-white/10 p-4"><button onClick={() => void sendCitation(match)} disabled={match.estado === 'Jugado'} className="rounded-xl border border-[#289E9D]/30 px-3 py-2 text-xs font-black text-[#70e4df] disabled:opacity-30">Enviar citación</button><button onClick={() => void openStats(match)} className="rounded-xl border border-[#C8A96B]/30 bg-[#C8A96B]/5 px-3 py-2 text-xs font-black text-[#D8BE87]">{match.estado === 'Jugado' ? 'Rendimiento / resultado' : 'Registrar rendimiento'}</button><button onClick={() => openEdit(match)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-[#c3ccd6]">Editar</button><button onClick={() => void remove(match)} className="ml-auto rounded-xl border border-red-400/15 px-3 py-2 text-xs font-black text-red-300">Eliminar</button></div>
    </article>)}{!matches.length ? <div className={`${panel} col-span-full p-10 text-center text-sm text-[#697586]`}>No hay eventos deportivos en el alcance seleccionado.</div> : null}</section>}

    {modalOpen ? createPortal(<div className="lestra-event-popup fixed inset-0 z-[100000] grid place-items-center bg-black/50 p-4"><div className="lestra-event-popup-card max-h-[88dvh] w-full max-w-2xl overflow-hidden rounded-[20px] border border-[#d8dfd5] bg-white text-[#111711] shadow-2xl">
      <div className="lestra-event-popup-header flex items-start justify-between"><div><p className="text-xs font-black uppercase text-[#789600]">{editing ? 'Editar' : 'Nuevo'} {formProfile?.activityLabel?.toLowerCase() || 'evento deportivo'}</p><h2 className="mt-1 text-2xl font-black text-[#111711]">Contexto deportivo</h2></div><button type="button" aria-label="Cerrar" onClick={() => setModalOpen(false)} className="text-2xl text-[#354235]">×</button></div>
      <div className="lestra-event-popup-body mt-5 space-y-4 overflow-y-auto">
        <label><span className="mb-1 block text-xs font-bold text-[#566356]">Rama deportiva *</span><select value={form.rama_id} onChange={(event) => changeBranch(event.target.value)} className={field}><option value="">Selecciona rama</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}</option>)}</select></label>
        {selectedBranch ? <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm text-violet-700">Perfil: <strong>{formProfile?.label || selectedBranch.disciplina}</strong>. El formulario y las métricas se adaptan automáticamente a esta disciplina.</div> : null}
        <label><span className="mb-1 block text-xs font-bold text-[#566356]">Categoría *</span><select value={form.categoria_id} onChange={(event) => setForm({ ...form, categoria_id: event.target.value })} className={field}><option value="">Selecciona categoría</option>{branchCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
        <label className="flex items-center gap-3 rounded-xl border border-[#d7dfd4] bg-[#f8faf6] p-3 text-sm font-bold text-[#111711]"><input type="checkbox" checked={form.es_amistoso} onChange={(event) => setForm({ ...form, es_amistoso: event.target.checked, torneo_id: event.target.checked ? '' : form.torneo_id })} />Evento independiente / fuera de competencia</label>
        {!form.es_amistoso ? <label><span className="mb-1 block text-xs font-bold text-[#566356]">Competencia / torneo</span><select value={form.torneo_id} onChange={(event) => setForm({ ...form, torneo_id: event.target.value })} className={field}><option value="">Selecciona competencia</option>{branchTournaments.map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}</select></label> : null}
        <label><span className="mb-1 block text-xs font-bold text-[#566356]">{formProfile?.opponentLabel || 'Rival / prueba / modalidad'} *</span><input value={form.rival} onChange={(event) => setForm({ ...form, rival: event.target.value })} className={field} placeholder={formProfile?.code === 'atletismo' ? 'Ej: Preliminar 100 m planos' : formProfile?.code === 'natacion' ? 'Ej: 100 m libre' : 'Nombre del rival, prueba o modalidad'} /></label>

        <section className="rounded-2xl border border-[#d7dfd4] bg-[#f8faf6] p-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#789600]">Fecha y horarios</p><p className="mt-1 text-xs leading-5 text-[#5d695d]">Define cuándo deben llegar los alumnos y cuándo comienza realmente el evento. La citación debe ser anterior al inicio.</p></div>
          <label className="mt-3 block"><span className="mb-1 block text-xs font-bold text-[#566356]">Fecha del evento *</span><input type="date" value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} className={field} /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2"><TimeSelect label="Hora de citación / llegada" helper="Hora a la que el alumno debe estar en el recinto, listo para presentarse o calentar." value={form.hora_citacion} onChange={setCitationTime} /><TimeSelect label="Hora de inicio del evento" helper="Hora en que comienza el partido, carrera, prueba, combate o presentación." value={form.hora} onChange={changeEventTime} /></div>
          <div className="mt-3 flex flex-wrap items-center gap-2"><span className="text-[10px] font-bold uppercase text-[#697586]">Llegar antes:</span>{[30, 45, 60, 90].map((minutes) => <button key={minutes} type="button" onClick={() => setCitationOffset(minutes)} className={`rounded-lg border px-2.5 py-1.5 text-xs font-black ${scheduleLead === minutes ? 'border-[#8eb700] bg-[#b7ff00]/15 text-[#5d7800]' : 'border-[#d7dfd4] text-[#566356]'}`}>{minutes} min</button>)}<span className={`ml-auto text-xs font-bold ${scheduleLead > 0 ? 'text-emerald-700' : 'text-red-700'}`}>{scheduleLead > 0 ? `Citación ${scheduleLead} min antes` : 'Revisa los horarios'}</span></div>
        </section>

        <label><span className="mb-1 block text-xs font-bold text-[#566356]">Lugar / recinto</span><input value={form.ubicacion} onChange={(event) => setForm({ ...form, ubicacion: event.target.value })} className={field} placeholder="Ej: Estadio Municipal, Pista Atlética Nacional…" /></label>
        <label><span className="mb-1 block text-xs font-bold text-[#566356]">Link de ubicación</span><input value={form.link_maps} onChange={(event) => setForm({ ...form, link_maps: event.target.value })} className={field} placeholder="Google Maps u otro enlace de ubicación" /></label>
        {profileLoading ? <div className="rounded-xl border border-[#cde995] bg-[#f3fadf] p-3 text-xs font-bold text-[#5d7800]">Adaptando campos a la disciplina…</div> : <div className={`grid gap-3 ${formEventUi.conditionMode === 'hidden' ? 'grid-cols-1' : 'sm:grid-cols-2'}`}><div className="rounded-2xl border border-[#d7dfd4] bg-[#f8faf6] p-3"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#789600]">Información para el alumno</p><p className="mt-1 text-sm font-black text-[#111711]">{formEventUi.equipmentLabel}</p>{formEventUi.equipmentMode === 'uniform' ? <select value={form.color_uniforme} onChange={(event) => setForm({ ...form, color_uniforme: event.target.value })} className={`${field} mt-2`}><option value="Titular">Indumentaria titular</option><option value="Visita">Indumentaria visita</option><option value="Ambas (Llevar ambos)">Llevar ambas</option></select> : <input value={form.color_uniforme} onChange={(event) => setForm({ ...form, color_uniforme: event.target.value })} className={`${field} mt-2`} placeholder={formEventUi.equipmentPlaceholder || 'Equipamiento requerido'} />}</div>{formEventUi.conditionMode !== 'hidden' ? <label><span className="mb-1 block text-xs font-bold text-[#566356]">Condición</span><select value={form.condicion} onChange={(event) => setForm({ ...form, condicion: event.target.value })} className={field}>{formEventUi.conditionMode === 'optional' ? <option value="Evento">Sede neutral / evento</option> : null}<option value="Local">Local</option><option value="Visita">Visita</option></select></label> : null}</div>}
        <label className="flex items-center gap-3 rounded-xl border border-[#d7dfd4] bg-[#f8faf6] p-3 text-sm font-bold text-[#111711]"><input type="checkbox" checked={form.cobra_arbitraje} onChange={(event) => setForm({ ...form, cobra_arbitraje: event.target.checked })} />Cobrar arbitraje/jueces al alumno</label>
        {form.cobra_arbitraje ? <input type="number" min="0" value={form.monto_arbitraje_jugador} onChange={(event) => setForm({ ...form, monto_arbitraje_jugador: event.target.value })} className={field} placeholder="Monto por alumno" /> : null}
        <button onClick={() => void saveMatch()} className="min-h-11 w-full rounded-xl bg-[#b7ff00] px-5 text-sm font-black text-[#111711]">{editing ? 'Guardar cambios' : `Crear ${formProfile?.activityLabel?.toLowerCase() || 'evento'}`}</button>
      </div>
    </div></div>, document.body) : null}

    {statsMatch && statsProfile ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3"><div className="max-h-[95vh] w-full max-w-6xl overflow-y-auto rounded-[26px] border border-[#C8A96B]/25 bg-[#151b25] p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase text-[#D8BE87]">Eventos y Rendimiento · {statsProfile.label}</p><h2 className="mt-1 text-2xl font-black text-white">{statsProfile.icon} {statsMatch.rival}</h2><p className="mt-1 text-xs text-[#8b949e]">Temporada {statsContext.temporada || statsMatch.fecha?.slice(0, 4)} · {stats.length} deportistas · {statsContext.roster_source === 'categoria' ? 'plantel de categoría' : 'citaciones confirmadas'}</p></div><div className="flex gap-2"><button onClick={() => setShowAdvanced((value) => !value)} className="rounded-xl border border-violet-400/25 bg-violet-500/10 px-3 py-2 text-xs font-black text-violet-300">{showAdvanced ? 'Ocultar avanzadas' : 'Métricas avanzadas'}</button><button onClick={() => setStatsMatch(null)} className="text-2xl text-[#8995a4]">×</button></div></div>

      {statsProfile.usesHeadToHeadScore ? <section className="mt-5 rounded-2xl border border-[#289E9D]/20 bg-[#0d1117] p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#70e4df]">Resultado general</p><div className="mt-3 grid grid-cols-2 gap-3"><label><span className="text-xs font-bold text-[#9aa6b5]">A favor · {statsProfile.scoreLabel}</span><input type="number" min="0" value={score.favor} onChange={(event) => setScore({ ...score, favor: event.target.value })} className={`${field} mt-1 text-center text-xl font-black`} /></label><label><span className="text-xs font-bold text-[#9aa6b5]">Rival · {statsProfile.scoreLabel}</span><input type="number" min="0" value={score.contra} onChange={(event) => setScore({ ...score, contra: event.target.value })} className={`${field} mt-1 text-center text-xl font-black`} /></label></div></section> : <section className="mt-5 rounded-2xl border border-[#C8A96B]/25 bg-[#C8A96B]/10 p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#D8BE87]">Prueba y marca oficial</p><p className="mt-1 text-sm font-black text-white">{testName}</p><p className="mt-1 text-xs leading-5 text-[#b8ad95]">La marca que ingresas corresponde a <strong>este evento</strong>. Si el alumno no tiene una marca anterior, al guardar esta primera carrera/prueba Lestra la convertirá automáticamente en su PB y SB inicial.</p></section>}

      {(basicTeamMetrics.length || (showAdvanced && advancedTeamMetrics.length)) ? <section className="mt-5 rounded-2xl border border-sky-400/20 bg-sky-500/5 p-4"><div><p className="text-[10px] font-black uppercase tracking-[.14em] text-sky-300">Métricas del equipo</p><p className="mt-1 text-xs text-[#8b949e]">Datos globales del evento para analizar tendencias de la categoría.</p></div><div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{[...basicTeamMetrics, ...(showAdvanced ? advancedTeamMetrics : [])].map((metric) => <label key={metric.code} className="rounded-xl border border-white/10 bg-[#0d1117] p-3"><span className="block text-[10px] font-black uppercase text-[#697586]">{metric.label}</span><div className="mt-1 flex items-center gap-1"><input type="number" min="0" step={numberStep(metric)} value={teamMetrics[metric.code] ?? ''} onChange={(event) => changeTeamMetric(metric.code, event.target.value)} placeholder="—" className="min-w-0 flex-1 bg-transparent text-lg font-black text-sky-300 outline-none" />{metric.unit ? <span className="text-xs text-[#697586]">{metric.unit}</span> : null}</div></label>)}</div></section> : null}

      <section className="mt-5"><div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#D8BE87]">Rendimiento individual</p><p className="mt-1 text-xs leading-5 text-[#8b949e]">“Participó” indica que tomó parte en esta prueba. {teamParticipation ? 'En deportes de equipo también puedes registrar si comenzó jugando y sus minutos en cancha.' : 'En pruebas individuales el tiempo oficial se registra en la métrica de resultado, no como minutos de participación.'}</p></div>
        <div className="space-y-4">{stats.map((player) => <article key={player.jugador_id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3">{player.foto_base64 ? <img src={player.foto_base64} alt="" className="h-10 w-10 rounded-xl object-cover" /> : null}<div><p className="font-black text-white">{player.nombre}</p>{player.records?.pb?.length ? <p className="mt-0.5 text-[10px] font-bold text-[#D8BE87]">🏆 PB vigente: {player.records.pb.map((row) => `${row.metrica_label} ${row.unidad === 's' ? formatOfficialTime(row.valor) : `${row.valor}${row.unidad ? ` ${row.unidad}` : ''}`}`).join(' · ')}</p> : <p className="mt-0.5 text-[10px] text-[#697586]">Sin marca personal previa registrada para esta prueba.</p>}</div></div><button disabled={!player.participo} onClick={() => setMvp(player.jugador_id)} className={`rounded-full px-3 py-1 text-xs font-black disabled:opacity-30 ${player.es_mvp ? 'bg-[#C8A96B] text-[#15120c]' : 'border border-[#C8A96B]/25 text-[#D8BE87]'}`}>🌟 Destacado/a</button></div>

          <div className={`mt-3 grid gap-2 ${teamParticipation ? 'sm:grid-cols-2 lg:grid-cols-5' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
            <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151b25] p-3 text-xs font-bold text-white"><input type="checkbox" checked={player.participo} onChange={(event) => changePlayer(player.jugador_id, { participo: event.target.checked, titular: event.target.checked ? player.titular : false, minutos: event.target.checked ? player.minutos : 0, es_mvp: event.target.checked ? player.es_mvp : false })} /><span><span className="block">Participó</span><span className="mt-0.5 block text-[9px] font-normal text-[#697586]">Tomó parte en este evento</span></span></label>
            {teamParticipation ? <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-[#151b25] p-3 text-xs font-bold text-white"><input type="checkbox" disabled={!player.participo} checked={player.titular} onChange={(event) => changePlayer(player.jugador_id, { titular: event.target.checked })} /><span><span className="block">Comenzó jugando</span><span className="mt-0.5 block text-[9px] font-normal text-[#697586]">Antes “Titular / inicial”</span></span></label> : null}
            {teamParticipation ? <label className="rounded-xl border border-white/10 bg-[#151b25] p-2"><span className="block text-[9px] uppercase text-[#697586]">Tiempo jugado (min)</span><input type="number" min="0" step="0.1" disabled={!player.participo} value={player.minutos || ''} onChange={(event) => changePlayer(player.jugador_id, { minutos: Number(event.target.value) || 0 })} placeholder="—" className="w-full bg-transparent text-sm font-black text-white outline-none" /></label> : null}
            <label className={`rounded-xl border border-white/10 bg-[#151b25] p-2 ${teamParticipation ? 'lg:col-span-2' : 'sm:col-span-1 lg:col-span-2'}`}><span className="block text-[9px] uppercase text-[#697586]">{roleLabel}</span><input disabled={!player.participo} value={player.rol} onChange={(event) => changePlayer(player.jugador_id, { rol: event.target.value })} className="w-full bg-transparent text-sm font-black text-white outline-none" placeholder={statsProfile.code === 'atletismo' ? 'Ej: Serie 1 · Carril 4' : teamParticipation ? 'Ej: Arquero, Base, Central…' : 'Opcional'} /></label>
          </div>

          <div className="mt-3">{renderMetrics(player, basicMetrics)}</div>
          {showAdvanced && advancedMetrics.length ? <div className="mt-3 rounded-2xl border border-violet-400/15 bg-violet-500/5 p-3"><p className="mb-2 text-[10px] font-black uppercase tracking-[.12em] text-violet-300">Métricas avanzadas / opcionales</p>{renderMetrics(player, advancedMetrics)}</div> : null}
          <label className="mt-3 block rounded-xl border border-white/10 bg-[#151b25] p-3"><span className="block text-[9px] font-black uppercase text-[#697586]">Observación del evento</span><textarea disabled={!player.participo} value={player.observaciones} onChange={(event) => changePlayer(player.jugador_id, { observaciones: event.target.value })} rows={2} className="mt-1 w-full resize-none bg-transparent text-sm text-white outline-none" placeholder="Observación breve que ayude a interpretar los datos…" /></label>
        </article>)}{!stats.length ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-[#697586]">No hay alumnos disponibles para registrar rendimiento.</div> : null}</div>
      </section>

      <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#289E9D]/20 bg-[#289E9D]/10 p-3 text-sm font-bold text-[#bff8f5]"><input type="checkbox" checked={sendReport} onChange={(event) => setSendReport(event.target.checked)} className="mt-1" /><span><span className="block">Enviar resumen de rendimiento por WhatsApp</span><span className="mt-1 block text-xs font-normal leading-5 text-[#8fc9c7]">La familia recibirá participación, métricas y nuevas marcas PB/SB cuando corresponda.</span></span></label>
      <button disabled={savingStats || !stats.length} onClick={() => void saveStats()} className="mt-4 min-h-12 w-full rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c] disabled:opacity-50">{savingStats ? 'Guardando historial deportivo…' : sendReport ? 'Guardar rendimiento y enviar informes' : 'Guardar resultado y rendimiento'}</button>
    </div></div> : null}
  </div>;
}

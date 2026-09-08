import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import ProfessorAgendaPanel from '../components/profesor/ProfessorAgendaPanel';
import ProfessorTodayPanel from '../components/profesor/ProfessorTodayPanel';
import ProfessorCasesPanel from '../components/profesor/ProfessorCasesPanel';
import ProfessorTacticalBoard from '../components/profesor/ProfessorTacticalBoard';
import LiveMatchPanel from '../components/profesor/LiveMatchPanel';
import TrainingLogPanel from '../components/profesor/TrainingLogPanel';
import MatchPreparationPanel from '../components/profesor/MatchPreparationPanel';
import AttendanceLineup, { type AttendanceState } from '../components/profesor/AttendanceLineup';

type Category = { id: string; nombre: string; descripcion?: string | null; rama_id?: string | null; sede_id?: string | null; ramas?: { id: string; nombre: string; disciplina: string } | null; sedes?: { id: string; nombre: string } | null };
type Player = { id: string; nombre: string; posicion_cancha?: string | null; posicion_principal?: string | null; rol_especialidad?: string | null; foto_url?: string | null; avatar_url?: string | null; alerta_medica?: string | null; telefono_emergencia?: string | null; estado_asistencia?: AttendanceState | null };
type Profile = { profesor: { id: string; nombre: string }; academia: { id: string; nombre: string }; categorias: Category[] };
type PortalTab = 'hoy' | 'asistencia' | 'entrenamientos' | 'partidos' | 'pizarra' | 'casos';
type ActiveTool = { type: 'training' | 'preparation' | 'live'; id: string } | null;
type RosterState = 'idle' | 'loading' | 'verified' | 'unavailable';

const ATTENDANCE_STATES = new Set<AttendanceState>(['Presente', 'Ausente', 'Justificado']);
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const isAttendanceState = (value: unknown): value is AttendanceState => ATTENDANCE_STATES.has(value as AttendanceState);

const readAttendanceDraft = (key: string): Record<string, AttendanceState> => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([, value]) => isAttendanceState(value))) as Record<string, AttendanceState>;
  } catch {
    return {};
  }
};

const writeAttendanceDraft = (key: string, value: Record<string, AttendanceState>) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* El servidor sigue siendo la fuente de verdad. */ }
};

const removeAttendanceDraft = (key: string) => {
  try { localStorage.removeItem(key); } catch { /* Sin impacto en el registro remoto. */ }
};

const filterAttendanceForPlayers = (value: Record<string, AttendanceState>, players: Player[]) => {
  const allowed = new Set(players.map((player) => player.id));
  return Object.fromEntries(Object.entries(value).filter(([playerId, status]) => allowed.has(playerId) && isAttendanceState(status))) as Record<string, AttendanceState>;
};

const ProfesorPortal = () => {
  const { user } = useAuth();
  const { notify } = useAppDialog();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [categoryId, setCategoryId] = useState('');
  const [date, setDate] = useState(today());
  const [players, setPlayers] = useState<Player[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceState>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [activeTab, setActiveTab] = useState<PortalTab>('hoy');
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);
  const [rosterState, setRosterState] = useState<RosterState>('idle');
  const [rosterContext, setRosterContext] = useState('');
  const [rosterMessage, setRosterMessage] = useState('');
  const [draftSavedCount, setDraftSavedCount] = useState(0);
  const attendanceRequestRef = useRef(0);
  const previousOnlineRef = useRef(online);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => { window.removeEventListener('online', goOnline); window.removeEventListener('offline', goOffline); };
  }, []);

  useEffect(() => {
    api.get('/api/profesores/me').then((response) => {
      const data = response.data.data as Profile;
      setProfile(data);
      setCategoryId(data.categorias[0]?.id || '');
    }).catch((error) => notify(error.response?.data?.error || 'No fue posible abrir tu portal.')).finally(() => setLoading(false));
  }, [notify]);

  const contextKey = useMemo(() => `${categoryId}:${date}`, [categoryId, date]);
  const draftKey = useMemo(() => `syncademia:asistencia:${user?.id || 'profesor'}:${categoryId}:${date}`, [categoryId, date, user?.id]);

  const resetRosterForContextChange = useCallback(() => {
    attendanceRequestRef.current += 1;
    setPlayers([]);
    setAttendance({});
    setRosterState('idle');
    setRosterContext('');
    setRosterMessage('');
    setDraftSavedCount(0);
    setLoading(false);
  }, []);

  const loadAttendance = useCallback(async () => {
    if (!categoryId) return;
    const requestId = ++attendanceRequestRef.current;
    const requestedContext = contextKey;
    const localDraft = readAttendanceDraft(draftKey);
    const localDraftCount = Object.keys(localDraft).length;

    setLoading(true);
    setPlayers([]);
    setAttendance({});
    setRosterContext(requestedContext);
    setDraftSavedCount(localDraftCount);

    if (!navigator.onLine) {
      setAttendance(localDraft);
      setRosterState('unavailable');
      setRosterMessage(localDraftCount
        ? `Hay un borrador local con ${localDraftCount} registro${localDraftCount === 1 ? '' : 's'}, pero la lista de alumnos no se mostrará hasta verificar esta categoría con el servidor.`
        : 'No podemos verificar la lista de esta categoría sin conexión. Conéctate para cargarla; no mostraremos alumnos de otra categoría como reemplazo.');
      setLoading(false);
      return;
    }

    setRosterState('loading');
    setRosterMessage('Verificando la categoría y su lista actual con Lestra…');
    try {
      const response = await api.get(`/api/profesores/me/categorias/${categoryId}/asistencia`, { params: { fecha: date } });
      if (requestId !== attendanceRequestRef.current) return;

      const loadedPlayers = Array.isArray(response.data?.data?.jugadores) ? response.data.data.jugadores as Player[] : [];
      const serverAttendance = Object.fromEntries(
        loadedPlayers
          .filter((player) => isAttendanceState(player.estado_asistencia))
          .map((player) => [player.id, player.estado_asistencia as AttendanceState]),
      ) as Record<string, AttendanceState>;
      const filteredDraft = filterAttendanceForPlayers(localDraft, loadedPlayers);
      const filteredDraftCount = Object.keys(filteredDraft).length;

      if (filteredDraftCount !== localDraftCount) writeAttendanceDraft(draftKey, filteredDraft);
      setPlayers(loadedPlayers);
      setAttendance({ ...serverAttendance, ...filteredDraft });
      setDraftSavedCount(filteredDraftCount);
      setRosterState('verified');
      setRosterMessage(filteredDraftCount
        ? `Lista verificada con Lestra. Se recuperó un borrador local con ${filteredDraftCount} registro${filteredDraftCount === 1 ? '' : 's'} de esta categoría y fecha.`
        : 'Lista verificada con Lestra. Puedes registrar asistencia con seguridad para esta categoría y fecha.');
    } catch (error: any) {
      if (requestId !== attendanceRequestRef.current) return;
      setPlayers([]);
      setAttendance(localDraft);
      setRosterState('unavailable');
      setRosterMessage(localDraftCount
        ? `No fue posible verificar la lista. El borrador local con ${localDraftCount} registro${localDraftCount === 1 ? '' : 's'} se conserva, pero no se mezclará con una lista no confirmada.`
        : 'No fue posible verificar la lista. Por seguridad no se conservará en pantalla una categoría anterior.');
      await notify(error.response?.data?.error || 'No fue posible cargar la lista de tu categoría.', { title: profile?.academia.nombre });
    } finally {
      if (requestId === attendanceRequestRef.current) setLoading(false);
    }
  }, [categoryId, contextKey, date, draftKey, notify, profile?.academia.nombre]);

  useEffect(() => {
    if (profile && categoryId) void loadAttendance();
  }, [categoryId, date, profile?.academia.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const reconnected = !previousOnlineRef.current && online;
    previousOnlineRef.current = online;
    if (reconnected && activeTab === 'asistencia' && profile && categoryId && rosterState !== 'verified') void loadAttendance();
  }, [online, activeTab, categoryId, profile, rosterState, loadAttendance]);

  const setStatus = (playerId: string, status: AttendanceState) => {
    if (rosterContext !== contextKey || !players.some((player) => player.id === playerId)) return;
    setAttendance((current) => {
      const next = filterAttendanceForPlayers({ ...current, [playerId]: status }, players);
      writeAttendanceDraft(draftKey, next);
      setDraftSavedCount(Object.keys(next).length);
      return next;
    });
  };

  const markAllPresent = () => {
    if (!players.length || rosterContext !== contextKey) return;
    const next = Object.fromEntries(players.map((player) => [player.id, 'Presente'])) as Record<string, AttendanceState>;
    setAttendance(next);
    writeAttendanceDraft(draftKey, next);
    setDraftSavedCount(players.length);
  };

  const save = async () => {
    if (rosterState !== 'verified' || rosterContext !== contextKey || !players.length) {
      return void notify('La lista de esta categoría todavía no está verificada. Actualízala antes de enviar asistencia.', { title: profile?.academia.nombre });
    }
    const missing = players.filter((player) => !attendance[player.id]);
    if (missing.length) return void notify(`Falta registrar a ${missing.length} alumno${missing.length === 1 ? '' : 's'}.`, { title: profile?.academia.nombre });
    if (!online || !navigator.onLine) return void notify('El borrador está guardado localmente. Lestra no lo enviará hasta recuperar conexión y volver a verificar la lista.', { title: profile?.academia.nombre });
    setSaving(true);
    try {
      const response = await api.post(`/api/profesores/me/categorias/${categoryId}/asistencia`, { fecha: date, asistencias: players.map((player) => ({ jugador_id: player.id, estado: attendance[player.id] })) });
      removeAttendanceDraft(draftKey);
      setDraftSavedCount(0);
      await notify(`✅ ${response.data.message}`, { title: profile?.academia.nombre });
      await loadAttendance();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar. El borrador permanece en este dispositivo.', { title: profile?.academia.nombre });
    } finally {
      setSaving(false);
    }
  };

  const openAttendance = (nextCategoryId: string, nextDate: string) => {
    resetRosterForContextChange();
    setCategoryId(nextCategoryId);
    setDate(nextDate);
    setActiveTool(null);
    setActiveTab('asistencia');
  };

  const registeredCount = useMemo(() => players.filter((player) => isAttendanceState(attendance[player.id])).length, [attendance, players]);
  const currentRosterVerified = rosterState === 'verified' && rosterContext === contextKey;
  const rosterStatusLabel = rosterState === 'loading'
    ? 'Verificando lista'
    : currentRosterVerified
      ? online ? 'Lista verificada' : 'Lista verificada · sin conexión'
      : online ? 'Lista no verificada' : 'Sin conexión · lista no verificada';

  if (loading && !profile) return <div className="py-20 text-center text-[#8b949e]">Preparando tu jornada...</div>;

  if (activeTool?.type === 'live') return <LiveMatchPanel matchId={activeTool.id} academyName={profile?.academia.nombre} onBack={() => setActiveTool(null)} onFinished={() => setActiveTab('hoy')} />;
  if (activeTool?.type === 'training') return <TrainingLogPanel trainingId={activeTool.id} academyName={profile?.academia.nombre} onBack={() => setActiveTool(null)} />;
  if (activeTool?.type === 'preparation') return <MatchPreparationPanel matchId={activeTool.id} academyName={profile?.academia.nombre} onBack={() => setActiveTool(null)} />;

  return (
    <div className="space-y-5 pb-28">
      <section className="overflow-hidden rounded-3xl border border-[#289E9D]/35 bg-[radial-gradient(circle_at_top_right,rgba(49,87,255,.14),transparent_38%),linear-gradient(135deg,#163334,#161b22_55%,#10141c)] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#48d8d0]">Cabina de cancha</p>
            <h1 className="mt-2 text-3xl font-black">Hola, {profile?.profesor.nombre?.split(' ')[0] || 'Profesor'}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#b1bac4]">Tu jornada, tus categorías y las acciones que necesitas en terreno. Dirección mantiene el control de permisos; aquí tú ejecutas.</p>
            <div className="mt-3 flex flex-wrap gap-2">{profile?.categorias.slice(0, 6).map((category) => <span key={category.id} className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-black text-[#c7d1dc]">{category.ramas?.disciplina ? `${category.ramas.disciplina} · ` : ''}{category.nombre}</span>)}</div>
          </div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-orange-500/15 text-orange-300'}`}>{online ? '● En línea' : '● Sin conexión · borradores quedan locales'}</span>
        </div>
      </section>

      <nav aria-label="Funciones del profesor" className="grid grid-cols-3 gap-2 rounded-2xl border border-[#30363d] bg-[#161b22] p-2 lg:grid-cols-6">
        {([
          ['hoy', '⌂ Hoy'],
          ['asistencia', '✓ Asistencia'],
          ['entrenamientos', '✎ Entrenamientos'],
          ['partidos', '⚡ Partidos'],
          ['pizarra', '◇ Pizarra'],
          ['casos', '☏ Casos'],
        ] as [PortalTab, string][]).map(([tab, label]) => <button key={tab} type="button" aria-current={activeTab === tab ? 'page' : undefined} onClick={() => setActiveTab(tab)} className={`min-h-11 rounded-xl px-2 py-2 text-xs font-black transition-colors sm:text-sm ${activeTab === tab ? 'bg-[#289E9D] text-white shadow-lg' : 'text-[#8b949e] hover:bg-[#21262d] hover:text-white'}`}>{label}</button>)}
      </nav>

      {activeTab === 'hoy' ? <ProfessorTodayPanel academyName={profile?.academia.nombre} onAttendance={openAttendance} onTrainingLog={(id) => setActiveTool({ type: 'training', id })} onMatchPreparation={(id) => setActiveTool({ type: 'preparation', id })} onLiveMatch={(id) => setActiveTool({ type: 'live', id })} onCases={() => setActiveTab('casos')} /> : null}
      {activeTab === 'casos' ? <ProfessorCasesPanel categories={profile?.categorias || []} academyName={profile?.academia.nombre} /> : null}
      {activeTab === 'pizarra' ? <ProfessorTacticalBoard categories={profile?.categorias || []} academyName={profile?.academia.nombre} /> : null}
      {activeTab === 'entrenamientos' || activeTab === 'partidos' ? <ProfessorAgendaPanel mode={activeTab} academyName={profile?.academia.nombre} onLiveMatch={(id) => setActiveTool({ type: 'live', id })} onAttendance={openAttendance} /> : null}

      {activeTab === 'asistencia' ? !profile?.categorias.length ? (
        <section className="card border-dashed p-8 text-center"><div className="text-5xl">📋</div><h2 className="mt-4 text-xl font-black">Sin categorías asignadas</h2><p className="mt-2 text-sm text-[#8b949e]">La dirección debe asignarte una categoría antes de comenzar.</p></section>
      ) : (
        <>
          <section className="card p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-4 sm:grid-cols-2">
                <label><span className="label">Categoría / rama</span><select className="w-full" value={categoryId} onChange={(event) => { resetRosterForContextChange(); setCategoryId(event.target.value); }}>{profile.categorias.map((category) => <option key={category.id} value={category.id}>{category.ramas?.disciplina ? `${category.ramas.disciplina} · ` : ''}{category.nombre}</option>)}</select></label>
                <label><span className="label">Fecha</span><input className="w-full" type="date" value={date} onChange={(event) => { resetRosterForContextChange(); setDate(event.target.value); }} max={today()} /></label>
              </div>
              <button type="button" disabled={rosterState === 'loading'} onClick={() => void loadAttendance()} className="min-h-11 rounded-xl border border-[#30363d] px-4 text-sm font-black text-[#b1bac4] disabled:opacity-50">{rosterState === 'loading' ? 'Verificando…' : 'Actualizar lista'}</button>
            </div>
          </section>

          <section aria-live="polite" className={`rounded-2xl border p-4 ${currentRosterVerified ? online ? 'border-emerald-500/25 bg-emerald-500/10' : 'border-orange-500/30 bg-orange-500/10' : 'border-orange-500/30 bg-orange-500/10'}`}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div><p className={`text-xs font-black uppercase tracking-[.1em] ${currentRosterVerified && online ? 'text-emerald-300' : 'text-orange-300'}`}>{rosterStatusLabel}</p><p className="mt-1 text-sm leading-6 text-[#c4ccd4]">{currentRosterVerified && !online ? 'Puedes seguir marcando esta lista ya verificada. Los cambios se guardan localmente y no se enviarán hasta recuperar conexión.' : rosterMessage}</p></div>
              {draftSavedCount ? <span className="w-fit shrink-0 rounded-full border border-white/10 bg-black/15 px-3 py-1 text-xs font-black text-[#d6dde5]">Borrador local · {draftSavedCount}</span> : null}
            </div>
          </section>

          {loading ? <div className="card p-8 text-center text-[#8b949e]">Verificando lista de esta categoría...</div> : null}
          {!loading && currentRosterVerified && !players.length ? <div className="card p-8 text-center text-[#8b949e]">No hay alumnos asignados a esta categoría.</div> : null}
          {!loading && rosterState === 'unavailable' ? <div className="card border-orange-500/25 p-8 text-center"><p className="font-black text-orange-200">Lista no disponible</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#9da8b3]">{rosterMessage}</p>{online ? <button type="button" onClick={() => void loadAttendance()} className="mt-4 min-h-11 rounded-xl border border-[#289E9D]/45 bg-[#289E9D]/10 px-4 text-sm font-black text-[#70e4df]">Reintentar verificación</button> : null}</div> : null}

          {!loading && currentRosterVerified && players.length ? (
            <AttendanceLineup
              players={players}
              attendance={attendance}
              onSetStatus={setStatus}
              onMarkAllPresent={markAllPresent}
              disabled={rosterContext !== contextKey}
            />
          ) : null}

          {players.length ? <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#30363d] bg-[#161b22]/95 p-3 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-3"><p className="hidden flex-1 text-sm text-[#8b949e] sm:block">{registeredCount}/{players.length} registrados{draftSavedCount ? ' · borrador local activo' : ''}</p><button type="button" onClick={() => void save()} disabled={saving || !online || !currentRosterVerified} className="btn-primary w-full py-4 text-base sm:w-auto sm:min-w-64 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando...' : !online ? 'Borrador guardado localmente' : !currentRosterVerified ? 'Lista no verificada' : 'Guardar asistencia'}</button></div></div> : null}
        </>
      ) : null}
    </div>
  );
};

export default ProfesorPortal;

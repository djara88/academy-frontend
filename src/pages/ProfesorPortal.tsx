import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import ProfessorAgendaPanel from '../components/profesor/ProfessorAgendaPanel';
import ProfessorTodayPanel from '../components/profesor/ProfessorTodayPanel';
import ProfessorCasesPanel from '../components/profesor/ProfessorCasesPanel';
import LiveMatchPanel from '../components/profesor/LiveMatchPanel';
import TrainingLogPanel from '../components/profesor/TrainingLogPanel';
import MatchPreparationPanel from '../components/profesor/MatchPreparationPanel';

type Category = { id: string; nombre: string; descripcion?: string | null; rama_id?: string | null; sede_id?: string | null; ramas?: { id: string; nombre: string; disciplina: string } | null; sedes?: { id: string; nombre: string } | null };
type Player = { id: string; nombre: string; posicion_cancha?: string | null; posicion_principal?: string | null; rol_especialidad?: string | null; foto_url?: string | null; avatar_url?: string | null; alerta_medica?: string | null; telefono_emergencia?: string | null; estado_asistencia?: AttendanceState | null };
type AttendanceState = 'Presente' | 'Ausente' | 'Justificado';
type Profile = { profesor: { id: string; nombre: string }; academia: { id: string; nombre: string }; categorias: Category[] };
type PortalTab = 'hoy' | 'asistencia' | 'agenda' | 'bitacoras' | 'partidos' | 'casos';
type ActiveTool = { type: 'training' | 'preparation' | 'live'; id: string } | null;

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const phoneHref = (phone: string) => phone.replace(/[^\d+]/g, '');

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
  const [emergencyPlayerId, setEmergencyPlayerId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<PortalTab>('hoy');
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);

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

  const draftKey = useMemo(() => `syncademia:asistencia:${user?.id || 'profesor'}:${categoryId}:${date}`, [categoryId, date, user?.id]);

  const loadAttendance = useCallback(async () => {
    if (!categoryId) return;
    setLoading(true);
    setEmergencyPlayerId(null);
    try {
      const response = await api.get(`/api/profesores/me/categorias/${categoryId}/asistencia`, { params: { fecha: date } });
      const loadedPlayers = response.data.data.jugadores as Player[];
      setPlayers(loadedPlayers);
      const serverAttendance = Object.fromEntries(loadedPlayers.filter((player) => player.estado_asistencia).map((player) => [player.id, player.estado_asistencia]));
      const draft = localStorage.getItem(draftKey);
      setAttendance(draft ? { ...serverAttendance, ...JSON.parse(draft) } : serverAttendance);
    } catch (error: any) {
      const draft = localStorage.getItem(draftKey);
      if (draft) setAttendance(JSON.parse(draft));
      await notify(error.response?.data?.error || 'No fue posible cargar la lista de tu categoría.', { title: profile?.academia.nombre });
    } finally {
      setLoading(false);
    }
  }, [categoryId, date, draftKey, notify, profile?.academia.nombre]);

  useEffect(() => { if (profile && categoryId) void loadAttendance(); }, [categoryId, date, profile?.academia.id]);

  const setStatus = (playerId: string, status: AttendanceState) => {
    setAttendance((current) => {
      const next = { ...current, [playerId]: status };
      localStorage.setItem(draftKey, JSON.stringify(next));
      return next;
    });
  };

  const markAllPresent = () => {
    const next = Object.fromEntries(players.map((player) => [player.id, 'Presente'])) as Record<string, AttendanceState>;
    setAttendance(next);
    localStorage.setItem(draftKey, JSON.stringify(next));
  };

  const save = async () => {
    const missing = players.filter((player) => !attendance[player.id]);
    if (missing.length) return void notify(`Falta registrar a ${missing.length} alumno${missing.length === 1 ? '' : 's'}.`, { title: profile?.academia.nombre });
    if (!online) return void notify('Tu borrador está guardado en este dispositivo. Conéctate a internet para enviarlo.', { title: profile?.academia.nombre });
    setSaving(true);
    try {
      const response = await api.post(`/api/profesores/me/categorias/${categoryId}/asistencia`, { fecha: date, asistencias: players.map((player) => ({ jugador_id: player.id, estado: attendance[player.id] })) });
      localStorage.removeItem(draftKey);
      await notify(`✅ ${response.data.message}`, { title: profile?.academia.nombre });
      await loadAttendance();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar. El borrador permanece en este dispositivo.', { title: profile?.academia.nombre });
    } finally {
      setSaving(false);
    }
  };

  const openAttendance = (nextCategoryId: string, nextDate: string) => {
    setCategoryId(nextCategoryId);
    setDate(nextDate);
    setActiveTool(null);
    setActiveTab('asistencia');
  };

  const counts = useMemo(() => ({
    presente: Object.values(attendance).filter((status) => status === 'Presente').length,
    ausente: Object.values(attendance).filter((status) => status === 'Ausente').length,
    justificado: Object.values(attendance).filter((status) => status === 'Justificado').length,
  }), [attendance]);

  if (loading && !profile) return <div className="py-20 text-center text-[#8b949e]">Preparando tu jornada...</div>;

  if (activeTool?.type === 'live') return <LiveMatchPanel matchId={activeTool.id} academyName={profile?.academia.nombre} onBack={() => setActiveTool(null)} onFinished={() => setActiveTab('hoy')} />;
  if (activeTool?.type === 'training') return <TrainingLogPanel trainingId={activeTool.id} academyName={profile?.academia.nombre} onBack={() => setActiveTool(null)} />;
  if (activeTool?.type === 'preparation') return <MatchPreparationPanel matchId={activeTool.id} academyName={profile?.academia.nombre} onBack={() => setActiveTool(null)} />;

  return (
    <div className="space-y-5 pb-28">
      <section className="overflow-hidden rounded-3xl border border-[#289E9D]/35 bg-[radial-gradient(circle_at_top_right,rgba(49,87,255,.14),transparent_38%),linear-gradient(135deg,#163334,#161b22_55%,#10141c)] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#48d8d0]">Cabina de cancha</p><h1 className="mt-2 text-3xl font-black">Hola, {profile?.profesor.nombre?.split(' ')[0] || 'Profesor'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[#b1bac4]">Tu jornada, tus categorías y las acciones que necesitas en terreno. Dirección mantiene el control de permisos; aquí tú ejecutas.</p><div className="mt-3 flex flex-wrap gap-2">{profile?.categorias.slice(0, 6).map((category) => <span key={category.id} className="rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-[10px] font-black text-[#c7d1dc]">{category.ramas?.disciplina ? `${category.ramas.disciplina} · ` : ''}{category.nombre}</span>)}</div></div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-orange-500/15 text-orange-300'}`}>{online ? '● En línea' : '● Sin conexión · asistencia queda local'}</span>
        </div>
      </section>

      <nav aria-label="Funciones del profesor" className="grid grid-cols-3 gap-2 rounded-2xl border border-[#30363d] bg-[#161b22] p-2 lg:grid-cols-6">
        {([
          ['hoy', '⌂ Hoy'],
          ['asistencia', '✓ Lista'],
          ['agenda', '▣ Agenda'],
          ['bitacoras', '✎ Entrenos'],
          ['partidos', '⚡ Partidos'],
          ['casos', '☏ Casos'],
        ] as [PortalTab, string][]).map(([tab, label]) => <button key={tab} type="button" aria-current={activeTab === tab ? 'page' : undefined} onClick={() => setActiveTab(tab)} className={`min-h-11 rounded-xl px-2 py-2 text-xs font-black transition-colors sm:text-sm ${activeTab === tab ? 'bg-[#289E9D] text-white shadow-lg' : 'text-[#8b949e] hover:bg-[#21262d] hover:text-white'}`}>{label}</button>)}
      </nav>

      {activeTab === 'hoy' ? <ProfessorTodayPanel academyName={profile?.academia.nombre} onAttendance={openAttendance} onTrainingLog={(id) => setActiveTool({ type: 'training', id })} onMatchPreparation={(id) => setActiveTool({ type: 'preparation', id })} onLiveMatch={(id) => setActiveTool({ type: 'live', id })} onCases={() => setActiveTab('casos')} /> : null}

      {activeTab === 'casos' ? <ProfessorCasesPanel categories={profile?.categorias || []} academyName={profile?.academia.nombre} /> : null}

      {activeTab === 'agenda' || activeTab === 'bitacoras' || activeTab === 'partidos' ? <ProfessorAgendaPanel mode={activeTab} academyName={profile?.academia.nombre} onLiveMatch={(id) => setActiveTool({ type: 'live', id })} onAttendance={openAttendance} /> : null}

      {activeTab === 'asistencia' ? !profile?.categorias.length ? <section className="card border-dashed p-8 text-center"><div className="text-5xl">📋</div><h2 className="mt-4 text-xl font-black">Sin categorías asignadas</h2><p className="mt-2 text-sm text-[#8b949e]">La dirección debe asignarte una categoría antes de comenzar.</p></section> : (
        <>
          <section className="card p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div className="grid flex-1 gap-4 sm:grid-cols-2"><label><span className="label">Categoría / rama</span><select className="w-full" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{profile.categorias.map((category) => <option key={category.id} value={category.id}>{category.ramas?.disciplina ? `${category.ramas.disciplina} · ` : ''}{category.nombre}</option>)}</select></label><label><span className="label">Fecha</span><input className="w-full" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={today()} /></label></div><button type="button" onClick={() => void loadAttendance()} className="min-h-11 rounded-xl border border-[#30363d] px-4 text-sm font-black text-[#b1bac4]">Actualizar lista</button></div>
          </section>

          <section className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-center"><p className="text-2xl font-black text-emerald-300">{counts.presente}</p><p className="text-xs text-emerald-200/70">Presentes</p></div>
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-center"><p className="text-2xl font-black text-red-300">{counts.ausente}</p><p className="text-xs text-red-200/70">Ausentes</p></div>
            <div className="rounded-2xl border border-orange-500/25 bg-orange-500/10 p-3 text-center"><p className="text-2xl font-black text-orange-300">{counts.justificado}</p><p className="text-xs text-orange-200/70">Justificados</p></div>
          </section>

          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Lista del entrenamiento</h2><p className="text-sm text-[#8b949e]">{players.length} alumnos · el sistema reutiliza la sesión programada del día</p></div><button type="button" onClick={markAllPresent} className="rounded-lg border border-emerald-500/40 px-3 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10">Todos presentes</button></div>

          {loading ? <div className="card p-8 text-center text-[#8b949e]">Cargando lista...</div> : null}
          {!loading && !players.length ? <div className="card p-8 text-center text-[#8b949e]">No hay alumnos asignados a esta categoría.</div> : null}
          <section className="space-y-3">
            {players.map((player) => {
              const status = attendance[player.id];
              const photo = player.foto_url || player.avatar_url;
              const hasEmergencyInfo = Boolean(player.alerta_medica || player.telefono_emergencia);
              const emergencyOpen = emergencyPlayerId === player.id;
              const emergencyId = `emergencia-${player.id}`;
              return <article key={player.id} className="card p-4"><div className="mb-4 flex items-center gap-3">{photo ? <img src={photo} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#289E9D]/15 font-black text-[#48d8d0]">{player.nombre.slice(0, 1)}</div>}<div className="min-w-0"><h3 className="truncate font-black">{player.nombre}</h3><p className="text-xs text-[#8b949e]">{player.rol_especialidad || player.posicion_principal || player.posicion_cancha || 'Sin posición registrada'}</p></div></div><div className="grid grid-cols-3 gap-2">{(['Presente', 'Ausente', 'Justificado'] as AttendanceState[]).map((option) => <button key={option} type="button" onClick={() => setStatus(player.id, option)} className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-bold sm:text-sm ${status === option ? option === 'Presente' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : option === 'Ausente' ? 'border-red-400 bg-red-500/20 text-red-200' : 'border-orange-400 bg-orange-500/20 text-orange-200' : 'border-[#30363d] bg-[#0d1117] text-[#8b949e]'}`}>{option}</button>)}</div>{hasEmergencyInfo ? <div className="mt-3 border-t border-[#30363d] pt-3"><button type="button" aria-expanded={emergencyOpen} aria-controls={emergencyId} onClick={() => setEmergencyPlayerId(emergencyOpen ? null : player.id)} className={`flex min-h-11 w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm font-black transition-colors ${player.alerta_medica ? 'border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/15' : 'border-[#289E9D]/40 bg-[#289E9D]/10 text-[#70e4df] hover:bg-[#289E9D]/15'}`}><span>{player.alerta_medica ? '⚕ Alerta médica' : '☎ Contacto de emergencia'}</span><span className="text-xs font-bold opacity-80">{emergencyOpen ? 'Ocultar' : 'Ver'}</span></button>{emergencyOpen ? <div id={emergencyId} role="region" aria-label={`Información de emergencia de ${player.nombre}`} className="mt-2 rounded-xl border border-[#30363d] bg-[#0d1117] p-3">{player.alerta_medica ? <div><p className="text-xs font-black uppercase tracking-wide text-red-300">Alerta médica</p><p className="mt-1 text-sm text-[#f0f6fc]">{player.alerta_medica}</p></div> : null}{player.telefono_emergencia ? <a href={`tel:${phoneHref(player.telefono_emergencia)}`} className={`flex min-h-11 items-center justify-center rounded-lg border border-[#289E9D]/40 bg-[#289E9D]/10 px-3 py-2 text-sm font-black text-[#70e4df] hover:bg-[#289E9D]/20 ${player.alerta_medica ? 'mt-3' : ''}`}>☎ Llamar al {player.telefono_emergencia}</a> : <p className="mt-3 text-xs text-[#8b949e]">No hay un teléfono de emergencia registrado.</p>}</div> : null}</div> : null}</article>;
            })}
          </section>

          {players.length ? <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#30363d] bg-[#161b22]/95 p-3 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-3"><p className="hidden flex-1 text-sm text-[#8b949e] sm:block">{Object.keys(attendance).length}/{players.length} registrados</p><button type="button" onClick={() => void save()} disabled={saving} className="btn-primary w-full py-4 text-base sm:w-auto sm:min-w-64 disabled:opacity-50">{saving ? 'Guardando...' : online ? 'Guardar asistencia' : 'Borrador sin enviar'}</button></div></div> : null}
        </>
      ) : null}
    </div>
  );
};

export default ProfesorPortal;

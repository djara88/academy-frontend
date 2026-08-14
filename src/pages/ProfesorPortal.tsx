import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';

type Category = { id: string; nombre: string; descripcion?: string | null };
type Player = { id: string; nombre: string; posicion_cancha?: string | null; posicion_principal?: string | null; foto_url?: string | null; avatar_url?: string | null; estado_asistencia?: AttendanceState | null };
type AttendanceState = 'Presente' | 'Ausente' | 'Justificado';
type Profile = { profesor: { id: string; nombre: string }; academia: { id: string; nombre: string }; categorias: Category[] };

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

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

  useEffect(() => { void loadAttendance(); }, [loadAttendance]);

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
    if (missing.length) return void notify(`Falta registrar a ${missing.length} jugador${missing.length === 1 ? '' : 'es'}.`, { title: profile?.academia.nombre });
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

  const counts = useMemo(() => ({
    presente: Object.values(attendance).filter((status) => status === 'Presente').length,
    ausente: Object.values(attendance).filter((status) => status === 'Ausente').length,
    justificado: Object.values(attendance).filter((status) => status === 'Justificado').length,
  }), [attendance]);

  if (loading && !profile) return <div className="py-20 text-center text-[#8b949e]">Preparando tu jornada...</div>;

  return (
    <div className="space-y-5 pb-28">
      <section className="overflow-hidden rounded-3xl border border-[#289E9D]/35 bg-gradient-to-br from-[#163334] via-[#161b22] to-[#10141c] p-5 sm:p-7">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#48d8d0]">Jornada de terreno</p><h1 className="mt-2 text-3xl font-black">Hola, {profile?.profesor.nombre?.split(' ')[0] || 'Profesor'}</h1><p className="mt-2 text-sm text-[#b1bac4]">Solo ves la información operativa de tus categorías.</p></div>
          <span className={`w-fit rounded-full px-3 py-1.5 text-xs font-bold ${online ? 'bg-emerald-500/15 text-emerald-300' : 'bg-orange-500/15 text-orange-300'}`}>{online ? '● En línea' : '● Sin conexión · borrador local'}</span>
        </div>
      </section>

      {!profile?.categorias.length ? <section className="card border-dashed p-8 text-center"><div className="text-5xl">📋</div><h2 className="mt-4 text-xl font-black">Sin categorías asignadas</h2><p className="mt-2 text-sm text-[#8b949e]">La dirección debe asignarte una categoría antes de comenzar.</p></section> : (
        <>
          <section className="card p-4 sm:p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="label">Categoría</span><select className="w-full" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>{profile.categorias.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
              <label><span className="label">Fecha</span><input className="w-full" type="date" value={date} onChange={(event) => setDate(event.target.value)} max={today()} /></label>
            </div>
          </section>

          <section className="grid grid-cols-3 gap-2 sm:gap-4">
            <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-center"><p className="text-2xl font-black text-emerald-300">{counts.presente}</p><p className="text-xs text-emerald-200/70">Presentes</p></div>
            <div className="rounded-2xl border border-red-500/25 bg-red-500/10 p-3 text-center"><p className="text-2xl font-black text-red-300">{counts.ausente}</p><p className="text-xs text-red-200/70">Ausentes</p></div>
            <div className="rounded-2xl border border-orange-500/25 bg-orange-500/10 p-3 text-center"><p className="text-2xl font-black text-orange-300">{counts.justificado}</p><p className="text-xs text-orange-200/70">Justificados</p></div>
          </section>

          <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-black">Lista del plantel</h2><p className="text-sm text-[#8b949e]">{players.length} jugadores</p></div><button type="button" onClick={markAllPresent} className="rounded-lg border border-emerald-500/40 px-3 py-2 text-sm font-bold text-emerald-300 hover:bg-emerald-500/10">Todos presentes</button></div>

          {loading ? <div className="card p-8 text-center text-[#8b949e]">Cargando lista...</div> : null}
          {!loading && !players.length ? <div className="card p-8 text-center text-[#8b949e]">No hay jugadores asignados a esta categoría.</div> : null}
          <section className="space-y-3">
            {players.map((player) => {
              const status = attendance[player.id];
              const photo = player.foto_url || player.avatar_url;
              return <article key={player.id} className="card p-4"><div className="mb-4 flex items-center gap-3">{photo ? <img src={photo} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#289E9D]/15 font-black text-[#48d8d0]">{player.nombre.slice(0, 1)}</div>}<div className="min-w-0"><h3 className="truncate font-black">{player.nombre}</h3><p className="text-xs text-[#8b949e]">{player.posicion_principal || player.posicion_cancha || 'Jugador'}</p></div></div><div className="grid grid-cols-3 gap-2">{(['Presente', 'Ausente', 'Justificado'] as AttendanceState[]).map((option) => <button key={option} type="button" onClick={() => setStatus(player.id, option)} className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-bold sm:text-sm ${status === option ? option === 'Presente' ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200' : option === 'Ausente' ? 'border-red-400 bg-red-500/20 text-red-200' : 'border-orange-400 bg-orange-500/20 text-orange-200' : 'border-[#30363d] bg-[#0d1117] text-[#8b949e]'}`}>{option}</button>)}</div></article>;
            })}
          </section>

          {players.length ? <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#30363d] bg-[#161b22]/95 p-3 backdrop-blur"><div className="mx-auto flex max-w-5xl items-center gap-3"><p className="hidden flex-1 text-sm text-[#8b949e] sm:block">{Object.keys(attendance).length}/{players.length} registrados</p><button type="button" onClick={() => void save()} disabled={saving} className="btn-primary w-full py-4 text-base sm:w-auto sm:min-w-64 disabled:opacity-50">{saving ? 'Guardando...' : online ? 'Guardar asistencia' : 'Borrador sin enviar'}</button></div></div> : null}
        </>
      )}
    </div>
  );
};

export default ProfesorPortal;

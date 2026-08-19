import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type Branch = { id: string; nombre: string; disciplina: string; sede_id: string; sedes?: { id: string; nombre: string } | null };
type Category = { id: string; nombre: string; rama_id?: string | null; sede_id?: string | null; ramas?: { id: string; nombre: string; disciplina: string } | null };
type Tournament = {
  id: string;
  nombre: string;
  rama_id?: string | null;
  tipo_gestion?: 'externo' | 'organizado';
  formato_competencia?: string;
  estructura_estado?: string;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
};
type TournamentDivision = { id: string; nombre: string; categoria_id?: string | null; modalidad?: string | null };
type TournamentPhase = { id: string; nombre: string; tipo: string; division_id?: string | null; orden: number };
type TournamentStructure = { torneo: Tournament; divisiones: TournamentDivision[]; fases: TournamentPhase[] };
type Metric = { code: string; label: string; unit?: string | null; decimals?: number };
type EventUi = {
  conditionMode: 'required' | 'optional' | 'hidden';
  equipmentMode: 'uniform' | 'freeform';
  equipmentLabel: string;
  equipmentPlaceholder?: string | null;
};
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
};
type Match = {
  id: string;
  torneo_id?: string | null;
  torneo_division_id?: string | null;
  torneo_fase_id?: string | null;
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
  torneos?: { id?: string; nombre: string; tipo_gestion?: 'externo' | 'organizado'; formato_competencia?: string } | null;
  torneo_divisiones?: TournamentDivision | null;
  torneo_fases?: TournamentPhase | null;
  categorias?: { id?: string; nombre: string } | null;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
  sedes?: { id: string; nombre: string } | null;
  sport_profile: SportProfile;
};
type PlayerStat = {
  jugador_id: string;
  nombre: string;
  foto_base64?: string | null;
  metricas_competitivas: Record<string, number>;
  es_mvp: boolean;
};

const panel = 'rounded-[24px] border border-white/10 bg-[#151b25]';
const field = 'w-full rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2.5 text-sm text-white outline-none focus:border-[#289E9D]';
const blankForm = {
  rama_id: '',
  categoria_id: '',
  torneo_id: '',
  torneo_division_id: '',
  torneo_fase_id: '',
  es_amistoso: false,
  rival: '',
  fecha: '',
  hora: '12:00',
  hora_citacion: '11:00',
  ubicacion: '',
  link_maps: '',
  color_uniforme: 'Titular',
  condicion: 'Local',
  cobra_arbitraje: false,
  monto_arbitraje_jugador: '0',
};
const defaultEventUi: EventUi = {
  conditionMode: 'optional',
  equipmentMode: 'freeform',
  equipmentLabel: 'Indumentaria / equipamiento',
  equipmentPlaceholder: 'Equipamiento o implementación requerida',
};
const legacyUniformValues = new Set(['Principal', 'Titular', 'Visita', 'Ambas', 'Ambas (Llevar ambos)', 'Indumentaria principal']);

export default function PartidosMultirama() {
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
  const [tournamentStructure, setTournamentStructure] = useState<TournamentStructure | null>(null);
  const [structureLoading, setStructureLoading] = useState(false);
  const [statsMatch, setStatsMatch] = useState<Match | null>(null);
  const [stats, setStats] = useState<PlayerStat[]>([]);
  const [score, setScore] = useState({ favor: '0', contra: '0' });
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
      await notify(error.response?.data?.error || 'No fue posible cargar los encuentros.');
    } finally {
      setLoading(false);
    }
  }, [branchId, notify, requestedTournamentId]);

  useEffect(() => { void load(); }, [load]);

  const branchCategories = useMemo(
    () => categories.filter((category) => !form.rama_id || category.rama_id === form.rama_id),
    [categories, form.rama_id],
  );
  const branchTournaments = useMemo(
    () => tournaments.filter((tournament) => !form.rama_id || !tournament.rama_id || tournament.rama_id === form.rama_id),
    [tournaments, form.rama_id],
  );
  const selectedBranch = branches.find((branch) => branch.id === form.rama_id) || null;
  const selectedTournament = branchTournaments.find((tournament) => tournament.id === form.torneo_id) || null;
  const organizedTournament = selectedTournament?.tipo_gestion === 'organizado';
  const availableDivisions = useMemo(
    () => (tournamentStructure?.divisiones || []).filter(
      (division) => !division.categoria_id || !form.categoria_id || division.categoria_id === form.categoria_id,
    ),
    [tournamentStructure, form.categoria_id],
  );
  const availablePhases = useMemo(
    () => (tournamentStructure?.fases || []).filter((phase) => phase.division_id === form.torneo_division_id),
    [tournamentStructure, form.torneo_division_id],
  );
  const formEventUi = formProfile?.eventUi || defaultEventUi;

  const applyProfile = (profile: SportProfile | null) => {
    setFormProfile(profile);
    const ui = profile?.eventUi || defaultEventUi;
    setForm((current) => {
      const currentEquipment = String(current.color_uniforme || '').trim();
      const color_uniforme = ui.equipmentMode === 'uniform'
        ? (legacyUniformValues.has(currentEquipment) ? (currentEquipment === 'Principal' ? 'Titular' : currentEquipment) : 'Titular')
        : (legacyUniformValues.has(currentEquipment) ? '' : currentEquipment);
      const condicion = ui.conditionMode === 'hidden'
        ? 'Evento'
        : ui.conditionMode === 'required'
          ? (['Local', 'Visita'].includes(current.condicion) ? current.condicion : 'Local')
          : (['Local', 'Visita', 'Evento'].includes(current.condicion) ? current.condicion : 'Evento');
      return { ...current, color_uniforme, condicion };
    });
  };

  const loadBranchProfile = async (ramaId: string) => {
    if (!ramaId) { applyProfile(null); return; }
    setProfileLoading(true);
    try {
      const response = await api.get('/api/sport-profiles', { params: { rama_id: ramaId } });
      applyProfile(response.data?.data?.competitive || null);
    } catch (error) {
      console.error('No fue posible cargar el perfil competitivo:', error);
      applyProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  const loadTournamentStructure = async (tournamentId: string, preferredDivision = '', preferredPhase = '') => {
    const tournament = tournaments.find((item) => item.id === tournamentId) || null;
    if (!tournamentId || tournament?.tipo_gestion !== 'organizado') {
      setTournamentStructure(null);
      setForm((current) => ({ ...current, torneo_division_id: '', torneo_fase_id: '' }));
      return;
    }
    setStructureLoading(true);
    try {
      const response = await api.get(`/api/torneos/${tournamentId}/estructura`);
      const data = response.data.data as TournamentStructure;
      setTournamentStructure(data);
      setForm((current) => ({
        ...current,
        torneo_division_id: preferredDivision && data.divisiones.some((item) => item.id === preferredDivision) ? preferredDivision : '',
        torneo_fase_id: preferredPhase && data.fases.some((item) => item.id === preferredPhase) ? preferredPhase : '',
      }));
    } catch (error: any) {
      setTournamentStructure(null);
      await notify(error.response?.data?.error || 'No fue posible cargar la estructura del campeonato.');
    } finally {
      setStructureLoading(false);
    }
  };

  const openCreate = () => {
    const requestedTournament = tournaments.find((item) => item.id === requestedTournamentId) || null;
    const initialBranch = requestedTournament?.rama_id || branchId || branches[0]?.id || '';
    setEditing(null);
    setTournamentStructure(null);
    setForm({ ...blankForm, rama_id: initialBranch, torneo_id: requestedTournament?.id || '' });
    setFormProfile(null);
    setModalOpen(true);
    if (initialBranch) void loadBranchProfile(initialBranch);
  };

  const openEdit = (match: Match) => {
    setEditing(match);
    setTournamentStructure(null);
    setForm({
      rama_id: match.rama_id || '',
      categoria_id: match.categoria_id || '',
      torneo_id: match.torneo_id || '',
      torneo_division_id: match.torneo_division_id || '',
      torneo_fase_id: match.torneo_fase_id || '',
      es_amistoso: match.es_amistoso,
      rival: match.rival || '',
      fecha: match.fecha || '',
      hora: String(match.hora || '').slice(0, 5) || '12:00',
      hora_citacion: String(match.hora_citacion || '').slice(0, 5) || '11:00',
      ubicacion: match.ubicacion || '',
      link_maps: match.link_maps || '',
      color_uniforme: match.color_uniforme || '',
      condicion: match.condicion || 'Evento',
      cobra_arbitraje: Boolean(match.cobra_arbitraje),
      monto_arbitraje_jugador: String(match.monto_arbitraje_jugador || 0),
    });
    applyProfile(match.sport_profile || null);
    setModalOpen(true);
    if (match.torneo_id) void loadTournamentStructure(match.torneo_id, match.torneo_division_id || '', match.torneo_fase_id || '');
  };

  const changeBranch = (next: string) => {
    setTournamentStructure(null);
    setForm((current) => ({ ...current, rama_id: next, categoria_id: '', torneo_id: '', torneo_division_id: '', torneo_fase_id: '' }));
    void loadBranchProfile(next);
  };
  const changeCategory = (next: string) => setForm((current) => ({ ...current, categoria_id: next, torneo_division_id: '', torneo_fase_id: '' }));
  const changeTournament = (next: string) => {
    setForm((current) => ({ ...current, torneo_id: next, torneo_division_id: '', torneo_fase_id: '' }));
    void loadTournamentStructure(next);
  };
  const toggleFriendly = (checked: boolean) => {
    if (checked) setTournamentStructure(null);
    setForm((current) => ({ ...current, es_amistoso: checked, torneo_id: checked ? '' : current.torneo_id, torneo_division_id: '', torneo_fase_id: '' }));
  };

  const saveMatch = async () => {
    if (!form.rama_id || !form.categoria_id || !form.rival.trim() || !form.fecha || !form.hora) {
      return void notify('Rama, categoría, rival/evento, fecha y hora son obligatorios.');
    }
    if (!form.es_amistoso && organizedTournament && (!form.torneo_division_id || !form.torneo_fase_id)) {
      return void notify('Selecciona la división y fase del encuentro dentro del campeonato organizado.');
    }
    try {
      const body = { ...form, monto_arbitraje_jugador: Number(form.monto_arbitraje_jugador) || 0 };
      if (editing) await api.put(`/api/partidos/${editing.id}`, body);
      else await api.post('/api/partidos', body);
      setModalOpen(false);
      await load();
      await notify(editing ? 'Evento actualizado.' : 'Evento competitivo creado.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar el encuentro.');
    }
  };

  const sendCitation = async (match: Match) => {
    const accepted = await confirmAction(
      `Se citará únicamente a los alumnos con inscripción activa en ${match.ramas?.nombre || 'esta rama'} y ${match.categorias?.nombre || 'esta categoría'}.`,
      { confirmLabel: 'Enviar citación' },
    );
    if (!accepted) return;
    try {
      const response = await api.post(`/api/partidos/${match.id}/citacion`);
      await notify(response.data.message || 'Citaciones enviadas.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible enviar citaciones.');
    }
  };

  const remove = async (match: Match) => {
    const accepted = await confirmAction(`¿Eliminar este ${match.sport_profile?.activityLabel?.toLowerCase() || 'evento'}: ${match.rival}?`, { tone: 'danger', confirmLabel: 'Eliminar' });
    if (!accepted) return;
    try {
      await api.delete(`/api/partidos/${match.id}`);
      await load();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible eliminar el encuentro.');
    }
  };

  const openStats = async (match: Match) => {
    try {
      const response = await api.get(`/api/partidos/${match.id}/estadisticas`);
      setStatsMatch(match);
      setStats((response.data.data || []).map((item: PlayerStat) => ({ ...item, metricas_competitivas: item.metricas_competitivas || {} })));
      setScore({ favor: String(match.goles_favor || 0), contra: String(match.goles_contra || 0) });
      setSendReport(false);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar las estadísticas.');
    }
  };

  const changeMetric = (playerId: string, code: string, value: string) => setStats((current) => current.map((item) => (
    item.jugador_id === playerId
      ? { ...item, metricas_competitivas: { ...item.metricas_competitivas, [code]: Number(value) || 0 } }
      : item
  )));
  const setMvp = (playerId: string) => setStats((current) => current.map((item) => ({ ...item, es_mvp: item.jugador_id === playerId })));

  const saveStats = async () => {
    if (!statsMatch) return;
    setSavingStats(true);
    try {
      await api.post(`/api/partidos/${statsMatch.id}/guardar-resultado`, {
        resultado_favor: Number(score.favor) || 0,
        resultado_contra: Number(score.contra) || 0,
        enviarWhatsapp: sendReport,
        estadisticas: stats.map((item) => ({
          jugador_id: item.jugador_id,
          metricas_competitivas: item.metricas_competitivas,
          es_mvp: item.es_mvp,
        })),
      });
      setStatsMatch(null);
      await load();
      await notify(sendReport ? 'Resultado guardado e informes enviados.' : 'Resultado guardado.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar el resultado.');
    } finally {
      setSavingStats(false);
    }
  };

  return <div className="mx-auto max-w-7xl space-y-6 pb-16">
    <section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.17),transparent_38%),#151b25] p-6 sm:p-7">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[.18em] text-[#70e4df]">Eventos multideporte</p>
          <h1 className="mt-2 text-3xl font-black text-white">Competencias y resultados</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">Cada campeonato agrupa los eventos donde participa la academia. Lestra adapta cada evento y sus resultados a la disciplina: partido, duelo, prueba, carrera o presentación.</p>
        </div>
        <button onClick={openCreate} className="rounded-xl bg-[#289E9D] px-5 py-2.5 text-sm font-black text-white">+ Nuevo evento</button>
      </div>
    </section>

    <section className={`${panel} p-4`}>
      <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className={`${field} max-w-lg`}>
        <option value="">Todas las ramas</option>
        {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}{branch.sedes?.nombre ? ` · ${branch.sedes.nombre}` : ''}</option>)}
      </select>
    </section>

    {loading
      ? <div className={`${panel} p-10 text-center text-[#8b949e]`}>Cargando eventos...</div>
      : <section className="grid gap-4 lg:grid-cols-2">
          {matches.map((match) => <article key={match.id} className={`${panel} overflow-hidden`}>
            <div className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-violet-500/10 px-2.5 py-1 text-[10px] font-black uppercase text-violet-300">{match.ramas?.disciplina || match.sport_profile?.label || 'Histórico'}</span>
                    <span className="rounded-full bg-[#289E9D]/10 px-2.5 py-1 text-[10px] font-black uppercase text-[#70e4df]">{match.sport_profile?.activityLabel || 'Evento'}</span>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${match.estado === 'Jugado' ? 'bg-emerald-500/10 text-emerald-300' : 'bg-[#289E9D]/10 text-[#70e4df]'}`}>{match.estado}</span>
                  </div>
                  <h2 className="mt-3 text-xl font-black text-white">{match.sport_profile?.icon || '🏅'} {match.rival}</h2>
                  <p className="mt-1 text-xs text-[#8b949e]">{match.ramas?.nombre || 'Sin rama'} · {match.categorias?.nombre || 'Sin categoría'}{match.torneos?.nombre ? ` · ${match.torneos.nombre}` : ' · Amistoso/actividad'}{match.torneo_divisiones?.nombre ? ` · ${match.torneo_divisiones.nombre}` : ''}{match.torneo_fases?.nombre ? ` · ${match.torneo_fases.nombre}` : ''}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-white">{match.fecha}</p>
                  <p className="text-xs text-[#8995a4]">{String(match.hora || '').slice(0, 5)} hrs</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[9px] uppercase text-[#697586]">Citación</p><p className="text-sm font-black text-white">{String(match.hora_citacion || '').slice(0, 5) || '—'}</p></div>
                {match.sport_profile?.eventUi?.conditionMode !== 'hidden' ? <div className="rounded-xl bg-[#0d1117] p-3"><p className="text-[9px] uppercase text-[#697586]">Condición</p><p className="text-sm font-black text-white">{match.condicion || '—'}</p></div> : null}
                <div className={`rounded-xl bg-[#0d1117] p-3 ${match.sport_profile?.eventUi?.conditionMode === 'hidden' ? 'col-span-1 sm:col-span-3' : 'sm:col-span-2'}`}><p className="text-[9px] uppercase text-[#697586]">Lugar</p><p className="truncate text-sm font-black text-white">{match.ubicacion || 'Por confirmar'}</p></div>
              </div>
              {match.estado === 'Jugado' && match.sport_profile?.usesHeadToHeadScore ? <div className="mt-4 rounded-xl border border-emerald-400/15 bg-emerald-500/10 p-3 text-center text-lg font-black text-emerald-200">{match.goles_favor || 0} — {match.goles_contra || 0}</div> : null}
            </div>
            <div className="flex flex-wrap gap-2 border-t border-white/10 p-4">
              <button onClick={() => void sendCitation(match)} disabled={match.estado === 'Jugado'} className="rounded-xl border border-[#289E9D]/30 px-3 py-2 text-xs font-black text-[#70e4df] disabled:opacity-30">Enviar citación</button>
              <button onClick={() => void openStats(match)} className="rounded-xl border border-[#C8A96B]/30 px-3 py-2 text-xs font-black text-[#D8BE87]">{match.estado === 'Jugado' ? 'Ver/editar resultado' : 'Registrar resultado'}</button>
              <button onClick={() => openEdit(match)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-[#c3ccd6]">Editar</button>
              <button onClick={() => void remove(match)} className="ml-auto rounded-xl border border-red-400/15 px-3 py-2 text-xs font-black text-red-300">Eliminar</button>
            </div>
          </article>)}
          {!matches.length ? <div className={`${panel} col-span-full p-10 text-center text-sm text-[#697586]`}>No hay eventos competitivos en el alcance seleccionado.</div> : null}
        </section>}

    {modalOpen ? <div className="fixed inset-0 z-[70] grid place-items-center bg-black/80 p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[26px] border border-white/10 bg-[#151b25] p-6">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-black uppercase text-[#70e4df]">{editing ? 'Editar' : 'Nuevo'} {formProfile?.activityLabel?.toLowerCase() || 'evento competitivo'}</p><h2 className="mt-1 text-2xl font-black text-white">Contexto deportivo</h2></div>
          <button onClick={() => setModalOpen(false)} className="text-2xl text-[#8995a4]">×</button>
        </div>
        <div className="mt-5 space-y-4">
          <select value={form.rama_id} onChange={(event) => changeBranch(event.target.value)} className={field}>
            <option value="">Selecciona rama *</option>
            {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.disciplina} · {branch.nombre}</option>)}
          </select>
          {selectedBranch ? <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 p-3 text-sm text-violet-200">Perfil competitivo: <strong>{formProfile?.label || selectedBranch.disciplina}</strong>. Lestra adapta este evento, su equipamiento y sus métricas a la disciplina; categorías y campeonatos de otras ramas quedan bloqueados.</div> : null}
          <select value={form.categoria_id} onChange={(event) => changeCategory(event.target.value)} className={field}>
            <option value="">Categoría *</option>
            {branchCategories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
          </select>
          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm font-bold">
            <input type="checkbox" checked={form.es_amistoso} onChange={(event) => toggleFriendly(event.target.checked)} />
            Evento independiente / fuera de campeonato
          </label>

          {!form.es_amistoso ? <>
            <select value={form.torneo_id} onChange={(event) => changeTournament(event.target.value)} className={field}>
              <option value="">Campeonato / competencia</option>
              {branchTournaments.filter((item) => item.rama_id === form.rama_id).map((item) => <option key={item.id} value={item.id}>{item.nombre}</option>)}
            </select>
            {organizedTournament
              ? structureLoading
                ? <div className="rounded-xl border border-[#289E9D]/20 bg-[#289E9D]/10 p-3 text-xs font-bold text-[#70e4df]">Cargando divisiones y fases…</div>
                : <div className="rounded-2xl border border-[#C8A96B]/25 bg-[#C8A96B]/10 p-4">
                    <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#D8BE87]">Ubicación dentro del campeonato</p>
                    <p className="mt-1 text-xs leading-5 text-[#b8ad95]">Este encuentro alimentará la tabla, llave o ranking de la división y fase seleccionadas.</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2">
                      <select value={form.torneo_division_id} onChange={(event) => setForm({ ...form, torneo_division_id: event.target.value, torneo_fase_id: '' })} className={field}>
                        <option value="">División / modalidad *</option>
                        {availableDivisions.map((division) => <option key={division.id} value={division.id}>{division.nombre}{division.modalidad ? ` · ${division.modalidad}` : ''}</option>)}
                      </select>
                      <select value={form.torneo_fase_id} onChange={(event) => setForm({ ...form, torneo_fase_id: event.target.value })} className={field} disabled={!form.torneo_division_id}>
                        <option value="">Fase / ronda *</option>
                        {availablePhases.map((phase) => <option key={phase.id} value={phase.id}>{phase.orden}. {phase.nombre} · {phase.tipo}</option>)}
                      </select>
                    </div>
                    {!availableDivisions.length ? <p className="mt-3 text-xs font-bold text-amber-200">No hay divisiones compatibles con esta categoría. Configúralas desde la gestión del campeonato antes de programar el encuentro.</p> : form.torneo_division_id && !availablePhases.length ? <p className="mt-3 text-xs font-bold text-amber-200">Esta división aún no tiene fases configuradas.</p> : null}
                  </div>
              : selectedTournament ? <div className="rounded-xl border border-sky-400/20 bg-sky-500/10 p-3 text-xs leading-5 text-sky-100/80"><strong className="text-sky-200">Campeonato externo:</strong> Lestra registra este encuentro dentro del evento, sin reemplazar las llaves o fases administradas por el organizador.</div> : null}
          </> : null}

          <input value={form.rival} onChange={(event) => setForm({ ...form, rival: event.target.value })} className={field} placeholder={`${formProfile?.opponentLabel || 'Rival / evento'} *`} />
          <div className="grid gap-3 sm:grid-cols-3">
            <input type="date" value={form.fecha} onChange={(event) => setForm({ ...form, fecha: event.target.value })} className={field} />
            <input type="time" value={form.hora_citacion} onChange={(event) => setForm({ ...form, hora_citacion: event.target.value })} className={field} />
            <input type="time" value={form.hora} onChange={(event) => setForm({ ...form, hora: event.target.value })} className={field} />
          </div>
          <input value={form.ubicacion} onChange={(event) => setForm({ ...form, ubicacion: event.target.value })} className={field} placeholder="Lugar" />
          <input value={form.link_maps} onChange={(event) => setForm({ ...form, link_maps: event.target.value })} className={field} placeholder="Link de ubicación" />

          {profileLoading
            ? <div className="rounded-xl border border-[#289E9D]/20 bg-[#289E9D]/10 p-3 text-xs font-bold text-[#70e4df]">Adaptando campos a la disciplina…</div>
            : <div className={`grid gap-3 ${formEventUi.conditionMode === 'hidden' ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                <div className="rounded-2xl border border-[#289E9D]/20 bg-[#0d1117] p-3">
                  <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#70e4df]">Información para el alumno</p>
                  <p className="mt-1 text-sm font-black text-white">{formEventUi.equipmentMode === 'uniform' ? 'Indumentaria del encuentro' : '¿Qué debe llevar el alumno?'}</p>
                  <p className="mb-2 mt-1 text-xs leading-5 text-[#8b949e]">{formEventUi.equipmentMode === 'uniform' ? 'Selecciona qué uniforme debe llevar el alumno.' : 'Indica la indumentaria, protecciones o implementos necesarios para esta actividad.'} Esta información se incluirá en la citación por WhatsApp.</p>
                  {formEventUi.equipmentMode === 'uniform'
                    ? <select value={form.color_uniforme} onChange={(event) => setForm({ ...form, color_uniforme: event.target.value })} className={field}><option value="Titular">Indumentaria titular</option><option value="Visita">Indumentaria visita</option><option value="Ambas (Llevar ambos)">Llevar ambas</option></select>
                    : <input value={form.color_uniforme} onChange={(event) => setForm({ ...form, color_uniforme: event.target.value })} className={field} aria-label={formEventUi.equipmentLabel} placeholder={formEventUi.equipmentPlaceholder || 'Ej: equipamiento o implementación requerida'} />}
                </div>
                {formEventUi.conditionMode !== 'hidden' ? <select value={form.condicion} onChange={(event) => setForm({ ...form, condicion: event.target.value })} className={field}>{formEventUi.conditionMode === 'optional' ? <option value="Evento">Evento / sede neutral</option> : null}<option value="Local">Local</option><option value="Visita">Visita</option></select> : null}
              </div>}

          <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-[#0d1117] p-3 text-sm font-bold">
            <input type="checkbox" checked={form.cobra_arbitraje} onChange={(event) => setForm({ ...form, cobra_arbitraje: event.target.checked })} />
            Cobrar cuota de arbitraje/jueces al alumno
          </label>
          {form.cobra_arbitraje ? <input type="number" min="0" value={form.monto_arbitraje_jugador} onChange={(event) => setForm({ ...form, monto_arbitraje_jugador: event.target.value })} className={field} placeholder="Monto a cobrar por alumno" /> : null}
          <button onClick={() => void saveMatch()} className="min-h-11 w-full rounded-xl bg-[#289E9D] px-5 text-sm font-black text-white">{editing ? 'Guardar cambios' : `Crear ${formProfile?.activityLabel?.toLowerCase() || 'evento'}` }</button>
        </div>
      </div>
    </div> : null}

    {statsMatch ? <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/85 p-3">
      <div className="max-h-[94vh] w-full max-w-5xl overflow-y-auto rounded-[26px] border border-[#C8A96B]/25 bg-[#151b25] p-5 sm:p-7">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-black uppercase text-[#D8BE87]">{statsMatch.sport_profile?.label} · resultado</p><h2 className="mt-1 text-2xl font-black text-white">{statsMatch.rival}</h2><p className="mt-1 text-xs text-[#8b949e]">Solo aparecen alumnos que confirmaron la citación de esta rama/categoría.</p></div>
          <button onClick={() => setStatsMatch(null)} className="text-2xl text-[#8995a4]">×</button>
        </div>
        {statsMatch.sport_profile?.usesHeadToHeadScore
          ? <div className="mt-5 rounded-2xl border border-[#289E9D]/20 bg-[#0d1117] p-4">
              <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#70e4df]">Resultado del evento</p><p className="mt-1 text-xs text-[#8b949e]">Registra el resultado global en {statsMatch.sport_profile.scoreLabel.toLowerCase()}.</p></div>
              <div className="grid grid-cols-2 gap-3">
                <label><span className="text-xs font-bold text-[#9aa6b5]">A favor · {statsMatch.sport_profile.scoreLabel}</span><input type="number" min="0" value={score.favor} onChange={(event) => setScore({ ...score, favor: event.target.value })} className={`${field} mt-1 text-center text-xl font-black`} /></label>
                <label><span className="text-xs font-bold text-[#9aa6b5]">Rival · {statsMatch.sport_profile.scoreLabel}</span><input type="number" min="0" value={score.contra} onChange={(event) => setScore({ ...score, contra: event.target.value })} className={`${field} mt-1 text-center text-xl font-black`} /></label>
              </div>
            </div>
          : <div className="mt-5 rounded-2xl border border-violet-400/20 bg-violet-500/10 p-4"><p className="text-[10px] font-black uppercase tracking-[.14em] text-violet-300">Resultado por deportista</p><p className="mt-1 text-sm font-black text-white">{statsMatch.sport_profile.label} no requiere un marcador global.</p><p className="mt-1 text-xs leading-5 text-[#aab3c0]">Registra debajo el desempeño de cada alumno en las métricas que correspondan. Los campos que no apliquen pueden quedar en 0.</p></div>}

        <div className="mt-5">
          <div className="mb-3"><p className="text-[10px] font-black uppercase tracking-[.14em] text-[#D8BE87]">Desempeño individual</p><p className="mt-1 text-xs text-[#8b949e]">Solo completa las métricas que correspondan a cada deportista.</p></div>
          <div className="space-y-3">
            {stats.map((player) => <article key={player.jugador_id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><p className="font-black text-white">{player.nombre}</p><button onClick={() => setMvp(player.jugador_id)} className={`rounded-full px-3 py-1 text-xs font-black ${player.es_mvp ? 'bg-[#C8A96B] text-[#15120c]' : 'border border-[#C8A96B]/25 text-[#D8BE87]'}`}>🌟 Destacado/a</button></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {statsMatch.sport_profile.metrics.map((metric) => <label key={metric.code} className="rounded-xl border border-white/10 bg-[#151b25] p-3"><span className="block text-[10px] font-black uppercase text-[#697586]">{metric.label}</span><input type="number" min="0" step={metric.decimals ? `0.${'0'.repeat(Math.max(metric.decimals - 1, 0))}1` : '1'} value={player.metricas_competitivas?.[metric.code] ?? 0} onChange={(event) => changeMetric(player.jugador_id, metric.code, event.target.value)} className="mt-1 w-full bg-transparent text-lg font-black text-[#70e4df] outline-none" /></label>)}
              </div>
            </article>)}
            {!stats.length ? <div className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-[#697586]">Aún no hay alumnos confirmados para registrar estadísticas.</div> : null}
          </div>
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#289E9D]/20 bg-[#289E9D]/10 p-3 text-sm font-bold text-[#bff8f5]"><input type="checkbox" checked={sendReport} onChange={(event) => setSendReport(event.target.checked)} className="mt-1" /><span><span className="block">Enviar resumen individual por WhatsApp a cada familia</span><span className="mt-1 block text-xs font-normal leading-5 text-[#8fc9c7]">Lestra enviará el resultado y las métricas registradas de cada alumno. No se envía si esta opción queda desmarcada.</span></span></label>
        <button disabled={savingStats || (!statsMatch.sport_profile?.usesHeadToHeadScore && !stats.length)} onClick={() => void saveStats()} className="mt-4 min-h-12 w-full rounded-xl bg-[#C8A96B] px-5 text-sm font-black text-[#15120c] disabled:opacity-50">{savingStats ? 'Guardando...' : sendReport ? 'Guardar y enviar informes' : 'Guardar resultado y estadísticas'}</button>
      </div>
    </div> : null}
  </div>;
}

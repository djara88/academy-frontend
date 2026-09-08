import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { useAppDialog } from '../../contexts/DialogContext';
import type { MatchPlanPlayer, MatchPlanRole } from './types';

type Match = { id: string; rival: string; fecha: string; hora: string; hora_citacion?: string | null; ubicacion?: string | null; condicion?: string | null; estado?: string | null; categorias?: { nombre: string } | null };
type Form = { sistema_juego: string; objetivo: string; indicaciones: string; estado: 'Borrador' | 'Lista' };
type PreparationPayload = { partido: Match; preparacion?: Partial<Form> | null; jugadores?: MatchPlanPlayer[] };
type PlannedPlayer = { jugador_id: string; rol: MatchPlanRole; posicion: string; orden: number };

const EMPTY_FORM: Form = { sistema_juego: '', objetivo: '', indicaciones: '', estado: 'Borrador' };
const todayChile = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const requestMessage = (error: unknown, fallback: string) => {
  const requestError = error as { response?: { data?: { error?: string } }; message?: string };
  return requestError.response?.data?.error || requestError.message || fallback;
};
const normalizedForm = (value?: Partial<Form> | null): Form => ({ ...EMPTY_FORM, ...(value || {}) });
const plannedFrom = (players: MatchPlanPlayer[]): PlannedPlayer[] => players.filter((player) => player.rol_plan).map((player, index) => ({
  jugador_id: player.id,
  rol: player.rol_plan as MatchPlanRole,
  posicion: player.posicion_plan || player.rol_especialidad || player.posicion_principal || player.posicion_cancha || '',
  orden: index,
}));
const preparationMatches = (payload: PreparationPayload, submittedForm: Form, submittedPlayers: PlannedPlayer[]) => {
  const serverForm = normalizedForm(payload.preparacion);
  if (serverForm.sistema_juego !== submittedForm.sistema_juego || serverForm.objetivo !== submittedForm.objetivo || serverForm.indicaciones !== submittedForm.indicaciones || serverForm.estado !== submittedForm.estado) return false;
  const serverPlayers = plannedFrom(payload.jugadores || []);
  if (serverPlayers.length !== submittedPlayers.length) return false;
  const serverById = new Map(serverPlayers.map((item) => [item.jugador_id, item]));
  return submittedPlayers.every((item) => {
    const current = serverById.get(item.jugador_id);
    return current?.rol === item.rol && current.posicion === item.posicion;
  });
};

const MatchPreparationPanel = ({ matchId, academyName, onBack, onSaved }: { matchId: string; academyName?: string; onBack: () => void; onSaved?: () => void }) => {
  const { notify } = useAppDialog();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<MatchPlanPlayer[]>([]);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const response = await api.get(`/api/profesores/me/partidos/${matchId}/preparacion`);
      const payload = response.data.data as PreparationPayload;
      setMatch(payload.partido);
      setPlayers(Array.isArray(payload.jugadores) ? payload.jugadores : []);
      setForm(normalizedForm(payload.preparacion));
      setVerified(true);
      return payload;
    } catch (error: unknown) {
      setMatch(null);
      setPlayers([]);
      setVerified(false);
      setLoadError(requestMessage(error, 'No fue posible verificar la preparación del encuentro.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => players.reduce((total, player) => {
    if (player.rol_plan === 'Titular') total.titulares += 1;
    if (player.rol_plan === 'Suplente') total.suplentes += 1;
    return total;
  }, { titulares: 0, suplentes: 0 }), [players]);

  const canEdit = Boolean(verified && match && match.fecha >= todayChile() && match.estado !== 'Jugado' && match.estado !== 'Cancelado');

  const setRole = (playerId: string, role: MatchPlanRole | null) => {
    if (!canEdit) return;
    setPlayers((current) => current.map((player) => player.id === playerId ? { ...player, rol_plan: role } : player));
  };

  const save = async (status: Form['estado']) => {
    if (!canEdit || !match) return;
    const submittedPlayers = plannedFrom(players);
    const submittedForm: Form = { ...form, estado: status };
    setSaving(true);
    try {
      await api.put(`/api/profesores/me/partidos/${matchId}/preparacion`, { ...submittedForm, jugadores: submittedPlayers });
      setForm(submittedForm);
      await notify(status === 'Lista' ? '✅ Preparación marcada como lista.' : 'Borrador guardado.', { title: academyName });
      onSaved?.();
    } catch (error: unknown) {
      // Si la respuesta del PUT se perdió después del commit, verificar el estado
      // evita inducir al profesor a repetir una operación ya confirmada.
      try {
        const response = await api.get(`/api/profesores/me/partidos/${matchId}/preparacion`);
        const payload = response.data.data as PreparationPayload;
        if (preparationMatches(payload, submittedForm, submittedPlayers)) {
          setMatch(payload.partido);
          setPlayers(payload.jugadores || []);
          setForm(normalizedForm(payload.preparacion));
          setVerified(true);
          await notify(status === 'Lista' ? 'La preparación ya aparece marcada como lista en el servidor.' : 'El borrador ya aparece guardado en el servidor. No es necesario reenviarlo.', { title: academyName });
          onSaved?.();
          return;
        }
      } catch {
        // Mantener la edición local; no afirmar éxito o fracaso sin evidencia adicional.
      }
      await notify(requestMessage(error, 'No fue posible confirmar el guardado. La preparación permanece en pantalla para que puedas verificar antes de reintentar.'), { title: academyName });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card p-8 text-center text-[#8b949e]">Verificando preparación...</div>;

  if (!verified || !match) return <section className="card border-orange-500/30 p-6 text-center"><p className="font-black text-orange-200">Preparación no verificada</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#b1bac4]">{loadError || 'No pudimos cargar la preparación existente.'} Por seguridad Lestra no abrirá una formación vacía que pudiera reemplazar una preparación ya guardada.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-[#30363d] px-4 text-sm font-black text-[#b1bac4]">← Volver</button><button type="button" onClick={() => void load()} className="min-h-11 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white">Reintentar</button></div></section>;

  return (
    <section className="space-y-4">
      {!canEdit ? <div role="status" className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-sm leading-6 text-orange-100">Este encuentro ya no admite cambios de preparación desde cancha ({match.estado || 'estado actual'} · {match.fecha}). La información se mantiene visible solo para consulta.</div> : null}
      <div className="card p-4 sm:p-6">
        <button type="button" onClick={onBack} className="mb-4 min-h-11 rounded-lg border border-[#30363d] px-3 py-2 text-sm font-bold text-[#b1bac4] hover:bg-[#21262d]">← Volver</button>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#48d8d0]">Preparación de encuentro</p>
        <h2 className="mt-2 text-2xl font-black">vs. {match.rival}</h2>
        <p className="mt-1 text-sm text-[#8b949e]">{match.fecha} · {match.condicion || 'Encuentro'} · {match.ubicacion || 'Lugar por confirmar'}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">Citación</p><p className="mt-1 text-xl font-black text-[#70e4df]">{match.hora_citacion?.slice(0, 5) || 'Por definir'}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">Inicio</p><p className="mt-1 text-xl font-black text-white">{match.hora?.slice(0, 5)}</p></div>
          <p className="col-span-2 text-xs text-[#8b949e]">Horario definido por la dirección. Tu preparación aquí es exclusivamente técnica.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label><span className="label">Sistema / estructura de juego</span><input disabled={!canEdit} maxLength={80} value={form.sistema_juego} onChange={(event) => setForm((current) => ({ ...current, sistema_juego: event.target.value }))} placeholder="Ej.: 1-4-3-3, rotación, esquema" className="w-full" /></label>
          <label><span className="label">Objetivo del encuentro</span><textarea disabled={!canEdit} rows={3} maxLength={700} value={form.objetivo} onChange={(event) => setForm((current) => ({ ...current, objetivo: event.target.value }))} placeholder="Objetivo técnico y competitivo" className="w-full" /></label>
          <label><span className="label">Indicaciones técnicas</span><textarea disabled={!canEdit} rows={3} maxLength={2500} value={form.indicaciones} onChange={(event) => setForm((current) => ({ ...current, indicaciones: event.target.value }))} placeholder="Aspectos clave para el grupo" className="w-full" /></label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#289E9D]/35 bg-[#289E9D]/10 p-4 text-center"><p className="text-2xl font-black text-[#70e4df]">{counts.titulares}</p><p className="text-xs text-[#8b949e]">Titulares</p></div><div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-center"><p className="text-2xl font-black text-orange-300">{counts.suplentes}</p><p className="text-xs text-[#8b949e]">Suplentes</p></div></div>

      <div className="space-y-3">
        {players.map((player) => {
          const photo = player.foto_url || player.avatar_url;
          return <article key={player.id} className="card p-4"><div className="flex items-center gap-3">{photo ? <img src={photo} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#289E9D]/15 font-black text-[#48d8d0]">{player.nombre.slice(0, 1)}</div>}<div className="min-w-0 flex-1"><h3 className="truncate font-black">{player.nombre}</h3><p className="text-xs text-[#8b949e]">{player.rol_especialidad || player.posicion_principal || player.posicion_cancha || 'Sin función registrada'}</p></div></div><div className="mt-3 grid grid-cols-3 gap-2">{([null, 'Titular', 'Suplente'] as const).map((role) => <button key={role || 'fuera'} type="button" disabled={!canEdit} onClick={() => setRole(player.id, role)} className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-bold disabled:opacity-45 ${player.rol_plan === role ? role === 'Titular' ? 'border-[#48d8d0] bg-[#289E9D]/20 text-[#70e4df]' : role === 'Suplente' ? 'border-orange-400 bg-orange-500/20 text-orange-200' : 'border-[#8b949e] bg-[#30363d] text-white' : 'border-[#30363d] bg-[#0d1117] text-[#8b949e]'}`}>{role || 'No citado'}</button>)}</div>{player.rol_plan ? <label className="mt-3 block"><span className="label">Posición o función</span><input disabled={!canEdit} maxLength={60} value={player.posicion_plan || ''} onChange={(event) => setPlayers((current) => current.map((item) => item.id === player.id ? { ...item, posicion_plan: event.target.value } : item))} placeholder={player.rol_especialidad || player.posicion_principal || player.posicion_cancha || 'Posición'} className="w-full" /></label> : null}</article>;
        })}
      </div>

      {canEdit ? <div className="sticky bottom-0 z-20 grid gap-2 border-t border-[#30363d] bg-[#0d1117]/95 p-3 backdrop-blur sm:grid-cols-2"><button type="button" onClick={() => void save('Borrador')} disabled={saving} className="min-h-12 rounded-xl border border-[#289E9D]/50 px-4 py-3 font-black text-[#70e4df] disabled:opacity-50">Guardar borrador</button><button type="button" onClick={() => void save('Lista')} disabled={saving} className="btn-primary min-h-12 px-4 py-3 disabled:opacity-50">{saving ? 'Guardando...' : 'Marcar preparación lista'}</button></div> : null}
    </section>
  );
};

export default MatchPreparationPanel;

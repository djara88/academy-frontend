import { useEffect, useMemo, useState } from 'react';
import api from '../../api/axiosConfig';
import { useAppDialog } from '../../contexts/DialogContext';
import type { MatchPlanPlayer, MatchPlanRole } from './types';

type Match = { id: string; rival: string; fecha: string; hora: string; hora_citacion?: string | null; ubicacion?: string | null; condicion?: string | null; categorias?: { nombre: string } | null };
type Form = { sistema_juego: string; objetivo: string; indicaciones: string; estado: 'Borrador' | 'Lista' };

const EMPTY_FORM: Form = { sistema_juego: '', objetivo: '', indicaciones: '', estado: 'Borrador' };

const MatchPreparationPanel = ({ matchId, academyName, onBack, onSaved }: { matchId: string; academyName?: string; onBack: () => void; onSaved: () => void }) => {
  const { notify } = useAppDialog();
  const [match, setMatch] = useState<Match | null>(null);
  const [players, setPlayers] = useState<MatchPlanPlayer[]>([]);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/profesores/me/partidos/${matchId}/preparacion`).then((response) => {
      const payload = response.data.data;
      setMatch(payload.partido);
      setPlayers(payload.jugadores || []);
      setForm(payload.preparacion ? { ...EMPTY_FORM, ...payload.preparacion } : EMPTY_FORM);
    }).catch((error) => notify(error.response?.data?.error || 'No fue posible cargar el partido.', { title: academyName })).finally(() => setLoading(false));
  }, [academyName, matchId, notify]);

  const counts = useMemo(() => players.reduce((total, player) => {
    if (player.rol_plan === 'Titular') total.titulares += 1;
    if (player.rol_plan === 'Suplente') total.suplentes += 1;
    return total;
  }, { titulares: 0, suplentes: 0 }), [players]);

  const setRole = (playerId: string, role: MatchPlanRole | null) => {
    setPlayers((current) => current.map((player) => player.id === playerId ? { ...player, rol_plan: role } : player));
  };

  const save = async (status: Form['estado']) => {
    setSaving(true);
    try {
      const planned = players.filter((player) => player.rol_plan).map((player, index) => ({
        jugador_id: player.id,
        rol: player.rol_plan,
        posicion: player.posicion_plan || player.posicion_principal || player.posicion_cancha || '',
        orden: index,
      }));
      await api.put(`/api/profesores/me/partidos/${matchId}/preparacion`, { ...form, estado: status, jugadores: planned });
      setForm((current) => ({ ...current, estado: status }));
      await notify(status === 'Lista' ? '✅ Preparación marcada como lista.' : 'Borrador guardado.', { title: academyName });
      onSaved();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible guardar la preparación.', { title: academyName });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="card p-8 text-center text-[#8b949e]">Cargando preparación...</div>;

  return (
    <section className="space-y-4">
      <div className="card p-4 sm:p-6">
        <button type="button" onClick={onBack} className="mb-4 min-h-11 rounded-lg border border-[#30363d] px-3 py-2 text-sm font-bold text-[#b1bac4] hover:bg-[#21262d]">← Volver</button>
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#48d8d0]">Preparación de partido</p>
        <h2 className="mt-2 text-2xl font-black">vs. {match?.rival}</h2>
        <p className="mt-1 text-sm text-[#8b949e]">{match?.fecha} · {match?.condicion || 'Partido'} · {match?.ubicacion || 'Lugar por confirmar'}</p>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4">
          <div><p className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">Citación</p><p className="mt-1 text-xl font-black text-[#70e4df]">{match?.hora_citacion?.slice(0, 5) || 'Por definir'}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-[#8b949e]">Inicio</p><p className="mt-1 text-xl font-black text-white">{match?.hora?.slice(0, 5)}</p></div>
          <p className="col-span-2 text-xs text-[#8b949e]">Horario definido por la dirección. Tu preparación aquí es exclusivamente técnica.</p>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label><span className="label">Sistema de juego</span><input maxLength={80} value={form.sistema_juego} onChange={(event) => setForm((current) => ({ ...current, sistema_juego: event.target.value }))} placeholder="Ej.: 1-4-3-3" className="w-full" /></label>
          <label><span className="label">Objetivo del partido</span><textarea rows={3} maxLength={700} value={form.objetivo} onChange={(event) => setForm((current) => ({ ...current, objetivo: event.target.value }))} placeholder="Objetivo técnico y competitivo" className="w-full" /></label>
          <label><span className="label">Indicaciones tácticas</span><textarea rows={3} maxLength={2500} value={form.indicaciones} onChange={(event) => setForm((current) => ({ ...current, indicaciones: event.target.value }))} placeholder="Presión, salida, transiciones y balón detenido" className="w-full" /></label>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-[#289E9D]/35 bg-[#289E9D]/10 p-4 text-center"><p className="text-2xl font-black text-[#70e4df]">{counts.titulares}</p><p className="text-xs text-[#8b949e]">Titulares</p></div><div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 text-center"><p className="text-2xl font-black text-orange-300">{counts.suplentes}</p><p className="text-xs text-[#8b949e]">Suplentes</p></div></div>

      <div className="space-y-3">
        {players.map((player) => {
          const photo = player.foto_url || player.avatar_url;
          return <article key={player.id} className="card p-4"><div className="flex items-center gap-3">{photo ? <img src={photo} alt="" className="h-11 w-11 rounded-full object-cover" /> : <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#289E9D]/15 font-black text-[#48d8d0]">{player.nombre.slice(0, 1)}</div>}<div className="min-w-0 flex-1"><h3 className="truncate font-black">{player.nombre}</h3><p className="text-xs text-[#8b949e]">{player.posicion_principal || player.posicion_cancha || 'Jugador'}</p></div></div><div className="mt-3 grid grid-cols-3 gap-2">{([null, 'Titular', 'Suplente'] as const).map((role) => <button key={role || 'fuera'} type="button" onClick={() => setRole(player.id, role)} className={`min-h-11 rounded-xl border px-2 py-2 text-xs font-bold ${player.rol_plan === role ? role === 'Titular' ? 'border-[#48d8d0] bg-[#289E9D]/20 text-[#70e4df]' : role === 'Suplente' ? 'border-orange-400 bg-orange-500/20 text-orange-200' : 'border-[#8b949e] bg-[#30363d] text-white' : 'border-[#30363d] bg-[#0d1117] text-[#8b949e]'}`}>{role || 'No citado'}</button>)}</div>{player.rol_plan ? <label className="mt-3 block"><span className="label">Posición o función</span><input maxLength={60} value={player.posicion_plan || ''} onChange={(event) => setPlayers((current) => current.map((item) => item.id === player.id ? { ...item, posicion_plan: event.target.value } : item))} placeholder={player.posicion_principal || player.posicion_cancha || 'Posición'} className="w-full" /></label> : null}</article>;
        })}
      </div>

      <div className="sticky bottom-0 z-20 grid gap-2 border-t border-[#30363d] bg-[#0d1117]/95 p-3 backdrop-blur sm:grid-cols-2"><button type="button" onClick={() => void save('Borrador')} disabled={saving} className="min-h-12 rounded-xl border border-[#289E9D]/50 px-4 py-3 font-black text-[#70e4df] disabled:opacity-50">Guardar borrador</button><button type="button" onClick={() => void save('Lista')} disabled={saving} className="btn-primary min-h-12 px-4 py-3 disabled:opacity-50">{saving ? 'Guardando...' : 'Marcar preparación lista'}</button></div>
    </section>
  );
};

export default MatchPreparationPanel;

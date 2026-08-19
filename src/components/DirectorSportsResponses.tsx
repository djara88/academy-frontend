import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type TournamentResponse = {
  torneo_id: string;
  jugador_id: string;
  jugador?: { id: string; nombre: string; foto_url?: string | null; foto_base64?: string | null } | null;
  torneo: { id: string; nombre: string; costo_inscripcion?: number; permite_cuotas?: boolean; max_cuotas?: number; fecha_inicio?: string | null };
  categorias: { id: string; nombre: string }[];
  respuesta_participacion: string;
  numero_cuotas: number;
  paso_bot: string;
  estado_pago: string;
  canal_respuesta?: string | null;
  canal_cuotas?: string | null;
};

type CitationResponse = {
  id: string;
  partido_id: string;
  jugador_id: string;
  respuesta: string;
  motivo_ausencia?: string | null;
  canal_respuesta?: string | null;
  jugador?: { id: string; nombre: string; foto_url?: string | null; foto_base64?: string | null } | null;
  partido: { id: string; rival: string; fecha: string; hora: string; hora_citacion?: string | null; ubicacion?: string | null; categorias?: { nombre: string } | null };
};

type Props = { tournamentId?: string; compactTitle?: string };
type Data = { participaciones: TournamentResponse[]; citaciones: CitationResponse[] };

const channel = (value?: string | null) => value === 'portal_apoderado' ? 'Portal apoderado' : value === 'director' ? 'Dirección' : value === 'whatsapp' ? 'WhatsApp' : value || 'Sin canal';
const statusClass = (value: string) => value === 'Si' ? 'bg-emerald-500/10 text-emerald-300' : value === 'No' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-200';
const reasons = ['Enfermedad / lesión', 'Compromiso familiar', 'Estudios / colegio', 'Otro motivo'];

export default function DirectorSportsResponses({ tournamentId, compactTitle }: Props) {
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);
  const [saving, setSaving] = useState('');
  const [motives, setMotives] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ['director-sports-responses', tournamentId || 'all'],
    queryFn: async () => (await api.get('/api/torneos/respuestas/centro', { params: tournamentId ? { torneo_id: tournamentId } : undefined })).data.data as Data,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['director-sports-responses'] });
    await queryClient.invalidateQueries({ queryKey: ['apoderado-portal'] });
    await queryClient.invalidateQueries({ queryKey: ['guardian-sports-responses'] });
  };

  const participationRows = useMemo(() => {
    const rows = query.data?.participaciones || [];
    return showResolved ? rows : rows.filter((item) => item.respuesta_participacion === 'Pendiente' || item.paso_bot === 'ESPERANDO_CUOTAS');
  }, [query.data, showResolved]);
  const citationRows = useMemo(() => {
    const rows = query.data?.citaciones || [];
    return showResolved ? rows : rows.filter((item) => item.respuesta === 'Pendiente');
  }, [query.data, showResolved]);

  const respondTournament = async (item: TournamentResponse, respuesta: 'Si' | 'No', cuotas?: number) => {
    const key = `t-${item.torneo_id}-${item.jugador_id}`;
    setSaving(key);
    try {
      const result = await api.patch(`/api/torneos/respuestas/participacion/${item.torneo_id}/${item.jugador_id}`, { respuesta, ...(cuotas ? { cuotas } : {}) });
      await refresh();
      await notify(result.data.message || 'Respuesta actualizada.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible actualizar la participación.'); }
    finally { setSaving(''); }
  };

  const respondCitation = async (item: CitationResponse, respuesta: 'Si' | 'No') => {
    const key = `c-${item.partido_id}-${item.jugador_id}`;
    setSaving(key);
    try {
      const result = await api.patch(`/api/torneos/respuestas/citacion/${item.partido_id}/${item.jugador_id}`, {
        respuesta,
        motivo: respuesta === 'No' ? (motives[item.id] || 'No informado · registrado por dirección') : null,
      });
      await refresh();
      await notify(result.data.message || 'Citación actualizada.');
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible actualizar la citación.'); }
    finally { setSaving(''); }
  };

  if (query.isLoading) return <section className="rounded-3xl border border-white/10 bg-[#151b25] p-5 text-sm text-[#8995a4]">Cargando centro de confirmaciones...</section>;
  if (query.error) return <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">No fue posible cargar el centro de confirmaciones.</section>;

  const totalPending = (query.data?.participaciones || []).filter((item) => item.respuesta_participacion === 'Pendiente' || item.paso_bot === 'ESPERANDO_CUOTAS').length
    + (query.data?.citaciones || []).filter((item) => item.respuesta === 'Pendiente').length;

  return <section className="rounded-[28px] border border-violet-400/20 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,.12),transparent_40%),#151b25] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-violet-300">Centro de confirmaciones</p><h2 className="mt-1 text-2xl font-black text-white">{compactTitle || 'Respuestas registrables por dirección'}</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">WhatsApp y el Portal de Apoderado siguen disponibles. Dirección puede registrar o corregir una respuesta desde aquí y todos los canales quedan sincronizados.</p></div><div className="flex items-center gap-2"><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">{totalPending} pendientes</span><button onClick={() => setShowResolved((value) => !value)} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-[#c3ccd6]">{showResolved ? 'Ocultar resueltos' : 'Ver resueltos'}</button></div></div>

    <div className="mt-6 grid gap-6 xl:grid-cols-2">
      <div><h3 className="text-sm font-black uppercase tracking-[.12em] text-[#D8BE87]">Participación y cuotas</h3><div className="mt-3 space-y-3">{participationRows.map((item) => {
        const key = `t-${item.torneo_id}-${item.jugador_id}`;
        const max = Math.max(1, Number(item.torneo.max_cuotas) || 1);
        const needsInstallments = item.respuesta_participacion === 'Si' && item.torneo.permite_cuotas && Number(item.torneo.costo_inscripcion) > 0;
        return <article key={`${item.torneo_id}-${item.jugador_id}`} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{item.jugador?.nombre || 'Alumno'}</p><p className="mt-1 text-xs text-[#8995a4]">{item.torneo.nombre} · {item.categorias.map((category) => category.nombre).join(' · ') || 'Sin categoría'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(item.respuesta_participacion)}`}>{item.respuesta_participacion === 'Si' ? 'Confirmado' : item.respuesta_participacion === 'No' ? 'No participa' : 'Pendiente'}</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={saving === key} onClick={() => void respondTournament(item, 'Si')} className="rounded-xl bg-[#289E9D] px-3 py-2 text-xs font-black text-white disabled:opacity-40">Confirmar</button><button disabled={saving === key} onClick={() => void respondTournament(item, 'No')} className="rounded-xl border border-red-400/25 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-40">No participa</button></div>
          {needsInstallments ? <select disabled={saving === key || item.estado_pago === 'Pagado'} value={item.paso_bot === 'ESPERANDO_CUOTAS' ? '' : String(item.numero_cuotas || 1)} onChange={(event) => event.target.value && void respondTournament(item, 'Si', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-violet-400/20 bg-[#151b25] px-3 py-2 text-xs font-black text-white"><option value="">Definir cuotas</option>{Array.from({ length: max }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} cuota{count === 1 ? '' : 's'}</option>)}</select> : null}
          {item.canal_respuesta ? <p className="mt-2 text-[10px] text-[#657282]">Última respuesta: {channel(item.canal_respuesta)}{item.canal_cuotas ? ` · Cuotas: ${channel(item.canal_cuotas)}` : ''}</p> : null}
        </article>;
      })}{!participationRows.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-[#697586]">No hay participaciones pendientes.</div> : null}</div></div>

      <div><h3 className="text-sm font-black uppercase tracking-[.12em] text-violet-300">Citaciones a eventos</h3><div className="mt-3 space-y-3">{citationRows.map((item) => {
        const key = `c-${item.partido_id}-${item.jugador_id}`;
        return <article key={item.id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-black text-white">{item.jugador?.nombre || 'Alumno'}</p><p className="mt-1 text-xs text-[#8995a4]">{item.partido.rival} · {item.partido.fecha} · Citación {String(item.partido.hora_citacion || '').slice(0,5) || '—'}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(item.respuesta)}`}>{item.respuesta === 'Si' ? 'Asiste' : item.respuesta === 'No' ? 'No asiste' : 'Pendiente'}</span></div>
          <div className="mt-3 grid grid-cols-2 gap-2"><button disabled={saving === key} onClick={() => void respondCitation(item, 'Si')} className="rounded-xl bg-violet-500 px-3 py-2 text-xs font-black text-white disabled:opacity-40">Confirmar asistencia</button><button disabled={saving === key} onClick={() => void respondCitation(item, 'No')} className="rounded-xl border border-red-400/25 px-3 py-2 text-xs font-black text-red-300 disabled:opacity-40">No asistirá</button></div>
          <select value={motives[item.id] || ''} onChange={(event) => setMotives((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#151b25] px-3 py-2 text-xs text-white"><option value="">Motivo de ausencia (opcional)</option>{reasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select>
          {item.canal_respuesta ? <p className="mt-2 text-[10px] text-[#657282]">Última respuesta: {channel(item.canal_respuesta)}</p> : null}
        </article>;
      })}{!citationRows.length ? <div className="rounded-xl border border-dashed border-white/10 p-5 text-center text-xs text-[#697586]">No hay citaciones pendientes.</div> : null}</div></div>
    </div>
  </section>;
}

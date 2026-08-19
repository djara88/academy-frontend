import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type TournamentResponse = {
  torneo_id: string;
  jugador_id: string;
  jugador?: { id: string; nombre: string } | null;
  torneo: { id: string; nombre: string; fecha_inicio?: string | null; costo_inscripcion?: number; permite_cuotas?: boolean; max_cuotas?: number };
  categorias: { id: string; nombre: string }[];
  respuesta_participacion: string;
  pago_en_cuotas: boolean;
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
  jugador?: { id: string; nombre: string } | null;
  partido: { id: string; rival: string; fecha: string; hora: string; hora_citacion?: string | null; ubicacion?: string | null; categorias?: { nombre: string } | null };
};

type ResponseData = { participaciones: TournamentResponse[]; citaciones: CitationResponse[] };

const money = (value?: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const channelLabel = (value?: string | null) => value === 'portal_apoderado' ? 'Portal apoderado' : value === 'director' ? 'Dirección' : value === 'whatsapp' ? 'WhatsApp' : value ? value : 'Sin registro de canal';
const badge = (value: string) => value === 'Si' ? 'bg-emerald-500/10 text-emerald-300' : value === 'No' ? 'bg-red-500/10 text-red-300' : 'bg-amber-500/10 text-amber-200';
const reasons = ['Enfermedad / lesión', 'Compromiso familiar', 'Estudios / colegio', 'Otro motivo'];

export default function GuardianSportsResponses() {
  const { notify } = useAppDialog();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState('');
  const [reasonsByCitation, setReasonsByCitation] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ['guardian-sports-responses'],
    queryFn: async () => (await api.get('/api/apoderados/me/inscripciones-deportivas/respuestas')).data.data as ResponseData,
  });

  const pending = useMemo(() => ({
    tournaments: (query.data?.participaciones || []).filter((item) => item.respuesta_participacion === 'Pendiente' || item.paso_bot === 'ESPERANDO_CUOTAS').length,
    citations: (query.data?.citaciones || []).filter((item) => item.respuesta === 'Pendiente').length,
  }), [query.data]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['guardian-sports-responses'] });
    await queryClient.invalidateQueries({ queryKey: ['apoderado-portal'] });
  };

  const respondTournament = async (item: TournamentResponse, response: 'Si' | 'No', installments?: number) => {
    const key = `t-${item.torneo_id}-${item.jugador_id}`;
    setSaving(key);
    try {
      const result = await api.patch(`/api/apoderados/me/inscripciones-deportivas/respuestas/participacion/${item.torneo_id}/${item.jugador_id}`, {
        respuesta: response,
        ...(installments ? { cuotas: installments } : {}),
      });
      await refresh();
      await notify(result.data.message || 'Respuesta registrada.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible registrar la respuesta.');
    } finally { setSaving(''); }
  };

  const respondCitation = async (item: CitationResponse, response: 'Si' | 'No') => {
    const key = `c-${item.partido_id}-${item.jugador_id}`;
    setSaving(key);
    try {
      const result = await api.patch(`/api/apoderados/me/inscripciones-deportivas/respuestas/citacion/${item.partido_id}/${item.jugador_id}`, {
        respuesta: response,
        motivo: response === 'No' ? (reasonsByCitation[item.id] || 'No informado desde portal') : null,
      });
      await refresh();
      await notify(result.data.message || 'Citación actualizada.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible responder la citación.');
    } finally { setSaving(''); }
  };

  if (query.isLoading) return <section className="rounded-3xl border border-[#289E9D]/20 bg-[#151b25] p-6 text-sm text-[#8995a4]">Cargando confirmaciones deportivas...</section>;
  if (query.error) return <section className="rounded-3xl border border-red-400/20 bg-red-500/10 p-5 text-sm text-red-200">No fue posible cargar las confirmaciones deportivas.</section>;

  const tournaments = query.data?.participaciones || [];
  const citations = query.data?.citaciones || [];
  if (!tournaments.length && !citations.length) return null;

  return <section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,.12),transparent_38%),#151b25] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">Confirmaciones deportivas</p><h2 className="mt-1 text-2xl font-black text-white">Responde también desde Lestra</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#8b949e]">WhatsApp sigue funcionando igual. Esta sección es una alternativa cuando no tienes el teléfono a mano. Lo que respondas aquí queda sincronizado con la academia.</p></div><div className="flex gap-2"><span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-black text-amber-200">{pending.tournaments} competencias pendientes</span><span className="rounded-full bg-violet-500/10 px-3 py-1 text-xs font-black text-violet-300">{pending.citations} citaciones pendientes</span></div></div>

    {tournaments.length ? <div className="mt-6"><h3 className="text-sm font-black uppercase tracking-[.12em] text-[#D8BE87]">Participación en competencias</h3><div className="mt-3 grid gap-3 lg:grid-cols-2">{tournaments.map((item) => {
      const key = `t-${item.torneo_id}-${item.jugador_id}`;
      const maxInstallments = Math.max(1, Number(item.torneo.max_cuotas) || 1);
      const needsInstallments = item.respuesta_participacion === 'Si' && item.torneo.permite_cuotas && Number(item.torneo.costo_inscripcion) > 0;
      return <article key={`${item.torneo_id}-${item.jugador_id}`} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#8995a4]">{item.jugador?.nombre || 'Alumno'}</p><h4 className="mt-1 font-black text-white">🏆 {item.torneo.nombre}</h4><p className="mt-1 text-xs text-[#697586]">{item.categorias.map((category) => category.nombre).join(' · ') || 'Categoría por confirmar'}{item.torneo.fecha_inicio ? ` · ${item.torneo.fecha_inicio}` : ''}</p></div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${badge(item.respuesta_participacion)}`}>{item.respuesta_participacion === 'Si' ? 'Confirmado' : item.respuesta_participacion === 'No' ? 'No participa' : 'Pendiente'}</span></div>
        {Number(item.torneo.costo_inscripcion) > 0 ? <p className="mt-3 text-xs text-[#9aa6b5]">Inscripción: <strong className="text-white">{money(item.torneo.costo_inscripcion)}</strong>{item.torneo.permite_cuotas ? ` · hasta ${maxInstallments} cuotas` : ''}</p> : <p className="mt-3 text-xs text-emerald-300">Competencia sin costo de inscripción.</p>}
        {item.respuesta_participacion === 'Pendiente' ? <div className="mt-4 grid grid-cols-2 gap-2"><button disabled={saving === key} onClick={() => void respondTournament(item, 'Si')} className="rounded-xl bg-[#289E9D] px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">Confirmar participación</button><button disabled={saving === key} onClick={() => void respondTournament(item, 'No')} className="rounded-xl border border-red-400/25 px-4 py-2.5 text-xs font-black text-red-300 disabled:opacity-40">No participará</button></div> : null}
        {needsInstallments ? <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-500/10 p-3"><p className="text-xs font-black text-violet-200">Forma de pago de la inscripción</p><p className="mt-1 text-[11px] leading-5 text-violet-200/70">Selecciona cuántas cuotas quieres registrar. Puedes hacerlo aquí aunque la confirmación haya llegado por WhatsApp o por dirección.</p><select disabled={saving === key || item.estado_pago === 'Pagado'} value={item.paso_bot === 'ESPERANDO_CUOTAS' ? '' : String(item.numero_cuotas || 1)} onChange={(event) => event.target.value && void respondTournament(item, 'Si', Number(event.target.value))} className="mt-2 w-full rounded-xl border border-violet-400/20 bg-[#101620] px-3 py-2.5 text-sm font-black text-white"><option value="">Seleccionar cuotas</option>{Array.from({ length: maxInstallments }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} cuota{count === 1 ? '' : 's'}</option>)}</select></div> : null}
        {item.canal_respuesta ? <p className="mt-3 text-[10px] text-[#657282]">Última confirmación: {channelLabel(item.canal_respuesta)}</p> : null}
      </article>;
    })}</div></div> : null}

    {citations.length ? <div className="mt-7"><h3 className="text-sm font-black uppercase tracking-[.12em] text-violet-300">Citaciones a eventos</h3><div className="mt-3 grid gap-3 lg:grid-cols-2">{citations.map((item) => {
      const key = `c-${item.partido_id}-${item.jugador_id}`;
      return <article key={item.id} className="rounded-2xl border border-white/10 bg-[#0d1117] p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-[#8995a4]">{item.jugador?.nombre || 'Alumno'} · {item.partido.categorias?.nombre || 'Categoría'}</p><h4 className="mt-1 font-black text-white">📅 {item.partido.rival}</h4><p className="mt-1 text-xs text-[#697586]">{item.partido.fecha} · Citación {String(item.partido.hora_citacion || '').slice(0,5) || 'por definir'} · Inicio {String(item.partido.hora || '').slice(0,5)}</p>{item.partido.ubicacion ? <p className="mt-1 text-xs text-[#697586]">{item.partido.ubicacion}</p> : null}</div><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${badge(item.respuesta)}`}>{item.respuesta === 'Si' ? 'Asiste' : item.respuesta === 'No' ? 'No asiste' : 'Pendiente'}</span></div>
        {item.respuesta === 'Pendiente' ? <><div className="mt-4 grid grid-cols-2 gap-2"><button disabled={saving === key} onClick={() => void respondCitation(item, 'Si')} className="rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-black text-white disabled:opacity-40">Confirmar asistencia</button><button disabled={saving === key} onClick={() => void respondCitation(item, 'No')} className="rounded-xl border border-red-400/25 px-4 py-2.5 text-xs font-black text-red-300 disabled:opacity-40">No asistirá</button></div><select value={reasonsByCitation[item.id] || ''} onChange={(event) => setReasonsByCitation((current) => ({ ...current, [item.id]: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-[#101620] px-3 py-2 text-xs text-white"><option value="">Motivo si no asistirá (opcional)</option>{reasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select></> : item.respuesta === 'No' && item.motivo_ausencia ? <p className="mt-3 text-xs text-[#8b949e]">Motivo: {item.motivo_ausencia}</p> : null}
        {item.canal_respuesta ? <p className="mt-3 text-[10px] text-[#657282]">Última respuesta: {channelLabel(item.canal_respuesta)}</p> : null}
      </article>;
    })}</div></div> : null}
  </section>;
}

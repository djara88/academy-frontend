import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorPanel,
} from './director/DirectorModule';

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
const reasons = ['Enfermedad / lesión', 'Compromiso familiar', 'Estudios / colegio', 'Otro motivo'];
const statusClass = (value: string) => value === 'Si'
  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
  : value === 'No'
    ? 'border-rose-200 bg-rose-50 text-rose-800'
    : 'border-amber-200 bg-amber-50 text-amber-800';

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
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible actualizar la participación.');
    } finally {
      setSaving('');
    }
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
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible actualizar la citación.');
    } finally {
      setSaving('');
    }
  };

  if (query.isLoading) return <DirectorPanel className="p-5 text-sm font-bold text-[#697468]">Cargando confirmaciones…</DirectorPanel>;
  if (query.error) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm font-bold text-rose-800">No fue posible cargar el centro de confirmaciones.</div>;

  const totalPending = (query.data?.participaciones || []).filter((item) => item.respuesta_participacion === 'Pendiente' || item.paso_bot === 'ESPERANDO_CUOTAS').length
    + (query.data?.citaciones || []).filter((item) => item.respuesta === 'Pendiente').length;

  return <DirectorPanel className="overflow-hidden">
    <header className="flex flex-col gap-4 border-b border-[#e2e7df] p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#6d8700]">Centro de confirmaciones</p>
        <h2 className="mt-1 text-xl font-black tracking-[-.025em] text-[#111711]">{compactTitle || 'Respuestas registrables por dirección'}</h2>
        <p className="mt-1 max-w-3xl text-sm leading-6 text-[#697468]">WhatsApp y el Portal de Apoderado siguen sincronizados. Dirección puede registrar o corregir una respuesta desde aquí.</p>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-800">{totalPending} pendientes</span>
        <button type="button" onClick={() => setShowResolved((value) => !value)} className={DIRECTOR_BUTTON_GHOST}>{showResolved ? 'Ocultar resueltos' : 'Ver resueltos'}</button>
      </div>
    </header>

    <div className="grid gap-5 p-4 sm:p-5 xl:grid-cols-2">
      <section>
        <h3 className="text-xs font-black uppercase tracking-[.12em] text-[#667064]">Participación y cuotas</h3>
        <div className="mt-3 grid gap-2">
          {participationRows.map((item) => {
            const key = `t-${item.torneo_id}-${item.jugador_id}`;
            const max = Math.max(1, Number(item.torneo.max_cuotas) || 1);
            const needsInstallments = item.respuesta_participacion === 'Si' && item.torneo.permite_cuotas && Number(item.torneo.costo_inscripcion) > 0;
            return <article key={`${item.torneo_id}-${item.jugador_id}`} className="rounded-2xl border border-[#dfe5dc] bg-[#fafbf9] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#111711]">{item.jugador?.nombre || 'Alumno'}</p>
                  <p className="mt-1 text-xs leading-5 text-[#697468]">{item.torneo.nombre} · {item.categorias.map((category) => category.nombre).join(' · ') || 'Sin categoría'}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(item.respuesta_participacion)}`}>{item.respuesta_participacion === 'Si' ? 'Confirmado' : item.respuesta_participacion === 'No' ? 'No participa' : 'Pendiente'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button disabled={saving === key} onClick={() => void respondTournament(item, 'Si')} className={`${DIRECTOR_BUTTON} min-h-10 px-3 text-xs`}>Confirmar</button>
                <button disabled={saving === key} onClick={() => void respondTournament(item, 'No')} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 text-xs font-black text-rose-800 transition hover:bg-rose-50 disabled:opacity-40">No participa</button>
              </div>
              {needsInstallments ? <select disabled={saving === key || item.estado_pago === 'Pagado'} value={item.paso_bot === 'ESPERANDO_CUOTAS' ? '' : String(item.numero_cuotas || 1)} onChange={(event) => event.target.value && void respondTournament(item, 'Si', Number(event.target.value))} className={`${DIRECTOR_FIELD} mt-2 text-xs`}><option value="">Definir cuotas</option>{Array.from({ length: max }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} cuota{count === 1 ? '' : 's'}</option>)}</select> : null}
              {item.canal_respuesta ? <p className="mt-2 text-[10px] font-semibold text-[#7a8478]">Última respuesta: {channel(item.canal_respuesta)}{item.canal_cuotas ? ` · Cuotas: ${channel(item.canal_cuotas)}` : ''}</p> : null}
            </article>;
          })}
          {!participationRows.length ? <EmptyState>No hay participaciones pendientes.</EmptyState> : null}
        </div>
      </section>

      <section>
        <h3 className="text-xs font-black uppercase tracking-[.12em] text-[#667064]">Citaciones a eventos</h3>
        <div className="mt-3 grid gap-2">
          {citationRows.map((item) => {
            const key = `c-${item.partido_id}-${item.jugador_id}`;
            return <article key={item.id} className="rounded-2xl border border-[#dfe5dc] bg-[#fafbf9] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-[#111711]">{item.jugador?.nombre || 'Alumno'}</p>
                  <p className="mt-1 text-xs leading-5 text-[#697468]">{item.partido.rival} · {item.partido.fecha} · Citación {String(item.partido.hora_citacion || '').slice(0, 5) || '—'}</p>
                </div>
                <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${statusClass(item.respuesta)}`}>{item.respuesta === 'Si' ? 'Asiste' : item.respuesta === 'No' ? 'No asiste' : 'Pendiente'}</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button disabled={saving === key} onClick={() => void respondCitation(item, 'Si')} className={`${DIRECTOR_BUTTON} min-h-10 px-3 text-xs`}>Confirmar asistencia</button>
                <button disabled={saving === key} onClick={() => void respondCitation(item, 'No')} className="inline-flex min-h-10 items-center justify-center rounded-xl border border-rose-200 bg-white px-3 text-xs font-black text-rose-800 transition hover:bg-rose-50 disabled:opacity-40">No asistirá</button>
              </div>
              <select value={motives[item.id] || ''} onChange={(event) => setMotives((current) => ({ ...current, [item.id]: event.target.value }))} className={`${DIRECTOR_FIELD} mt-2 text-xs`}><option value="">Motivo de ausencia (opcional)</option>{reasons.map((reason) => <option key={reason} value={reason}>{reason}</option>)}</select>
              {item.canal_respuesta ? <p className="mt-2 text-[10px] font-semibold text-[#7a8478]">Última respuesta: {channel(item.canal_respuesta)}</p> : null}
            </article>;
          })}
          {!citationRows.length ? <EmptyState>No hay citaciones pendientes.</EmptyState> : null}
        </div>
      </section>
    </div>
  </DirectorPanel>;
}

function EmptyState({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-dashed border-[#cfd7cc] bg-[#fafbf9] p-5 text-center text-xs font-semibold text-[#697468]">{children}</div>;
}

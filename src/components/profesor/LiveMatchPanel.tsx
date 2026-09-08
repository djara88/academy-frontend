import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  MinusIcon,
  PlayIcon,
  PlusIcon,
  StarIcon,
  StopIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axiosConfig';
import { useAppDialog } from '../../contexts/DialogContext';
import type { ProfessorSportProfile } from './types';

type LivePlayer = {
  id: string;
  nombre: string;
  foto_url?: string | null;
  avatar_url?: string | null;
  posicion?: string | null;
  rol_plan?: 'Titular' | 'Suplente' | null;
  metricas: Record<string, number>;
  es_mvp: boolean;
};

type LiveMatch = {
  id: string;
  rival: string;
  fecha: string;
  hora?: string | null;
  estado?: string | null;
  condicion?: string | null;
  ubicacion?: string | null;
  goles_favor?: number | null;
  goles_contra?: number | null;
  en_vivo?: boolean;
  live_etapa?: string | null;
  live_updated_at?: string | null;
  categorias?: { id: string; nombre: string } | null;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
};

type LivePayload = {
  partido: LiveMatch;
  sport_profile: ProfessorSportProfile;
  jugadores: LivePlayer[];
  eventos: { id: string; accion: string; jugador_id?: string | null; detalle?: Record<string, unknown>; created_at: string }[];
  puede_iniciar: boolean;
};

type Props = {
  matchId: string;
  academyName?: string;
  onBack: () => void;
  onFinished?: () => void;
};

type ApiFailure = {
  response?: { status?: number; data?: { error?: string; code?: string; data?: Partial<LiveMatch> } };
  message?: string;
};

const time = (value?: string | null) => String(value || '').slice(0, 5) || '—';
const metricStep = (decimals?: number) => decimals && decimals > 0 ? 1 / (10 ** decimals) : 1;
const requestMessage = (error: unknown, fallback: string) => {
  const requestError = error as ApiFailure;
  return requestError.response?.data?.error || requestError.message || fallback;
};
const isLiveConflict = (error: unknown) => {
  const requestError = error as ApiFailure;
  return requestError.response?.status === 409 && requestError.response?.data?.code === 'LIVE_STATE_CONFLICT';
};

export default function LiveMatchPanel({ matchId, academyName, onBack, onFinished }: Props) {
  const { notify, confirmAction } = useAppDialog();
  const [data, setData] = useState<LivePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [verified, setVerified] = useState(false);
  const [syncError, setSyncError] = useState('');
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState('');
  const [stageDirty, setStageDirty] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [metricDraft, setMetricDraft] = useState<Record<string, number>>({});
  const [mvpDraft, setMvpDraft] = useState(false);
  const [playerDraftDirty, setPlayerDraftDirty] = useState(false);

  const load = useCallback(async (silent = false): Promise<LivePayload | null> => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get(`/api/profesores/me/partidos/${matchId}/en-vivo`);
      const payload = response.data.data as LivePayload;
      setData(payload);
      if (!stageDirty) setStage(payload.partido.live_etapa || '');
      setSelectedPlayerId((current) => current && payload.jugadores.some((player) => player.id === current) ? current : (payload.jugadores[0]?.id || ''));
      setVerified(true);
      setSyncError('');
      return payload;
    } catch (error: unknown) {
      setVerified(false);
      setSyncError(requestMessage(error, 'No fue posible verificar el estado actual del encuentro.'));
      return null;
    } finally {
      if (!silent) setLoading(false);
    }
  }, [matchId, stageDirty]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!data?.partido.en_vivo) return undefined;
    const timer = window.setInterval(() => void load(true), 5000);
    return () => window.clearInterval(timer);
  }, [data?.partido.en_vivo, load]);

  const selectedPlayer = useMemo(() => data?.jugadores.find((player) => player.id === selectedPlayerId) || null, [data?.jugadores, selectedPlayerId]);

  useEffect(() => {
    if (!selectedPlayer || playerDraftDirty) return;
    setMetricDraft(selectedPlayer.metricas || {});
    setMvpDraft(Boolean(selectedPlayer.es_mvp));
  }, [selectedPlayer, playerDraftDirty]);

  const applyMatchResponse = (match: Partial<LiveMatch> | undefined) => {
    if (!match) return;
    setData((current) => current ? { ...current, partido: { ...current.partido, ...match } } : current);
    if (match.live_etapa !== undefined) {
      setStage(match.live_etapa || '');
      setStageDirty(false);
    }
  };

  const refreshAfterConfirmedMutation = async (message: string) => {
    const refreshed = await load(true);
    if (!refreshed) {
      setVerified(false);
      setSyncError(`${message} El servidor confirmó la operación, pero no pudimos volver a verificar la vista completa. Las acciones quedan bloqueadas hasta sincronizar nuevamente.`);
    }
    return refreshed;
  };

  const handleConcurrencyConflict = async (error: unknown) => {
    if (!isLiveConflict(error)) return false;
    const currentFromConflict = (error as ApiFailure).response?.data?.data;
    if (currentFromConflict) applyMatchResponse(currentFromConflict);
    const refreshed = await load(true);
    setVerified(Boolean(refreshed));
    setSyncError(refreshed ? '' : 'El encuentro cambió en otro dispositivo y todavía no pudimos sincronizar la nueva versión.');
    await notify(
      refreshed
        ? 'El encuentro cambió en otro dispositivo. Sincronizamos la versión más reciente y no sobrescribimos ese cambio.'
        : 'El encuentro cambió en otro dispositivo. No sobrescribimos la información; sincroniza nuevamente antes de continuar.',
      { title: academyName },
    );
    return true;
  };

  const start = async () => {
    if (!verified) return;
    setBusy(true);
    try {
      const response = await api.post(`/api/profesores/me/partidos/${matchId}/en-vivo-v2/iniciar`, { etapa: stage || 'En juego' });
      applyMatchResponse(response.data?.data as Partial<LiveMatch> | undefined);
      await refreshAfterConfirmedMutation('El encuentro fue iniciado.');
    } catch (error: unknown) {
      const current = await load(true);
      if (current?.partido.en_vivo) {
        await notify('El encuentro aparece activo en el servidor. Continuaremos con el estado verificado para evitar un inicio duplicado.', { title: academyName });
      } else {
        await notify(requestMessage(error, 'No fue posible iniciar el encuentro.'), { title: academyName });
      }
    } finally { setBusy(false); }
  };

  const patchLive = async (payload: Record<string, unknown>) => {
    if (!data?.partido.en_vivo || !verified) return;
    const expectedVersion = data.partido.live_updated_at;
    if (!expectedVersion) {
      setVerified(false);
      setSyncError('La versión del encuentro no está disponible. Debemos sincronizar antes de modificar marcador o etapa.');
      await load(true);
      return;
    }
    setBusy(true);
    try {
      const response = await api.patch(`/api/profesores/me/partidos/${matchId}/en-vivo-v2`, {
        ...payload,
        expected_live_updated_at: expectedVersion,
      });
      applyMatchResponse(response.data?.data as Partial<LiveMatch> | undefined);
      await refreshAfterConfirmedMutation('El cambio fue guardado.');
    } catch (error: unknown) {
      if (await handleConcurrencyConflict(error)) {
        setBusy(false);
        return;
      }
      const current = await load(true);
      const expectedFavor = payload.resultado_favor;
      const expectedContra = payload.resultado_contra;
      const expectedStage = payload.etapa;
      const confirmedByRead = Boolean(current)
        && (expectedFavor === undefined || Number(current?.partido.goles_favor) === Number(expectedFavor))
        && (expectedContra === undefined || Number(current?.partido.goles_contra) === Number(expectedContra))
        && (expectedStage === undefined || String(current?.partido.live_etapa || '') === String(expectedStage || ''));
      if (confirmedByRead) {
        await notify('El cambio quedó guardado y fue confirmado al volver a consultar el encuentro.', { title: academyName });
      } else {
        await notify(requestMessage(error, 'No fue posible actualizar el encuentro.'), { title: academyName });
      }
    } finally { setBusy(false); }
  };

  const changeScore = async (side: 'favor' | 'contra', delta: number) => {
    if (!data || !verified) return;
    const favor = Number(data.partido.goles_favor) || 0;
    const contra = Number(data.partido.goles_contra) || 0;
    await patchLive({
      resultado_favor: side === 'favor' ? Math.max(0, favor + delta) : favor,
      resultado_contra: side === 'contra' ? Math.max(0, contra + delta) : contra,
    });
  };

  const savePlayerStats = async () => {
    if (!selectedPlayer || !verified || !data?.partido.live_updated_at) {
      setVerified(false);
      setSyncError('Debemos sincronizar la versión actual del encuentro antes de guardar estadísticas.');
      await load(true);
      return;
    }
    const playerId = selectedPlayer.id;
    const playerName = selectedPlayer.nombre;
    const submittedMetrics = { ...metricDraft };
    const submittedMvp = mvpDraft;
    const expectedVersion = data.partido.live_updated_at;
    setBusy(true);
    try {
      const response = await api.put(`/api/profesores/me/partidos/${matchId}/en-vivo-v2/estadisticas/${playerId}`, {
        metricas: submittedMetrics,
        es_mvp: submittedMvp,
        expected_live_updated_at: expectedVersion,
      });
      const savedMetrics = response.data?.data?.metricas || submittedMetrics;
      const savedVersion = response.data?.live_updated_at as string | undefined;
      setData((current) => current ? {
        ...current,
        partido: savedVersion ? { ...current.partido, live_updated_at: savedVersion } : current.partido,
        jugadores: current.jugadores.map((player) => player.id === playerId
          ? { ...player, metricas: savedMetrics, es_mvp: submittedMvp }
          : submittedMvp ? { ...player, es_mvp: false } : player),
      } : current);
      setMetricDraft(savedMetrics);
      setMvpDraft(submittedMvp);
      setPlayerDraftDirty(false);
      const refreshed = await refreshAfterConfirmedMutation(`Las estadísticas de ${playerName} fueron guardadas.`);
      if (refreshed) await notify(`Estadísticas de ${playerName} actualizadas.`, { title: academyName });
    } catch (error: unknown) {
      if (await handleConcurrencyConflict(error)) {
        setBusy(false);
        return;
      }
      const current = await load(true);
      const serverPlayer = current?.jugadores.find((player) => player.id === playerId);
      const metricsMatch = serverPlayer && Object.entries(submittedMetrics).every(([key, value]) => Number(serverPlayer.metricas?.[key] || 0) === Number(value));
      if (metricsMatch && Boolean(serverPlayer?.es_mvp) === submittedMvp) {
        setPlayerDraftDirty(false);
        await notify(`Las estadísticas de ${playerName} aparecen guardadas en el servidor. No es necesario reenviarlas.`, { title: academyName });
      } else {
        await notify(requestMessage(error, 'No fue posible guardar las estadísticas.'), { title: academyName });
      }
    } finally { setBusy(false); }
  };

  const finish = async () => {
    if (!verified || !data?.partido.live_updated_at) {
      setVerified(false);
      setSyncError('Debemos sincronizar la versión actual del encuentro antes de finalizarlo.');
      await load(true);
      return;
    }
    const expectedVersion = data.partido.live_updated_at;
    const accepted = await confirmAction('¿Finalizar el encuentro? El marcador y las estadísticas quedarán guardados para revisión de dirección.', { title: academyName, confirmLabel: 'Finalizar encuentro', tone: 'danger' });
    if (!accepted) return;
    setBusy(true);
    try {
      await api.post(`/api/profesores/me/partidos/${matchId}/en-vivo-v2/finalizar`, {
        etapa: 'Finalizado',
        expected_live_updated_at: expectedVersion,
      });
      await notify('Encuentro finalizado y resultado guardado.', { title: academyName });
      onFinished?.();
      onBack();
    } catch (error: unknown) {
      if (await handleConcurrencyConflict(error)) {
        setBusy(false);
        return;
      }
      const current = await load(true);
      if (current && current.partido.estado === 'Jugado' && !current.partido.en_vivo) {
        await notify('El servidor confirma que el encuentro ya quedó finalizado y guardado.', { title: academyName });
        onFinished?.();
        onBack();
      } else {
        await notify(requestMessage(error, 'No fue posible finalizar el encuentro.'), { title: academyName });
      }
    } finally { setBusy(false); }
  };

  if (loading && !data) return <div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-10 text-center text-[#8b949e]"><ArrowPathIcon className="mx-auto h-7 w-7 animate-spin"/><p className="mt-3 text-sm font-bold">Abriendo cancha...</p></div>;

  if (!data) return <section className="rounded-3xl border border-orange-500/35 bg-orange-500/10 p-6 text-center"><p className="font-black text-orange-100">Encuentro no verificado</p><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#b1bac4]">{syncError || 'No pudimos cargar el estado del encuentro.'} No mostraremos controles operativos hasta obtener una lectura válida del servidor.</p><div className="mt-5 flex flex-wrap justify-center gap-2"><button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-[#30363d] px-4 text-sm font-black text-[#d0d7de]">Volver</button><button type="button" onClick={() => void load()} className="min-h-11 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white">Reintentar</button></div></section>;

  const { partido, sport_profile: profile } = data;
  const favor = Number(partido.goles_favor) || 0;
  const contra = Number(partido.goles_contra) || 0;
  const hasWriteVersion = !partido.en_vivo || Boolean(partido.live_updated_at);
  const canOperate = verified && hasWriteVersion && !busy;

  return (
    <div className="space-y-5 pb-8">
      <button type="button" onClick={onBack} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#30363d] bg-[#161b22] px-4 text-sm font-black text-[#d0d7de]"><ArrowLeftIcon className="h-4 w-4"/>Volver al portal</button>

      {!verified || !hasWriteVersion ? <section role="status" className="rounded-2xl border border-orange-500/35 bg-orange-500/10 p-4"><p className="text-sm font-black text-orange-100">Estado en vivo no verificado</p><p className="mt-1 text-sm leading-6 text-[#b1bac4]">{syncError || (!hasWriteVersion ? 'Falta la versión de concurrencia del encuentro.' : 'Perdimos temporalmente la verificación con el servidor.')} El marcador, etapa, estadísticas y cierre quedan bloqueados para evitar operar sobre datos desactualizados.</p><button type="button" disabled={loading} onClick={() => void load()} className="mt-3 min-h-11 rounded-xl border border-orange-400/40 px-4 text-sm font-black text-orange-100 disabled:opacity-50">{loading ? 'Sincronizando…' : 'Sincronizar ahora'}</button></section> : null}

      <section className={`overflow-hidden rounded-3xl border p-5 sm:p-7 ${partido.en_vivo ? 'border-red-400/40 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,.16),transparent_38%),#161b22]' : 'border-[#30363d] bg-[#161b22]'}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex flex-wrap items-center gap-2"><span className="text-2xl">{profile.icon}</span><span className="rounded-full bg-violet-500/15 px-3 py-1 text-[10px] font-black uppercase text-violet-300">{profile.label}</span>{partido.en_vivo ? <span className="rounded-full bg-red-500/20 px-3 py-1 text-[10px] font-black uppercase text-red-300">● En vivo</span> : null}{!verified || !hasWriteVersion ? <span className="rounded-full border border-orange-400/35 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase text-orange-200">No verificado</span> : null}</div><h1 className="mt-3 text-2xl font-black text-white sm:text-3xl">{partido.rival}</h1><p className="mt-1 text-sm text-[#8b949e]">{partido.categorias?.nombre || 'Categoría'} · {partido.fecha} · {time(partido.hora)}{partido.ubicacion ? ` · ${partido.ubicacion}` : ''}</p></div>
          <span className="rounded-xl border border-[#30363d] bg-[#0d1117] px-3 py-2 text-xs font-black text-[#b1bac4]">{partido.estado || 'Programado'}</span>
        </div>

        {profile.usesHeadToHeadScore ? (
          <div className="mx-auto mt-7 grid max-w-2xl grid-cols-[1fr_auto_1fr] items-center gap-3 text-center">
            <div><p className="text-xs font-black uppercase text-[#70e4df]">{academyName || 'Nuestra academia'}</p><p className="mt-2 text-6xl font-black text-white sm:text-7xl">{favor}</p>{partido.en_vivo ? <div className="mt-3 flex justify-center gap-2"><button disabled={!canOperate || favor <= 0} onClick={() => void changeScore('favor', -1)} className="grid h-11 w-11 place-items-center rounded-xl border border-[#30363d] bg-[#0d1117] disabled:opacity-30"><MinusIcon className="h-5 w-5"/></button><button disabled={!canOperate} onClick={() => void changeScore('favor', 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-[#289E9D] text-white disabled:opacity-50"><PlusIcon className="h-5 w-5"/></button></div> : null}</div>
            <div><p className="text-[10px] font-black uppercase text-[#697586]">{profile.scoreLabel}</p><p className="mt-2 text-3xl font-black text-[#596575]">—</p></div>
            <div><p className="text-xs font-black uppercase text-violet-300">{partido.rival}</p><p className="mt-2 text-6xl font-black text-white sm:text-7xl">{contra}</p>{partido.en_vivo ? <div className="mt-3 flex justify-center gap-2"><button disabled={!canOperate || contra <= 0} onClick={() => void changeScore('contra', -1)} className="grid h-11 w-11 place-items-center rounded-xl border border-[#30363d] bg-[#0d1117] disabled:opacity-30"><MinusIcon className="h-5 w-5"/></button><button disabled={!canOperate} onClick={() => void changeScore('contra', 1)} className="grid h-11 w-11 place-items-center rounded-xl bg-violet-600 text-white disabled:opacity-50"><PlusIcon className="h-5 w-5"/></button></div> : null}</div>
          </div>
        ) : <div className="mt-6 rounded-2xl border border-[#289E9D]/25 bg-[#289E9D]/10 p-4 text-sm text-[#c7fffb]">Esta disciplina no usa un marcador cabeza a cabeza. El modo en vivo registra la etapa y permite actualizar métricas individuales durante la competencia.</div>}

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <label><span className="mb-1 block text-xs font-black uppercase text-[#8b949e]">Periodo / etapa</span><input value={stage} onChange={(event) => { setStage(event.target.value); setStageDirty(true); }} maxLength={60} disabled={!partido.en_vivo || !canOperate} placeholder="Ej.: 1er tiempo, Set 2, Serie final" className="w-full"/></label>
          {partido.en_vivo ? <button type="button" disabled={!canOperate || !stageDirty} onClick={() => void patchLive({ etapa: stage })} className="min-h-11 self-end rounded-xl border border-[#289E9D]/40 bg-[#289E9D]/10 px-4 text-sm font-black text-[#70e4df] disabled:opacity-50">Guardar etapa</button> : null}
        </div>

        {!partido.en_vivo ? <button type="button" disabled={!canOperate || !data.puede_iniciar} onClick={() => void start()} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-red-600 px-5 text-base font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><PlayIcon className="h-6 w-6"/>{!verified ? 'Estado no verificado' : data.puede_iniciar ? 'Iniciar encuentro en vivo' : partido.estado === 'Jugado' ? 'Encuentro finalizado' : 'Disponible el día del encuentro'}</button> : null}
      </section>

      {partido.en_vivo && data.jugadores.length ? (
        <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-4 sm:p-5">
          <div className="flex items-center gap-2"><UserGroupIcon className="h-6 w-6 text-[#70e4df]"/><div><h2 className="font-black text-white">Rendimiento individual</h2><p className="text-xs text-[#8b949e]">Opcional. Registra solo lo útil durante el encuentro; el resultado puede revisarse después.</p></div></div>
          <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
            {data.jugadores.map((player) => <button key={player.id} type="button" onClick={() => { setPlayerDraftDirty(false); setSelectedPlayerId(player.id); }} className={`flex min-w-[155px] items-center gap-2 rounded-xl border p-2 text-left ${selectedPlayerId === player.id ? 'border-[#289E9D] bg-[#289E9D]/10' : 'border-[#30363d] bg-[#0d1117]'}`}>{player.foto_url || player.avatar_url ? <img src={player.foto_url || player.avatar_url || ''} alt="" className="h-9 w-9 rounded-lg object-cover"/> : <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#21262d] font-black">{player.nombre.slice(0,1)}</div>}<div className="min-w-0"><p className="truncate text-xs font-black text-white">{player.nombre}</p><p className="truncate text-[10px] text-[#8b949e]">{player.rol_plan || player.posicion || 'Plantel'}</p></div></button>)}
          </div>

          {selectedPlayer ? <div className="mt-3 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-black text-white">{selectedPlayer.nombre}</p><p className="text-xs text-[#8b949e]">{selectedPlayer.posicion || selectedPlayer.rol_plan || 'Sin posición registrada'}</p></div><button type="button" disabled={!canOperate} onClick={() => { setMvpDraft((value) => !value); setPlayerDraftDirty(true); }} className={`inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 text-xs font-black disabled:opacity-45 ${mvpDraft ? 'border-amber-400/40 bg-amber-500/15 text-amber-200' : 'border-[#30363d] text-[#8b949e]'}`}><StarIcon className="h-4 w-4"/>{mvpDraft ? 'Destacado/a' : 'Marcar destacado/a'}</button></div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{profile.metrics.map((metric) => {
              const step = metricStep(metric.decimals);
              const value = Number(metricDraft[metric.code] || 0);
              return <div key={metric.code} className="rounded-xl border border-[#30363d] bg-[#161b22] p-3"><p className="text-xs font-black text-[#b1bac4]">{metric.label}</p><div className="mt-2 grid grid-cols-[40px_1fr_40px] gap-2"><button type="button" disabled={!canOperate} onClick={() => { setMetricDraft((current) => ({ ...current, [metric.code]: Math.max(0, Number(current[metric.code] || 0) - step) })); setPlayerDraftDirty(true); }} className="grid h-10 place-items-center rounded-lg border border-[#30363d] disabled:opacity-40"><MinusIcon className="h-4 w-4"/></button><input type="number" min="0" step={step} disabled={!canOperate} value={value} onChange={(event) => { setMetricDraft((current) => ({ ...current, [metric.code]: Math.max(0, Number(event.target.value) || 0) })); setPlayerDraftDirty(true); }} className="h-10 min-w-0 text-center"/><button type="button" disabled={!canOperate} onClick={() => { setMetricDraft((current) => ({ ...current, [metric.code]: Number(current[metric.code] || 0) + step })); setPlayerDraftDirty(true); }} className="grid h-10 place-items-center rounded-lg bg-[#289E9D] text-white disabled:opacity-40"><PlusIcon className="h-4 w-4"/></button></div></div>;
            })}</div>
            <button type="button" disabled={!canOperate || !playerDraftDirty} onClick={() => void savePlayerStats()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[#289E9D]/40 bg-[#289E9D]/10 px-4 text-sm font-black text-[#70e4df] disabled:opacity-50"><CheckCircleIcon className="h-5 w-5"/>{!verified ? 'Estado no verificado' : playerDraftDirty ? `Guardar estadísticas de ${selectedPlayer.nombre.split(' ')[0]}` : 'Estadísticas sin cambios'}</button>
          </div> : null}
        </section>
      ) : null}

      {partido.en_vivo ? <section className="rounded-3xl border border-red-500/25 bg-red-500/[.06] p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-black text-white">Cerrar jornada competitiva</h2><p className="mt-1 text-xs text-[#8b949e]">Finalizar detiene el modo en vivo. Dirección conserva la revisión final del resultado y estadísticas.</p></div><button disabled={!canOperate} type="button" onClick={() => void finish()} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-red-600 px-5 text-sm font-black text-white disabled:opacity-50"><StopIcon className="h-5 w-5"/>Finalizar encuentro</button></div></section> : null}

      {data.eventos.length ? <details className="rounded-2xl border border-[#30363d] bg-[#161b22] p-4"><summary className="cursor-pointer text-sm font-black text-[#b1bac4]">Bitácora en vivo · {data.eventos.length} movimientos recientes{verified ? '' : ' · última lectura'}</summary><div className="mt-3 space-y-2">{data.eventos.slice(0, 10).map((event) => <div key={event.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#0d1117] px-3 py-2 text-xs"><span className="font-bold capitalize text-[#d0d7de]">{event.accion}</span><span className="text-[#697586]">{new Date(event.created_at).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}</span></div>)}</div></details> : null}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axiosConfig';
import { useAppDialog } from '../../contexts/DialogContext';
import type { ProfessorCase, ProfessorCaseMessage, ProfessorCasePriority, ProfessorCaseType } from './types';

type Category = { id: string; nombre: string; ramas?: { id: string; nombre: string; disciplina: string } | null };
type Player = { id: string; nombre: string; foto_url?: string | null; avatar_url?: string | null };
type CaseDetail = ProfessorCase & { mensajes: ProfessorCaseMessage[] };

type Props = {
  categories: Category[];
  academyName?: string;
};

const TYPE_LABELS: Record<ProfessorCaseType, string> = {
  seguimiento: 'Seguimiento deportivo',
  conducta: 'Conducta / convivencia',
  salud: 'Salud / lesión',
  asistencia: 'Asistencia',
  familiar: 'Situación familiar',
  operativo: 'Operativo',
  feedback: 'Feedback con dirección',
  otro: 'Otro',
};
const PRIORITY_LABELS: Record<ProfessorCasePriority, string> = { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };
const STATE_LABELS = { abierto: 'Abierto', en_revision: 'En revisión', resuelto: 'Resuelto' } as const;
const todayChile = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const requestMessage = (error: unknown, fallback: string) => {
  const requestError = error as { response?: { data?: { error?: string } }; message?: string };
  return requestError.response?.data?.error || requestError.message || fallback;
};

export default function ProfessorCasesPanel({ categories, academyName }: Props) {
  const { notify } = useAppDialog();
  const [cases, setCases] = useState<ProfessorCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [casesVerified, setCasesVerified] = useState(false);
  const [casesError, setCasesError] = useState('');
  const [creating, setCreating] = useState(false);
  const [composeOpen, setComposeOpen] = useState(false);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRefreshError, setDetailRefreshError] = useState('');
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playerLoading, setPlayerLoading] = useState(false);
  const [playerVerified, setPlayerVerified] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [playerReloadKey, setPlayerReloadKey] = useState(0);
  const [form, setForm] = useState({ categoria_id: '', jugador_id: '', tipo: 'seguimiento' as ProfessorCaseType, prioridad: 'normal' as ProfessorCasePriority, titulo: '', detalle: '' });

  const loadCases = useCallback(async () => {
    setLoading(true);
    setCasesError('');
    try {
      const response = await api.get('/api/profesores/me/casos');
      setCases(Array.isArray(response.data?.data) ? response.data.data as ProfessorCase[] : []);
      setCasesVerified(true);
      return true;
    } catch (error: unknown) {
      setCasesVerified(false);
      setCasesError(requestMessage(error, 'No fue posible verificar los casos con dirección.'));
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadCases(); }, [loadCases]);

  useEffect(() => {
    if (!form.categoria_id) {
      setPlayers([]);
      setPlayerLoading(false);
      setPlayerVerified(false);
      setPlayerError('');
      setForm((current) => current.jugador_id ? { ...current, jugador_id: '' } : current);
      return;
    }

    let active = true;
    setPlayers([]);
    setPlayerVerified(false);
    setPlayerError('');
    setPlayerLoading(true);
    api.get(`/api/profesores/me/categorias/${form.categoria_id}/asistencia`, { params: { fecha: todayChile() } })
      .then((response) => {
        if (!active) return;
        setPlayers(Array.isArray(response.data?.data?.jugadores) ? response.data.data.jugadores as Player[] : []);
        setPlayerVerified(true);
      })
      .catch((error: unknown) => {
        if (!active) return;
        setPlayers([]);
        setPlayerVerified(false);
        setPlayerError(requestMessage(error, 'No fue posible verificar los alumnos de esta categoría.'));
      })
      .finally(() => { if (active) setPlayerLoading(false); });
    return () => { active = false; };
  }, [form.categoria_id, playerReloadKey]);

  const openDetail = async (item: ProfessorCase) => {
    setDetail(null);
    setReply('');
    setDetailRefreshError('');
    setDetailLoading(true);
    try {
      const response = await api.get(`/api/profesores/me/casos/${item.id}`);
      setDetail(response.data.data as CaseDetail);
    } catch (error: unknown) {
      await notify(requestMessage(error, 'No fue posible abrir el caso.'), { title: academyName });
    } finally {
      setDetailLoading(false);
    }
  };

  const createCase = async () => {
    if (form.titulo.trim().length < 3) return void notify('Escribe un título breve para identificar el caso.', { title: academyName });
    setCreating(true);
    try {
      const response = await api.post('/api/profesores/me/casos', {
        ...form,
        categoria_id: form.categoria_id || null,
        jugador_id: form.jugador_id || null,
      });
      const created = response.data?.data as ProfessorCase | undefined;
      if (created?.id) setCases((current) => [created, ...current.filter((item) => item.id !== created.id)]);
      setForm({ categoria_id: '', jugador_id: '', tipo: 'seguimiento', prioridad: 'normal', titulo: '', detalle: '' });
      setComposeOpen(false);
      const refreshed = await loadCases();
      await notify(
        refreshed
          ? 'Caso enviado a dirección. Quedará trazado en tu portal.'
          : 'Caso enviado correctamente a dirección. No pudimos actualizar la bandeja completa; la dejamos marcada como no verificada para evitar información engañosa.',
        { title: academyName },
      );
    } catch (error: unknown) {
      await notify(requestMessage(error, 'No fue posible crear el caso.'), { title: academyName });
    } finally {
      setCreating(false);
    }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    const caseId = detail.id;
    const message = reply.trim();
    setReplying(true);
    setDetailRefreshError('');

    try {
      await api.post(`/api/profesores/me/casos/${caseId}/mensajes`, { mensaje: message });
    } catch (error: unknown) {
      setReplying(false);
      await notify(requestMessage(error, 'No fue posible enviar el mensaje.'), { title: academyName });
      return;
    }

    // A partir de este punto el POST ya fue confirmado por el servidor. Ningún
    // error de refresco posterior debe hacer creer al profesor que el mensaje falló.
    setReply('');
    let detailRefreshed = false;
    try {
      const response = await api.get(`/api/profesores/me/casos/${caseId}`);
      setDetail(response.data.data as CaseDetail);
      detailRefreshed = true;
    } catch {
      setDetailRefreshError('Mensaje enviado correctamente. No pudimos actualizar la conversación en pantalla; evita reenviarlo y usa “Actualizar conversación” antes de continuar.');
    }

    const listRefreshed = await loadCases();
    setReplying(false);
    if (!detailRefreshed) {
      await notify('Mensaje enviado correctamente. La conversación no pudo refrescarse; evita enviarlo otra vez hasta actualizar la vista.', { title: academyName });
    } else if (!listRefreshed) {
      await notify('Mensaje enviado correctamente. La bandeja general quedó no verificada temporalmente, pero el envío ya fue confirmado.', { title: academyName });
    }
  };

  const refreshDetail = async () => {
    if (!detail) return;
    setDetailLoading(true);
    setDetailRefreshError('');
    try {
      const response = await api.get(`/api/profesores/me/casos/${detail.id}`);
      setDetail(response.data.data as CaseDetail);
    } catch (error: unknown) {
      setDetailRefreshError(requestMessage(error, 'No fue posible actualizar la conversación.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const openCases = useMemo(() => cases.filter((item) => item.estado !== 'resuelto'), [cases]);
  const resolvedCases = useMemo(() => cases.filter((item) => item.estado === 'resuelto'), [cases]);

  const priorityClass = (priority: ProfessorCasePriority) => priority === 'urgente' ? 'border-red-400/35 bg-red-500/10 text-red-200' : priority === 'alta' ? 'border-orange-400/35 bg-orange-500/10 text-orange-200' : priority === 'baja' ? 'border-slate-400/20 bg-slate-500/10 text-slate-300' : 'border-[#289E9D]/25 bg-[#289E9D]/10 text-[#70e4df]';

  const card = (item: ProfessorCase) => (
    <button key={item.id} type="button" onClick={() => void openDetail(item)} className="w-full rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 text-left transition hover:border-[#289E9D]/45">
      <div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${priorityClass(item.prioridad)}`}>{PRIORITY_LABELS[item.prioridad]}</span><span className="rounded-full bg-[#21262d] px-2 py-1 text-[9px] font-black uppercase text-[#8b949e]">{STATE_LABELS[item.estado]}</span>{item.origen === 'direccion' ? <span className="rounded-full bg-violet-500/15 px-2 py-1 text-[9px] font-black uppercase text-violet-300">Dirección</span> : null}</div><h3 className="mt-2 truncate font-black text-white">{item.titulo}</h3><p className="mt-1 line-clamp-2 text-xs leading-5 text-[#8b949e]">{item.detalle || TYPE_LABELS[item.tipo]}</p><p className="mt-2 text-[10px] font-bold uppercase text-[#697586]">{TYPE_LABELS[item.tipo]}{item.categoria?.nombre ? ` · ${item.categoria.nombre}` : ''}{item.jugador?.nombre ? ` · ${item.jugador.nombre}` : ''}</p>{item.ultimo_mensaje ? <p className="mt-2 line-clamp-1 text-xs text-[#b1bac4]">💬 {item.ultimo_mensaje.mensaje}</p> : null}</div><ChevronRightIcon className="h-5 w-5 shrink-0 text-[#697586]"/></div>
    </button>
  );

  const playerSelectorLabel = !form.categoria_id
    ? 'Selecciona una categoría primero'
    : playerLoading
      ? 'Verificando alumnos...'
      : playerVerified
        ? 'Sin alumno específico'
        : 'Alumnos no verificados';

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-[#30363d] bg-[#161b22] p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2"><ChatBubbleLeftRightIcon className="h-6 w-6 text-[#70e4df]"/><h2 className="text-xl font-black text-white">Casos y feedback</h2></div><p className="mt-1 max-w-2xl text-sm text-[#8b949e]">Escala situaciones que requieren seguimiento y conversa con dirección sin perder contexto. No reemplaza la gestión de cancha: solo documenta lo importante.</p></div><button type="button" onClick={() => setComposeOpen((value) => !value)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white"><PlusIcon className="h-5 w-5"/>Nuevo caso</button></div></section>

      {casesError ? <section role="status" className="rounded-2xl border border-orange-500/35 bg-orange-500/10 p-4"><p className="text-sm font-black text-orange-200">Bandeja no verificada</p><p className="mt-1 text-sm leading-6 text-[#b1bac4]">{casesError} {cases.length ? 'Los casos visibles corresponden a la última carga disponible y pueden estar desactualizados.' : 'No mostraremos una bandeja vacía como si significara que no existen casos.'}</p><button type="button" disabled={loading} onClick={() => void loadCases()} className="mt-3 min-h-11 rounded-xl border border-orange-400/40 px-4 text-sm font-black text-orange-200 disabled:opacity-50">{loading ? 'Verificando…' : 'Reintentar'}</button></section> : null}

      {composeOpen ? <section className="rounded-3xl border border-[#289E9D]/30 bg-[#161b22] p-5"><div className="flex items-center justify-between"><h3 className="font-black text-white">Informar a dirección</h3><button type="button" aria-label="Cerrar nuevo caso" onClick={() => setComposeOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#30363d]"><XMarkIcon className="h-5 w-5"/></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="label">Tipo</span><select value={form.tipo} onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value as ProfessorCaseType }))}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="label">Prioridad</span><select value={form.prioridad} onChange={(event) => setForm((current) => ({ ...current, prioridad: event.target.value as ProfessorCasePriority }))}>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="label">Categoría (opcional)</span><select value={form.categoria_id} onChange={(event) => setForm((current) => ({ ...current, categoria_id: event.target.value, jugador_id: '' }))}><option value="">General / sin categoría</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.ramas?.disciplina ? `${category.ramas.disciplina} · ` : ''}{category.nombre}</option>)}</select></label><label><span className="label">Alumno (opcional)</span><select disabled={!form.categoria_id || playerLoading || !playerVerified} value={form.jugador_id} onChange={(event) => setForm((current) => ({ ...current, jugador_id: event.target.value }))}><option value="">{playerSelectorLabel}</option>{players.map((player) => <option key={player.id} value={player.id}>{player.nombre}</option>)}</select>{playerError ? <div role="status" className="mt-2 rounded-xl border border-orange-500/30 bg-orange-500/10 p-3 text-xs leading-5 text-orange-100"><p>{playerError}</p><p className="mt-1 text-[#b1bac4]">Puedes informar el caso asociado solo a la categoría, o reintentar antes de seleccionar un alumno.</p><button type="button" onClick={() => setPlayerReloadKey((value) => value + 1)} className="mt-2 min-h-10 rounded-lg border border-orange-400/40 px-3 font-black text-orange-100">Reintentar alumnos</button></div> : null}</label></div><label className="mt-3 block"><span className="label">Título</span><input maxLength={160} value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} placeholder="Ej.: Seguimiento por molestias en rodilla"/></label><label className="mt-3 block"><span className="label">Contexto</span><textarea maxLength={5000} rows={5} value={form.detalle} onChange={(event) => setForm((current) => ({ ...current, detalle: event.target.value }))} placeholder="Describe lo necesario para que dirección pueda tomar una decisión. Evita información irrelevante."/></label><button type="button" disabled={creating} onClick={() => void createCase()} className="mt-4 min-h-12 w-full rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-50">{creating ? 'Enviando...' : 'Enviar a dirección'}</button></section> : null}

      {loading && !cases.length ? <div className="rounded-2xl border border-[#30363d] bg-[#161b22] p-8 text-center text-[#8b949e]"><ArrowPathIcon className="mx-auto h-6 w-6 animate-spin"/><p className="mt-3 text-sm font-bold">Verificando casos…</p></div> : null}
      {loading && cases.length ? <div role="status" className="rounded-xl border border-[#30363d] bg-[#161b22] px-4 py-3 text-xs font-bold text-[#8b949e]">Actualizando la bandeja sin ocultar la última carga disponible…</div> : null}

      {(!loading || cases.length) && (casesVerified || cases.length) ? <section className="grid gap-5 lg:grid-cols-[1fr_.42fr]"><div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-4 sm:p-5"><div className="flex items-center justify-between"><h3 className="font-black text-white">Pendientes</h3><span className="rounded-full bg-[#0d1117] px-3 py-1 text-xs font-black text-[#8b949e]">{casesVerified ? openCases.length : `Última carga · ${openCases.length}`}</span></div><div className="mt-3 space-y-3">{openCases.length ? openCases.map(card) : casesVerified ? <div className="rounded-2xl border border-dashed border-[#30363d] p-7 text-center text-sm text-[#8b949e]">No tienes casos pendientes con dirección.</div> : <div className="rounded-2xl border border-dashed border-orange-500/30 p-7 text-center text-sm text-[#b1bac4]">No podemos confirmar si existen casos pendientes hasta volver a verificar la bandeja.</div>}</div></div><div className="rounded-3xl border border-[#30363d] bg-[#161b22] p-4 sm:p-5"><h3 className="font-black text-white">Resueltos</h3><div className="mt-3 space-y-2">{resolvedCases.slice(0, 8).map(card)}{!resolvedCases.length ? casesVerified ? <p className="text-sm text-[#697586]">Sin historial resuelto todavía.</p> : <p className="text-sm text-[#8b949e]">Historial no verificado.</p> : null}</div></div></section> : null}

      {(detail || detailLoading) ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><section role="dialog" aria-modal="true" aria-labelledby="professor-case-dialog-title" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#30363d] bg-[#161b22] p-5 shadow-2xl sm:p-6">{detailLoading && !detail ? <div className="py-16 text-center"><ArrowPathIcon className="mx-auto h-7 w-7 animate-spin text-[#70e4df]"/><p className="mt-3 text-sm text-[#8b949e]">Verificando conversación…</p></div> : detail ? <><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${priorityClass(detail.prioridad)}`}>{PRIORITY_LABELS[detail.prioridad]}</span><span className="rounded-full bg-[#0d1117] px-2 py-1 text-[9px] font-black uppercase text-[#8b949e]">{STATE_LABELS[detail.estado]}</span></div><h2 id="professor-case-dialog-title" className="mt-3 text-xl font-black text-white">{detail.titulo}</h2><p className="mt-1 text-xs text-[#697586]">{TYPE_LABELS[detail.tipo]}{detail.categoria?.nombre ? ` · ${detail.categoria.nombre}` : ''}{detail.jugador?.nombre ? ` · ${detail.jugador.nombre}` : ''}</p></div><button type="button" aria-label="Cerrar conversación" onClick={() => { setDetail(null); setDetailRefreshError(''); }} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#30363d]"><XMarkIcon className="h-5 w-5"/></button></div>{detailRefreshError ? <div role="status" className="mt-4 rounded-xl border border-orange-500/35 bg-orange-500/10 p-3 text-sm leading-6 text-orange-100"><p>{detailRefreshError}</p><button type="button" disabled={detailLoading} onClick={() => void refreshDetail()} className="mt-2 min-h-10 rounded-lg border border-orange-400/40 px-3 font-black text-orange-100">{detailLoading ? 'Actualizando…' : 'Actualizar conversación'}</button></div> : null}<div className="mt-4 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 text-sm leading-6 text-[#d0d7de]">{detail.detalle || 'Sin detalle inicial.'}</div><div className="mt-5 space-y-3">{(detail.mensajes || []).map((message) => <div key={message.id} className={`max-w-[88%] rounded-2xl border p-3 ${message.autor_rol === 'profesor' ? 'ml-auto border-[#289E9D]/30 bg-[#289E9D]/10' : 'border-violet-400/25 bg-violet-500/10'}`}><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase text-[#8b949e]">{message.autor_nombre}</p><p className="text-[10px] text-[#697586]">{new Date(message.created_at).toLocaleString('es-CL')}</p></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#f0f6fc]">{message.mensaje}</p></div>)}</div>{detail.estado !== 'resuelto' ? <div className="mt-5 border-t border-[#30363d] pt-4"><textarea rows={3} maxLength={5000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Responder a dirección..."/><button disabled={replying || !reply.trim()} type="button" onClick={() => void sendReply()} className="mt-2 min-h-11 w-full rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-40">{replying ? 'Enviando...' : 'Enviar respuesta'}</button></div> : <div className="mt-5 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200">Caso resuelto por dirección.</div>}</> : null}</section></div> : null}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ChevronRightIcon,
  PlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../../api/axiosConfig';
import { useAppDialog } from '../../contexts/DialogContext';
import type { ProfessorCase, ProfessorCaseMessage, ProfessorCasePriority, ProfessorCaseState, ProfessorCaseType } from './types';

type Professor = { id: string; nombre_completo: string; categorias?: Category[] };
type Category = { id: string; nombre: string; ramas?: { id: string; nombre: string; disciplina: string } | null };
type CaseDetail = ProfessorCase & { mensajes: ProfessorCaseMessage[] };

const TYPE_LABELS: Record<ProfessorCaseType, string> = {
  seguimiento: 'Seguimiento deportivo', conducta: 'Conducta / convivencia', salud: 'Salud / lesión', asistencia: 'Asistencia', familiar: 'Situación familiar', operativo: 'Operativo', feedback: 'Feedback', otro: 'Otro',
};
const PRIORITY_LABELS: Record<ProfessorCasePriority, string> = { baja: 'Baja', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' };
const STATE_LABELS: Record<ProfessorCaseState, string> = { abierto: 'Abierto', en_revision: 'En revisión', resuelto: 'Resuelto' };

export default function DirectorProfessorCasesPanel() {
  const { notify } = useAppDialog();
  const [cases, setCases] = useState<ProfessorCase[]>([]);
  const [professors, setProfessors] = useState<Professor[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterState, setFilterState] = useState<'todos' | ProfessorCaseState>('todos');
  const [filterProfessor, setFilterProfessor] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<CaseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [reply, setReply] = useState('');
  const [replying, setReplying] = useState(false);
  const [form, setForm] = useState({ profesor_id: '', categoria_id: '', tipo: 'feedback' as ProfessorCaseType, prioridad: 'normal' as ProfessorCasePriority, titulo: '', detalle: '' });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [casesResponse, professorsResponse] = await Promise.all([
        api.get('/api/profesores/casos'),
        api.get('/api/profesores'),
      ]);
      setCases((casesResponse.data.data || []) as ProfessorCase[]);
      setProfessors((professorsResponse.data.data || []) as Professor[]);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible cargar los casos del equipo técnico.');
    } finally { setLoading(false); }
  }, [notify]);

  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => cases.filter((item) => (filterState === 'todos' || item.estado === filterState) && (!filterProfessor || item.profesor_id === filterProfessor)), [cases, filterProfessor, filterState]);
  const openCount = useMemo(() => cases.filter((item) => item.estado !== 'resuelto').length, [cases]);
  const urgentCount = useMemo(() => cases.filter((item) => item.estado !== 'resuelto' && (item.prioridad === 'alta' || item.prioridad === 'urgente')).length, [cases]);
  const selectedProfessor = professors.find((item) => item.id === form.profesor_id) || null;

  const priorityClass = (priority: ProfessorCasePriority) => priority === 'urgente' ? 'border-red-400/35 bg-red-500/10 text-red-200' : priority === 'alta' ? 'border-orange-400/35 bg-orange-500/10 text-orange-200' : priority === 'baja' ? 'border-slate-400/20 bg-slate-500/10 text-slate-300' : 'border-[#289E9D]/25 bg-[#289E9D]/10 text-[#70e4df]';

  const openDetail = async (item: ProfessorCase) => {
    setDetailLoading(true);
    try {
      const response = await api.get(`/api/profesores/casos/${item.id}`);
      setDetail(response.data.data as CaseDetail);
      setReply('');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible abrir el caso.');
    } finally { setDetailLoading(false); }
  };

  const createFeedback = async () => {
    if (!form.profesor_id || form.titulo.trim().length < 3) return void notify('Selecciona un profesor y escribe un título para el feedback.');
    setCreating(true);
    try {
      await api.post('/api/profesores/casos', { ...form, categoria_id: form.categoria_id || null });
      setComposeOpen(false);
      setForm({ profesor_id: '', categoria_id: '', tipo: 'feedback', prioridad: 'normal', titulo: '', detalle: '' });
      await load();
      await notify('Feedback creado. El profesor lo verá en su portal.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible crear el feedback.');
    } finally { setCreating(false); }
  };

  const sendReply = async () => {
    if (!detail || !reply.trim()) return;
    setReplying(true);
    try {
      await api.post(`/api/profesores/casos/${detail.id}/mensajes`, { mensaje: reply });
      setReply('');
      const response = await api.get(`/api/profesores/casos/${detail.id}`);
      setDetail(response.data.data as CaseDetail);
      await load();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible responder el caso.');
    } finally { setReplying(false); }
  };

  const updateCase = async (changes: Partial<Pick<ProfessorCase, 'estado' | 'prioridad'>>) => {
    if (!detail) return;
    try {
      await api.patch(`/api/profesores/casos/${detail.id}`, changes);
      const response = await api.get(`/api/profesores/casos/${detail.id}`);
      setDetail(response.data.data as CaseDetail);
      await load();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible actualizar el caso.');
    }
  };

  return (
    <section className="mt-6 rounded-3xl border border-[#30363d] bg-[#161b22] p-4 sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div><div className="flex items-center gap-2"><ChatBubbleLeftRightIcon className="h-6 w-6 text-[#70e4df]"/><h2 className="text-xl font-black text-white">Casos y feedback del equipo técnico</h2></div><p className="mt-1 max-w-3xl text-sm leading-6 text-[#8b949e]">La asignación de categorías sigue siendo el permiso principal. Esta bandeja solo ordena situaciones que requieren decisión, seguimiento o conversación con el profesor.</p></div><button type="button" onClick={() => setComposeOpen((value) => !value)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white"><PlusIcon className="h-5 w-5"/>Dar feedback</button></div>

      <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4"><div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4"><p className="text-2xl font-black text-white">{openCount}</p><p className="text-xs text-[#8b949e]">Pendientes</p></div><div className="rounded-2xl border border-orange-400/25 bg-orange-500/10 p-4"><p className="text-2xl font-black text-orange-200">{urgentCount}</p><p className="text-xs text-[#8b949e]">Alta / urgente</p></div><label className="col-span-2 lg:col-span-1"><span className="label">Estado</span><select value={filterState} onChange={(event) => setFilterState(event.target.value as 'todos' | ProfessorCaseState)}><option value="todos">Todos</option><option value="abierto">Abiertos</option><option value="en_revision">En revisión</option><option value="resuelto">Resueltos</option></select></label><label className="col-span-2 lg:col-span-1"><span className="label">Profesor</span><select value={filterProfessor} onChange={(event) => setFilterProfessor(event.target.value)}><option value="">Todos</option>{professors.map((professor) => <option key={professor.id} value={professor.id}>{professor.nombre_completo}</option>)}</select></label></div>

      {composeOpen ? <div className="mt-5 rounded-2xl border border-[#289E9D]/30 bg-[#0d1117] p-4"><div className="flex items-center justify-between"><h3 className="font-black text-white">Nuevo feedback</h3><button type="button" onClick={() => setComposeOpen(false)} className="grid h-9 w-9 place-items-center rounded-lg border border-[#30363d]"><XMarkIcon className="h-5 w-5"/></button></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label><span className="label">Profesor</span><select value={form.profesor_id} onChange={(event) => setForm((current) => ({ ...current, profesor_id: event.target.value, categoria_id: '' }))}><option value="">Seleccionar</option>{professors.map((professor) => <option key={professor.id} value={professor.id}>{professor.nombre_completo}</option>)}</select></label><label><span className="label">Categoría (opcional)</span><select disabled={!selectedProfessor} value={form.categoria_id} onChange={(event) => setForm((current) => ({ ...current, categoria_id: event.target.value }))}><option value="">General</option>{(selectedProfessor?.categorias || []).map((category) => <option key={category.id} value={category.id}>{category.ramas?.disciplina ? `${category.ramas.disciplina} · ` : ''}{category.nombre}</option>)}</select></label><label><span className="label">Tipo</span><select value={form.tipo} onChange={(event) => setForm((current) => ({ ...current, tipo: event.target.value as ProfessorCaseType }))}>{Object.entries(TYPE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="label">Prioridad</span><select value={form.prioridad} onChange={(event) => setForm((current) => ({ ...current, prioridad: event.target.value as ProfessorCasePriority }))}>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label></div><label className="mt-3 block"><span className="label">Título</span><input maxLength={160} value={form.titulo} onChange={(event) => setForm((current) => ({ ...current, titulo: event.target.value }))} placeholder="Ej.: Feedback del entrenamiento del martes"/></label><label className="mt-3 block"><span className="label">Mensaje inicial</span><textarea rows={4} maxLength={5000} value={form.detalle} onChange={(event) => setForm((current) => ({ ...current, detalle: event.target.value }))} placeholder="Contexto concreto, decisión o punto a conversar."/></label><button disabled={creating} type="button" onClick={() => void createFeedback()} className="mt-4 min-h-11 w-full rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-50">{creating ? 'Creando...' : 'Crear feedback'}</button></div> : null}

      {loading ? <div className="py-10 text-center text-[#8b949e]"><ArrowPathIcon className="mx-auto h-6 w-6 animate-spin"/></div> : <div className="mt-5 grid gap-3 lg:grid-cols-2">{filtered.map((item) => <button key={item.id} type="button" onClick={() => void openDetail(item)} className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 text-left transition hover:border-[#289E9D]/40"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${priorityClass(item.prioridad)}`}>{PRIORITY_LABELS[item.prioridad]}</span><span className="rounded-full bg-[#21262d] px-2 py-1 text-[9px] font-black uppercase text-[#8b949e]">{STATE_LABELS[item.estado]}</span>{item.origen === 'profesor' ? <span className="rounded-full bg-[#289E9D]/10 px-2 py-1 text-[9px] font-black uppercase text-[#70e4df]">Profesor</span> : <span className="rounded-full bg-violet-500/10 px-2 py-1 text-[9px] font-black uppercase text-violet-300">Dirección</span>}</div><h3 className="mt-2 truncate font-black text-white">{item.titulo}</h3><p className="mt-1 text-xs text-[#8b949e]">{item.profesor?.nombre_completo || 'Profesor'}{item.categoria?.nombre ? ` · ${item.categoria.nombre}` : ''}{item.jugador?.nombre ? ` · ${item.jugador.nombre}` : ''}</p><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#697586]">{item.ultimo_mensaje?.mensaje || item.detalle || TYPE_LABELS[item.tipo]}</p></div><ChevronRightIcon className="h-5 w-5 shrink-0 text-[#697586]"/></div></button>)}{!filtered.length ? <div className="col-span-full rounded-2xl border border-dashed border-[#30363d] p-8 text-center text-sm text-[#8b949e]">No hay casos con esos filtros.</div> : null}</div>}

      {(detail || detailLoading) ? <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"><div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#30363d] bg-[#161b22] p-5 shadow-2xl sm:p-6">{detailLoading && !detail ? <div className="py-16 text-center"><ArrowPathIcon className="mx-auto h-7 w-7 animate-spin text-[#70e4df]"/></div> : detail ? <><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${priorityClass(detail.prioridad)}`}>{PRIORITY_LABELS[detail.prioridad]}</span><span className="rounded-full bg-[#0d1117] px-2 py-1 text-[9px] font-black uppercase text-[#8b949e]">{STATE_LABELS[detail.estado]}</span></div><h2 className="mt-3 text-xl font-black text-white">{detail.titulo}</h2><p className="mt-1 text-xs text-[#697586]">{detail.profesor?.nombre_completo || 'Profesor'} · {TYPE_LABELS[detail.tipo]}{detail.categoria?.nombre ? ` · ${detail.categoria.nombre}` : ''}</p></div><button type="button" onClick={() => setDetail(null)} className="grid h-10 w-10 place-items-center rounded-xl border border-[#30363d]"><XMarkIcon className="h-5 w-5"/></button></div><div className="mt-4 rounded-2xl border border-[#30363d] bg-[#0d1117] p-4 text-sm leading-6 text-[#d0d7de]">{detail.detalle || 'Sin detalle inicial.'}</div><div className="mt-4 grid gap-2 sm:grid-cols-2"><label><span className="label">Prioridad</span><select value={detail.prioridad} onChange={(event) => void updateCase({ prioridad: event.target.value as ProfessorCasePriority })}>{Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span className="label">Estado</span><select value={detail.estado} onChange={(event) => void updateCase({ estado: event.target.value as ProfessorCaseState })}><option value="abierto">Abierto</option><option value="en_revision">En revisión</option><option value="resuelto">Resuelto</option></select></label></div><div className="mt-5 space-y-3">{(detail.mensajes || []).map((message) => <div key={message.id} className={`max-w-[88%] rounded-2xl border p-3 ${message.autor_rol === 'director' ? 'ml-auto border-violet-400/25 bg-violet-500/10' : 'border-[#289E9D]/30 bg-[#289E9D]/10'}`}><div className="flex items-center justify-between gap-3"><p className="text-[10px] font-black uppercase text-[#8b949e]">{message.autor_nombre}</p><p className="text-[10px] text-[#697586]">{new Date(message.created_at).toLocaleString('es-CL')}</p></div><p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-[#f0f6fc]">{message.mensaje}</p></div>)}</div>{detail.estado !== 'resuelto' ? <div className="mt-5 border-t border-[#30363d] pt-4"><textarea rows={3} maxLength={5000} value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Responder al profesor..."/><button disabled={replying || !reply.trim()} type="button" onClick={() => void sendReply()} className="mt-2 min-h-11 w-full rounded-xl bg-[#289E9D] px-4 text-sm font-black text-white disabled:opacity-40">{replying ? 'Enviando...' : 'Responder'}</button></div> : <div className="mt-5 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-3 text-sm font-bold text-emerald-200"><CheckCircleIcon className="h-5 w-5"/>Caso resuelto. Puedes reabrirlo desde el selector de estado.</div>}</> : null}</div></div> : null}
    </section>
  );
}

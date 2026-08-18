import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowPathIcon, MegaphoneIcon, PaperAirplaneIcon, PlusIcon, ShieldExclamationIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';

type CategoryCandidate = {
  id: string;
  nombre: string;
  sede_id?: string | null;
  rama_id?: string | null;
  ramas?: { id:string; nombre:string; disciplina:string } | null;
  sedes?: { id:string; nombre:string } | null;
  apoderados_con_whatsapp: number;
};
type Candidates = { global_count: number; categories: CategoryCandidate[] };
type Group = {
  id: string;
  categoria_id?: string | null;
  scope: 'global' | 'categoria';
  nombre: string;
  group_jid?: string | null;
  estado: 'creando' | 'activo' | 'error' | 'cerrado';
  participantes_objetivo: number;
  participantes_agregados: number;
  last_error?: string | null;
  created_at: string;
  last_sync_at?: string | null;
  categorias?: {
    id: string;
    nombre: string;
    rama_id?: string | null;
    sede_id?: string | null;
    ramas?: { id:string; nombre:string; disciplina:string } | null;
    sedes?: { id:string; nombre:string } | null;
  } | null;
};

const categoryLabel = (category?: CategoryCandidate | Group['categorias'] | null) => {
  if (!category) return 'Categoría sin contexto';
  const branch = category.ramas ? `${category.ramas.disciplina} · ${category.ramas.nombre}` : 'Rama pendiente';
  return `${branch} · ${category.nombre}${category.sedes?.nombre ? ` · ${category.sedes.nombre}` : ''}`;
};

const WhatsAppGroups = () => {
  const { notify, confirmAction } = useAppDialog();
  const queryClient = useQueryClient();
  const [scope, setScope] = useState<'global' | 'categoria'>('categoria');
  const [categoryId, setCategoryId] = useState('');
  const [name, setName] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [messageByGroup, setMessageByGroup] = useState<Record<string, string>>({});
  const [busyGroup, setBusyGroup] = useState<string | null>(null);

  const groupsQuery = useQuery({
    queryKey: ['whatsapp-groups'],
    queryFn: async () => (await api.get('/api/chat/whatsapp-groups')).data.data as Group[],
    refetchInterval: 20_000,
  });
  const candidatesQuery = useQuery({
    queryKey: ['whatsapp-group-candidates'],
    queryFn: async () => (await api.get('/api/chat/whatsapp-groups/candidates')).data as Candidates,
  });

  const categories = candidatesQuery.data?.categories || [];
  const selectedCategory = categories.find((item) => item.id === categoryId);
  const targetCount = scope === 'global' ? Number(candidatesQuery.data?.global_count || 0) : Number(selectedCategory?.apoderados_con_whatsapp || 0);
  const groups = groupsQuery.data || [];
  const activeCount = useMemo(() => groups.filter((item) => item.estado === 'activo').length, [groups]);

  const createGroup = async () => {
    if (!name.trim()) return notify('Escribe un nombre para el grupo.');
    if (scope === 'categoria' && !categoryId) return notify('Selecciona una categoría.');
    if (!confirmed) return notify('Debes confirmar la visibilidad de teléfonos antes de crear un grupo real de WhatsApp.');
    if (!targetCount) return notify('No hay apoderados con teléfono válido para este alcance.');
    const context = scope === 'global' ? 'toda la academia' : categoryLabel(selectedCategory);
    const accepted = await confirmAction(`Se intentará crear el grupo “${name.trim()}” con ${targetCount} apoderado(s) de ${context}. En un grupo real de WhatsApp, los participantes pueden ver los números de otros miembros. ¿Continuar?`);
    if (!accepted) return;
    setCreating(true);
    try {
      await api.post('/api/chat/whatsapp-groups', {
        scope,
        categoria_id: scope === 'categoria' ? categoryId : null,
        nombre: name.trim(),
        confirm_phone_visibility: true,
      });
      setName('');
      setConfirmed(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] }),
        queryClient.invalidateQueries({ queryKey: ['whatsapp-group-candidates'] }),
      ]);
      await notify('Grupo creado correctamente en WhatsApp.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible crear el grupo de WhatsApp.');
    } finally { setCreating(false); }
  };

  const syncGroup = async (group: Group) => {
    setBusyGroup(group.id);
    try {
      const response = await api.post(`/api/chat/whatsapp-groups/${group.id}/sync`);
      await queryClient.invalidateQueries({ queryKey: ['whatsapp-groups'] });
      await notify(response.data.added ? `Se agregaron ${response.data.added} apoderado(s) nuevos.` : 'El grupo ya estaba sincronizado con los apoderados actuales.');
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible sincronizar el grupo.');
    } finally { setBusyGroup(null); }
  };

  const sendGroupMessage = async (group: Group) => {
    const body = String(messageByGroup[group.id] || '').trim();
    if (!body) return;
    setBusyGroup(group.id);
    try {
      await api.post(`/api/chat/whatsapp-groups/${group.id}/messages`, { body });
      setMessageByGroup((current) => ({ ...current, [group.id]: '' }));
      await notify(`Mensaje enviado a ${group.nombre}.`);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible enviar el mensaje al grupo.');
    } finally { setBusyGroup(null); }
  };

  return <div className="space-y-6 pb-12">
    <section className="rounded-[28px] border border-emerald-400/20 bg-[radial-gradient(circle_at_top_right,rgba(34,197,94,0.14),transparent_38%),#151b25] p-5 sm:p-7">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">WhatsApp · Grupos</p><h1 className="mt-2 text-3xl font-black text-white">Comunicación por academia, rama y categoría</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#91a0b2]">Crea un grupo general para la academia o un grupo específico para una categoría. Cuando dos ramas tienen categorías con nombres similares, Lestra muestra disciplina, rama y sede para evitar cruces.</p></div>
        <div className="grid grid-cols-2 gap-3"><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-center"><p className="text-xs font-bold uppercase text-[#8995a4]">Grupos activos</p><p className="mt-1 text-2xl font-black text-emerald-300">{activeCount}</p></div><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-center"><p className="text-xs font-bold uppercase text-[#8995a4]">Apoderados global</p><p className="mt-1 text-2xl font-black text-white">{candidatesQuery.data?.global_count ?? '—'}</p></div></div>
      </div>
    </section>

    <section className="grid gap-5 xl:grid-cols-[420px_minmax(0,1fr)]">
      <div className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
        <div className="flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><PlusIcon className="h-6 w-6" /></div><div><h2 className="font-black text-white">Crear grupo</h2><p className="text-xs text-[#7f8a99]">Integrado al WhatsApp conectado de la academia.</p></div></div>
        <div className="mt-5 space-y-4">
          <label className="block text-sm font-bold text-[#aeb8c5]">Alcance<select value={scope} onChange={(e) => { setScope(e.target.value as 'global' | 'categoria'); setCategoryId(''); }} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white"><option value="categoria">Categoría específica</option><option value="global">Todos los apoderados de la academia</option></select></label>
          {scope === 'categoria' ? <label className="block text-sm font-bold text-[#aeb8c5]">Disciplina · rama · categoría<select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white"><option value="">Seleccionar</option>{categories.map((category) => <option key={category.id} value={category.id}>{categoryLabel(category)} · {category.apoderados_con_whatsapp} apoderado(s)</option>)}</select></label> : null}
          <label className="block text-sm font-bold text-[#aeb8c5]">Nombre del grupo<input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} placeholder={scope === 'global' ? 'Ej. Lestra · Apoderados Academia' : `Ej. ${selectedCategory?.ramas?.nombre || 'Rama'} · ${selectedCategory?.nombre || 'Categoría'}`} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" /></label>
          {selectedCategory ? <div className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-3 text-xs font-bold text-violet-200">{categoryLabel(selectedCategory)}</div> : null}
          <div className="rounded-2xl border border-amber-400/25 bg-amber-400/5 p-4"><div className="flex gap-3"><ShieldExclamationIcon className="mt-0.5 h-6 w-6 shrink-0 text-amber-300" /><div><p className="text-sm font-black text-amber-200">Privacidad de un grupo real</p><p className="mt-1 text-xs leading-5 text-amber-100/70">WhatsApp muestra a los integrantes los números de otros participantes. Para comunicaciones sin exposición de teléfonos utiliza las conversaciones individuales de Lestra.</p></div></div><label className="mt-3 flex cursor-pointer items-start gap-3 text-xs text-[#c8d0da]"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5 h-4 w-4 accent-emerald-500" /><span>Confirmo que la academia conoce esta característica y desea crear el grupo con los apoderados seleccionados.</span></label></div>
          <div className="rounded-xl border border-white/10 bg-[#0d1117] px-4 py-3"><p className="text-xs font-bold uppercase text-[#697688]">Participantes objetivo</p><p className="mt-1 text-2xl font-black text-white">{targetCount}</p></div>
          <button disabled={creating || !confirmed || !targetCount} onClick={() => void createGroup()} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3 font-black text-white disabled:cursor-not-allowed disabled:opacity-40"><UserGroupIcon className="h-5 w-5" />{creating ? 'Creando en WhatsApp...' : 'Crear grupo WhatsApp'}</button>
        </div>
      </div>

      <div className="space-y-4">
        {groupsQuery.isLoading ? <div className="rounded-3xl border border-white/10 bg-[#151b25] p-12 text-center text-[#7f8a99]">Cargando grupos...</div> : groups.length ? groups.map((group) => <article key={group.id} className="rounded-3xl border border-white/10 bg-[#151b25] p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex min-w-0 gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 text-emerald-300"><UserGroupIcon className="h-6 w-6" /></div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-lg font-black text-white">{group.nombre}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-black uppercase ${group.estado === 'activo' ? 'bg-emerald-400/10 text-emerald-300' : group.estado === 'error' ? 'bg-red-400/10 text-red-300' : 'bg-amber-400/10 text-amber-300'}`}>{group.estado}</span></div><p className="mt-1 text-xs text-[#7f8a99]">{group.scope === 'global' ? 'Toda la academia' : categoryLabel(group.categorias)} · {group.participantes_agregados}/{group.participantes_objetivo} participantes</p>{group.last_error ? <p className="mt-2 text-xs text-red-300">{group.last_error}</p> : null}</div></div><button disabled={busyGroup === group.id || group.estado !== 'activo'} onClick={() => void syncGroup(group)} className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-black text-[#aab5c2] hover:border-emerald-400/40 hover:text-emerald-300 disabled:opacity-40"><ArrowPathIcon className="h-4 w-4" /> Sincronizar integrantes</button></div>
          {group.estado === 'activo' ? <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1117] p-3"><div className="flex gap-2"><textarea value={messageByGroup[group.id] || ''} onChange={(e) => setMessageByGroup((current) => ({ ...current, [group.id]: e.target.value }))} maxLength={4000} placeholder="Escribe un aviso para este grupo..." className="min-h-12 flex-1 resize-y rounded-xl border border-white/10 bg-[#151b25] px-3 py-3 text-sm text-white outline-none focus:border-emerald-400" /><button title="Enviar al grupo" disabled={busyGroup === group.id || !String(messageByGroup[group.id] || '').trim()} onClick={() => void sendGroupMessage(group)} className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5" /></button></div><p className="mt-2 flex items-center gap-1 text-[11px] text-[#667386]"><MegaphoneIcon className="h-4 w-4" />El mensaje se envía al grupo real de WhatsApp desde el número conectado de la academia.</p></div> : null}
        </article>) : <div className="rounded-3xl border border-dashed border-white/10 bg-[#151b25] p-12 text-center"><UserGroupIcon className="mx-auto h-14 w-14 text-[#354154]" /><p className="mt-4 font-black text-white">Aún no hay grupos administrados por Lestra</p><p className="mt-1 text-sm text-[#697688]">Crea el grupo global o comienza por una categoría de una rama específica.</p></div>}
      </div>
    </section>
  </div>;
};

export default WhatsAppGroups;

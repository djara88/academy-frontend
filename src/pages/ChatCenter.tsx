import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatBubbleLeftRightIcon, CheckIcon, MagnifyingGlassIcon, PaperAirplaneIcon, PlusIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { isGuardianRole } from '../utils/roles';

type Player = { id: string; nombre: string };
type Contact = { id: string; nombre?: string; nombre_completo?: string; email?: string | null; telefono?: string | null; usuario_id?: string | null; acceso_activo?: boolean; can_chat: boolean; jugadores: Player[] };
type Message = { id: string; conversation_id: string; sender_user_id?: string | null; sender_role: string; body: string; created_at: string; deleted_at?: string | null };
type Conversation = {
  id: string; tutor_id: string; jugador_id?: string | null; asunto: string; estado: 'activa' | 'cerrada'; created_at: string;
  last_message_at?: string | null; unread_count: number; last_message?: Message | null;
  tutores?: { id: string; nombre?: string; nombre_completo?: string; email?: string | null } | null;
  jugadores?: { id: string; nombre: string } | null;
};

const nameOf = (conversation: Conversation) => conversation.jugadores?.nombre
  ? `${conversation.jugadores.nombre} · ${conversation.tutores?.nombre_completo || conversation.tutores?.nombre || 'Apoderado'}`
  : conversation.tutores?.nombre_completo || conversation.tutores?.nombre || 'Familia';
const formatTime = (value?: string | null) => value ? new Date(value).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

const ChatCenter = () => {
  const { user } = useAuth();
  const { notify, confirmAction } = useAppDialog();
  const queryClient = useQueryClient();
  const guardian = isGuardianRole(user?.rol);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [search, setSearch] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [newChat, setNewChat] = useState({ tutor_id: '', jugador_id: '', asunto: '' });
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef<HTMLDivElement>(null);

  const conversationsQuery = useQuery({
    queryKey: ['chat-conversations'],
    queryFn: async () => (await api.get('/api/chat/conversations')).data.data as Conversation[],
    refetchInterval: 15_000,
  });
  const contactsQuery = useQuery({
    queryKey: ['chat-contacts'],
    enabled: !guardian,
    queryFn: async () => (await api.get('/api/chat/contacts')).data.data as Contact[],
  });
  const messagesQuery = useQuery({
    queryKey: ['chat-messages', selectedId],
    enabled: Boolean(selectedId),
    queryFn: async () => (await api.get(`/api/chat/conversations/${selectedId}/messages?limit=150`)).data.data as Message[],
    refetchInterval: 30_000,
  });

  const conversations = conversationsQuery.data || [];
  const selected = conversations.find((item) => item.id === selectedId) || null;
  const messages = messagesQuery.data || [];
  const unreadTotal = conversations.reduce((sum, item) => sum + Number(item.unread_count || 0), 0);

  useEffect(() => {
    if (!selectedId && conversations.length) setSelectedId(conversations[0].id);
    if (selectedId && !conversations.some((item) => item.id === selectedId)) setSelectedId(conversations[0]?.id || null);
  }, [conversations, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    void api.patch(`/api/chat/conversations/${selectedId}/read`).then(() => {
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    }).catch(() => undefined);
  }, [selectedId, messages.length, queryClient]);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages.length, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const channel = supabase
      .channel(`syncademia-chat-${selectedId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedId}`,
      }, () => {
        void queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedId] });
        void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [selectedId, queryClient]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return conversations;
    return conversations.filter((item) => `${nameOf(item)} ${item.asunto}`.toLowerCase().includes(term));
  }, [conversations, search]);

  const selectedContact = (contactsQuery.data || []).find((item) => item.id === newChat.tutor_id);

  const createConversation = async () => {
    if (!newChat.tutor_id) return notify('Selecciona un apoderado.');
    setSending(true);
    try {
      const response = await api.post('/api/chat/conversations', {
        tutor_id: newChat.tutor_id,
        jugador_id: newChat.jugador_id || null,
        asunto: newChat.asunto.trim() || 'Conversación con la familia',
      });
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
      setSelectedId(response.data.data.id);
      setNewChat({ tutor_id: '', jugador_id: '', asunto: '' });
      setShowNew(false);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible crear la conversación.');
    } finally { setSending(false); }
  };

  const sendMessage = async () => {
    const body = draft.trim();
    if (!selectedId || !body || sending) return;
    setSending(true);
    setDraft('');
    try {
      await api.post(`/api/chat/conversations/${selectedId}/messages`, { body });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedId] }),
        queryClient.invalidateQueries({ queryKey: ['chat-conversations'] }),
      ]);
    } catch (error: any) {
      setDraft(body);
      await notify(error.response?.data?.error || 'No fue posible enviar el mensaje.');
    } finally { setSending(false); }
  };

  const closeConversation = async () => {
    if (!selected || guardian) return;
    if (!await confirmAction('¿Cerrar esta conversación? El historial seguirá disponible, pero no se podrán enviar nuevos mensajes.')) return;
    try {
      await api.patch(`/api/chat/conversations/${selected.id}/close`);
      await queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    } catch (error: any) { await notify(error.response?.data?.error || 'No fue posible cerrar la conversación.'); }
  };

  return <div className="space-y-5 pb-12">
    <section className="rounded-[28px] border border-[#289E9D]/25 bg-[radial-gradient(circle_at_top_right,rgba(40,158,157,0.15),transparent_38%),#151b25] p-5 sm:p-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#70e4df]">Centro de comunicaciones</p><h1 className="mt-2 text-3xl font-black text-white">{guardian ? 'Mensajes con la academia' : 'Familias y apoderados'}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#91a0b2]">{guardian ? 'Conversa directamente con la academia dentro de un canal privado vinculado a tu cuenta.' : 'Historial privado por familia, mensajes en tiempo real y lectura trazable sin mezclar conversaciones entre apoderados.'}</p></div><div className="flex items-center gap-3"><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-center"><p className="text-xs font-bold uppercase text-[#8995a4]">No leídos</p><p className="mt-1 text-2xl font-black text-[#70e4df]">{unreadTotal}</p></div>{!guardian ? <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#289E9D] px-4 py-3 text-sm font-black text-white"><PlusIcon className="h-5 w-5" /> Nueva conversación</button> : null}</div></div>
    </section>

    <section className="grid min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-[#151b25] lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className={`border-b border-white/10 lg:border-b-0 lg:border-r ${selectedId ? 'hidden lg:block' : 'block'}`}>
        <div className="border-b border-white/10 p-4"><div className="relative"><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-[#657184]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversación" className="w-full rounded-xl border border-white/10 bg-[#0d1117] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-[#289E9D]" /></div></div>
        <div className="max-h-[650px] overflow-y-auto p-2">{filtered.length ? filtered.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`mb-1 w-full rounded-2xl border p-3 text-left transition ${conversation.id === selectedId ? 'border-[#289E9D]/50 bg-[#289E9D]/10' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'}`}><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0d1117] text-[#70e4df]"><UserCircleIcon className="h-8 w-8" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-black text-white">{nameOf(conversation)}</p>{conversation.unread_count ? <span className="grid min-w-5 place-items-center rounded-full bg-[#289E9D] px-1.5 py-0.5 text-[10px] font-black text-white">{conversation.unread_count}</span> : null}</div><p className="mt-1 truncate text-xs text-[#8995a4]">{conversation.last_message?.body || conversation.asunto}</p><p className="mt-1 text-[10px] text-[#596678]">{formatTime(conversation.last_message_at || conversation.created_at)}</p></div></div></button>) : <div className="px-5 py-14 text-center text-sm text-[#657184]">{guardian ? 'La academia todavía no ha iniciado una conversación contigo.' : 'Aún no hay conversaciones. Crea la primera cuando un apoderado tenga acceso activo.'}</div>}</div>
      </aside>

      <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} min-w-0 flex-col`}>
        {selected ? <>
          <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setSelectedId(null)} className="rounded-lg border border-white/10 p-2 text-[#91a0b2] lg:hidden"><XMarkIcon className="h-5 w-5" /></button><div className="min-w-0"><h2 className="truncate font-black text-white">{nameOf(selected)}</h2><p className="truncate text-xs text-[#8995a4]">{selected.asunto} · {selected.estado === 'activa' ? 'Conversación activa' : 'Conversación cerrada'}</p></div></div>{!guardian && selected.estado === 'activa' ? <button onClick={() => void closeConversation()} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#8995a4] hover:border-red-500/40 hover:text-red-300">Cerrar</button> : null}</header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#0d1117]/40 p-4 sm:p-6">{messagesQuery.isLoading ? <p className="py-12 text-center text-sm text-[#657184]">Cargando mensajes...</p> : messages.length ? messages.map((message) => { const mine = String(message.sender_user_id || '') === String(user?.id || ''); return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${mine ? 'rounded-br-md bg-[#289E9D] text-white' : 'rounded-bl-md border border-white/10 bg-[#1C2330] text-[#e6edf3]'}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><div className={`mt-1 flex items-center justify-end gap-1 text-[10px] ${mine ? 'text-white/70' : 'text-[#657184]'}`}><span>{formatTime(message.created_at)}</span>{mine ? <CheckIcon className="h-3.5 w-3.5" /> : null}</div></div></div>; }) : <div className="py-20 text-center"><ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-[#344052]" /><p className="mt-3 text-sm text-[#657184]">Aún no hay mensajes. Escribe el primero.</p></div>}<div ref={messagesEnd} /></div>
          <footer className="border-t border-white/10 p-3 sm:p-4">{selected.estado === 'activa' ? <div className="flex items-end gap-2"><textarea value={draft} maxLength={4000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder="Escribe un mensaje..." className="min-h-12 max-h-32 flex-1 resize-none rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-[#289E9D]" /><button disabled={!draft.trim() || sending} onClick={() => void sendMessage()} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#289E9D] text-white disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5" /></button></div> : <p className="rounded-xl border border-white/10 bg-[#0d1117] p-3 text-center text-sm text-[#8995a4]">Esta conversación está cerrada y se conserva solo como historial.</p>}</footer>
        </> : <div className="grid flex-1 place-items-center p-8 text-center"><div><ChatBubbleLeftRightIcon className="mx-auto h-16 w-16 text-[#344052]" /><p className="mt-4 font-black text-white">Selecciona una conversación</p><p className="mt-1 text-sm text-[#657184]">El historial aparecerá aquí.</p></div></div>}
      </div>
    </section>

    {showNew && !guardian ? <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#151b25] p-5 shadow-2xl sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">Nueva conversación</p><h2 className="mt-1 text-2xl font-black text-white">Selecciona una familia</h2></div><button onClick={() => setShowNew(false)} className="rounded-lg border border-white/10 p-2 text-[#8995a4]"><XMarkIcon className="h-5 w-5" /></button></div><div className="mt-5 space-y-4"><label className="block text-sm text-[#9aa6b5]">Apoderado<select value={newChat.tutor_id} onChange={(e) => setNewChat({ tutor_id: e.target.value, jugador_id: '', asunto: '' })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white"><option value="">Seleccionar</option>{(contactsQuery.data || []).map((contact) => <option key={contact.id} value={contact.id} disabled={!contact.can_chat}>{contact.nombre_completo || contact.nombre || 'Apoderado'}{contact.can_chat ? '' : ' · acceso no activado'}</option>)}</select></label>{selectedContact?.jugadores?.length ? <label className="block text-sm text-[#9aa6b5]">Alumno relacionado <span className="text-[#657184]">(opcional)</span><select value={newChat.jugador_id} onChange={(e) => setNewChat({ ...newChat, jugador_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white"><option value="">Familia / tema general</option>{selectedContact.jugadores.map((player) => <option key={player.id} value={player.id}>{player.nombre}</option>)}</select></label> : null}<label className="block text-sm text-[#9aa6b5]">Asunto<input value={newChat.asunto} onChange={(e) => setNewChat({ ...newChat, asunto: e.target.value })} placeholder="Ej. Seguimiento de Vicente" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" /></label></div><button disabled={sending || !newChat.tutor_id || !selectedContact?.can_chat} onClick={() => void createConversation()} className="mt-6 w-full rounded-xl bg-[#289E9D] px-5 py-3 font-black text-white disabled:opacity-40">{sending ? 'Creando...' : 'Iniciar conversación'}</button><p className="mt-3 text-center text-xs text-[#657184]">Solo aparecen habilitados los apoderados que ya tienen acceso activo al portal.</p></div></div> : null}
  </div>;
};

export default ChatCenter;

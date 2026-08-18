import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatBubbleLeftRightIcon, CheckIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PaperAirplaneIcon, PhoneIcon, PlusIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { isGuardianRole } from '../utils/roles';

type Player = { id: string; nombre: string };
type Contact = {
  id: string; nombre?: string; nombre_completo?: string; email?: string | null; telefono?: string | null;
  usuario_id?: string | null; acceso_activo?: boolean; can_chat: boolean; can_portal?: boolean; can_whatsapp?: boolean; jugadores: Player[];
};
type Message = {
  id: string; conversation_id: string; sender_user_id?: string | null; sender_role: string; body: string; created_at: string;
  deleted_at?: string | null; origin_channel?: 'portal' | 'whatsapp' | 'system'; whatsapp_status?: 'pending' | 'sent' | 'delivered' | 'read' | 'received' | 'failed' | null; whatsapp_error?: string | null;
};
type Conversation = {
  id: string; tutor_id: string; jugador_id?: string | null; asunto: string; estado: 'activa' | 'cerrada'; created_at: string;
  last_message_at?: string | null; unread_count: number; last_message?: Message | null;
  tutores?: { id: string; nombre?: string; nombre_completo?: string; email?: string | null; telefono?: string | null; usuario_id?: string | null; acceso_activo?: boolean } | null;
  jugadores?: { id: string; nombre: string } | null;
};

const nameOf = (conversation: Conversation) => conversation.jugadores?.nombre
  ? `${conversation.jugadores.nombre} · ${conversation.tutores?.nombre_completo || conversation.tutores?.nombre || 'Apoderado'}`
  : conversation.tutores?.nombre_completo || conversation.tutores?.nombre || 'Familia';
const formatTime = (value?: string | null) => value ? new Date(value).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';

const whatsappLabel = (message: Message) => {
  if (message.origin_channel === 'whatsapp' || message.whatsapp_status === 'received') return 'Recibido por WhatsApp';
  switch (message.whatsapp_status) {
    case 'pending': return 'Enviando a WhatsApp';
    case 'sent': return 'WhatsApp enviado';
    case 'delivered': return 'WhatsApp entregado';
    case 'read': return 'WhatsApp leído';
    case 'failed': return 'WhatsApp con error';
    default: return message.origin_channel === 'portal' ? 'Portal' : '';
  }
};

const ChatCenterOmnichannel = () => {
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
    refetchInterval: 20_000,
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

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [messages.length, selectedId]);

  useEffect(() => {
    if (!selectedId) return;
    const refresh = () => {
      void queryClient.invalidateQueries({ queryKey: ['chat-messages', selectedId] });
      void queryClient.invalidateQueries({ queryKey: ['chat-conversations'] });
    };
    const channel = supabase
      .channel(`syncademia-chat-${selectedId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedId}` }, refresh)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `conversation_id=eq.${selectedId}` }, refresh)
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
      const response = await api.post(`/api/chat/conversations/${selectedId}/messages`, { body });
      if (response.data?.whatsapp?.status === 'failed') {
        await notify('El mensaje quedó guardado en Lestra, pero WhatsApp no pudo entregarlo. Puedes revisar el estado dentro de la conversación.');
      }
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[0.2em] text-[#70e4df]">Centro de comunicaciones</p><h1 className="mt-2 text-3xl font-black text-white">{guardian ? 'Mensajes con la academia' : 'Familias y apoderados'}</h1><p className="mt-2 max-w-3xl text-sm leading-6 text-[#91a0b2]">{guardian ? 'El historial del portal y los mensajes que envías por WhatsApp pueden convivir en una misma conversación.' : 'Escribe desde Lestra y entrega por WhatsApp cuando el apoderado tenga teléfono. Si además usa el portal, verá el mismo historial allí.'}</p></div><div className="flex items-center gap-3"><div className="rounded-2xl border border-white/10 bg-black/15 px-4 py-3 text-center"><p className="text-xs font-bold uppercase text-[#8995a4]">No leídos</p><p className="mt-1 text-2xl font-black text-[#70e4df]">{unreadTotal}</p></div>{!guardian ? <button onClick={() => setShowNew(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#289E9D] px-4 py-3 text-sm font-black text-white"><PlusIcon className="h-5 w-5" /> Nueva conversación</button> : null}</div></div>
    </section>

    <section className="grid min-h-[620px] overflow-hidden rounded-3xl border border-white/10 bg-[#151b25] lg:grid-cols-[340px_minmax(0,1fr)]">
      <aside className={`border-b border-white/10 lg:border-b-0 lg:border-r ${selectedId ? 'hidden lg:block' : 'block'}`}>
        <div className="border-b border-white/10 p-4"><div className="relative"><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-[#657184]" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conversación" className="w-full rounded-xl border border-white/10 bg-[#0d1117] py-3 pl-10 pr-3 text-sm text-white outline-none focus:border-[#289E9D]" /></div></div>
        <div className="max-h-[650px] overflow-y-auto p-2">{filtered.length ? filtered.map((conversation) => <button key={conversation.id} onClick={() => setSelectedId(conversation.id)} className={`mb-1 w-full rounded-2xl border p-3 text-left transition ${conversation.id === selectedId ? 'border-[#289E9D]/50 bg-[#289E9D]/10' : 'border-transparent hover:border-white/10 hover:bg-white/[0.03]'}`}><div className="flex items-start gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#0d1117] text-[#70e4df]"><UserCircleIcon className="h-8 w-8" /></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-black text-white">{nameOf(conversation)}</p>{conversation.unread_count ? <span className="grid min-w-5 place-items-center rounded-full bg-[#289E9D] px-1.5 py-0.5 text-[10px] font-black text-white">{conversation.unread_count}</span> : null}</div><p className="mt-1 truncate text-xs text-[#8995a4]">{conversation.last_message?.body || conversation.asunto}</p><div className="mt-1 flex items-center justify-between gap-2"><p className="text-[10px] text-[#596678]">{formatTime(conversation.last_message_at || conversation.created_at)}</p>{conversation.last_message?.origin_channel === 'whatsapp' ? <span className="text-[9px] font-black uppercase text-emerald-400">WhatsApp</span> : null}</div></div></div></button>) : <div className="px-5 py-14 text-center text-sm text-[#657184]">{guardian ? 'La academia todavía no ha iniciado una conversación contigo.' : 'Aún no hay conversaciones. Puedes iniciar una con cualquier apoderado que tenga teléfono válido o portal activo.'}</div>}</div>
      </aside>

      <div className={`${selectedId ? 'flex' : 'hidden lg:flex'} min-w-0 flex-col`}>
        {selected ? <>
          <header className="flex items-center justify-between gap-3 border-b border-white/10 p-4"><div className="flex min-w-0 items-center gap-3"><button onClick={() => setSelectedId(null)} className="rounded-lg border border-white/10 p-2 text-[#91a0b2] lg:hidden"><XMarkIcon className="h-5 w-5" /></button><div className="min-w-0"><h2 className="truncate font-black text-white">{nameOf(selected)}</h2><p className="truncate text-xs text-[#8995a4]">{selected.asunto} · {selected.estado === 'activa' ? 'Conversación activa' : 'Conversación cerrada'}{selected.tutores?.telefono ? ' · WhatsApp disponible' : ''}</p></div></div>{!guardian && selected.estado === 'activa' ? <button onClick={() => void closeConversation()} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-bold text-[#8995a4] hover:border-red-500/40 hover:text-red-300">Cerrar</button> : null}</header>
          <div className="flex-1 space-y-3 overflow-y-auto bg-[#0d1117]/40 p-4 sm:p-6">{messagesQuery.isLoading ? <p className="py-12 text-center text-sm text-[#657184]">Cargando mensajes...</p> : messages.length ? messages.map((message) => { const mine = String(message.sender_user_id || '') === String(user?.id || ''); const channelLabel = whatsappLabel(message); const failed = message.whatsapp_status === 'failed'; return <div key={message.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[88%] rounded-2xl px-4 py-3 sm:max-w-[72%] ${mine ? 'rounded-br-md bg-[#289E9D] text-white' : 'rounded-bl-md border border-white/10 bg-[#1C2330] text-[#e6edf3]'}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p><div className={`mt-1 flex flex-wrap items-center justify-end gap-1.5 text-[10px] ${mine ? 'text-white/70' : 'text-[#657184]'}`}><span>{formatTime(message.created_at)}</span>{channelLabel ? <span className={`inline-flex items-center gap-1 ${failed ? 'text-red-200' : message.origin_channel === 'whatsapp' || message.whatsapp_status ? 'text-emerald-100' : ''}`}>{failed ? <ExclamationTriangleIcon className="h-3.5 w-3.5" /> : message.origin_channel === 'whatsapp' || message.whatsapp_status ? <PhoneIcon className="h-3.5 w-3.5" /> : <CheckIcon className="h-3.5 w-3.5" />}{channelLabel}</span> : null}</div>{failed && message.whatsapp_error ? <p className="mt-1 text-[10px] text-red-100/80">{message.whatsapp_error}</p> : null}</div></div>; }) : <div className="py-20 text-center"><ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-[#344052]" /><p className="mt-3 text-sm text-[#657184]">Aún no hay mensajes. Escribe el primero.</p></div>}<div ref={messagesEnd} /></div>
          <footer className="border-t border-white/10 p-3 sm:p-4">{selected.estado === 'activa' ? <><div className="flex items-end gap-2"><textarea value={draft} maxLength={4000} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(); } }} placeholder={guardian ? 'Escribe un mensaje...' : selected.tutores?.telefono ? 'Escribe aquí · se intentará entregar también por WhatsApp' : 'Escribe un mensaje para el portal'} className="min-h-12 max-h-32 flex-1 resize-none rounded-2xl border border-white/10 bg-[#0d1117] px-4 py-3 text-sm text-white outline-none focus:border-[#289E9D]" /><button disabled={!draft.trim() || sending} onClick={() => void sendMessage()} className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[#289E9D] text-white disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5" /></button></div>{!guardian && selected.tutores?.telefono ? <p className="mt-2 flex items-center gap-1 text-[11px] text-emerald-300/70"><PhoneIcon className="h-4 w-4" />Este apoderado tiene teléfono: Lestra conservará el mensaje y lo enviará también por WhatsApp.</p> : null}</> : <p className="rounded-xl border border-white/10 bg-[#0d1117] p-3 text-center text-sm text-[#8995a4]">Esta conversación está cerrada y se conserva solo como historial.</p>}</footer>
        </> : <div className="grid flex-1 place-items-center p-8 text-center"><div><ChatBubbleLeftRightIcon className="mx-auto h-16 w-16 text-[#344052]" /><p className="mt-4 font-black text-white">Selecciona una conversación</p><p className="mt-1 text-sm text-[#657184]">El historial aparecerá aquí.</p></div></div>}
      </div>
    </section>

    {showNew && !guardian ? <div className="fixed inset-0 z-[100] grid place-items-center bg-black/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#151b25] p-5 shadow-2xl sm:p-6"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-wider text-[#70e4df]">Nueva conversación</p><h2 className="mt-1 text-2xl font-black text-white">Selecciona una familia</h2></div><button onClick={() => setShowNew(false)} className="rounded-lg border border-white/10 p-2 text-[#8995a4]"><XMarkIcon className="h-5 w-5" /></button></div><div className="mt-5 space-y-4"><label className="block text-sm text-[#9aa6b5]">Apoderado<select value={newChat.tutor_id} onChange={(e) => setNewChat({ tutor_id: e.target.value, jugador_id: '', asunto: '' })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white"><option value="">Seleccionar</option>{(contactsQuery.data || []).map((contact) => <option key={contact.id} value={contact.id} disabled={!contact.can_chat}>{contact.nombre_completo || contact.nombre || 'Apoderado'}{contact.can_whatsapp ? ' · WhatsApp' : contact.can_portal ? ' · Portal' : ' · sin canal disponible'}</option>)}</select></label>{selectedContact ? <div className="flex flex-wrap gap-2 text-[11px]">{selectedContact.can_whatsapp ? <span className="rounded-full bg-emerald-400/10 px-2 py-1 font-black text-emerald-300">WhatsApp disponible</span> : null}{selectedContact.can_portal ? <span className="rounded-full bg-[#289E9D]/10 px-2 py-1 font-black text-[#70e4df]">Portal activo</span> : null}</div> : null}{selectedContact?.jugadores?.length ? <label className="block text-sm text-[#9aa6b5]">Alumno relacionado <span className="text-[#657184]">(opcional)</span><select value={newChat.jugador_id} onChange={(e) => setNewChat({ ...newChat, jugador_id: e.target.value })} className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white"><option value="">Familia / tema general</option>{selectedContact.jugadores.map((player) => <option key={player.id} value={player.id}>{player.nombre}</option>)}</select></label> : null}<label className="block text-sm text-[#9aa6b5]">Asunto<input value={newChat.asunto} onChange={(e) => setNewChat({ ...newChat, asunto: e.target.value })} placeholder="Ej. Seguimiento de Vicente" className="mt-2 w-full rounded-xl border border-white/10 bg-[#0d1117] px-3 py-3 text-white" /></label></div><button disabled={sending || !newChat.tutor_id || !selectedContact?.can_chat} onClick={() => void createConversation()} className="mt-6 w-full rounded-xl bg-[#289E9D] px-5 py-3 font-black text-white disabled:opacity-40">{sending ? 'Creando...' : 'Iniciar conversación'}</button><p className="mt-3 text-center text-xs text-[#657184]">WhatsApp basta para iniciar la conversación. Si el apoderado activa posteriormente el portal, verá el mismo historial.</p></div></div> : null}
  </div>;
};

export default ChatCenterOmnichannel;

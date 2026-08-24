import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChatBubbleLeftRightIcon, CheckIcon, ExclamationTriangleIcon, MagnifyingGlassIcon, PaperAirplaneIcon, PhoneIcon, PlusIcon, UserCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { isGuardianRole } from '../utils/roles';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DIRECTOR_TEXTAREA, DirectorPanel, DirectorStat } from '../components/director/DirectorModule';

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
const labelClass='mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

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
  const activeCount = conversations.filter((item) => item.estado === 'activa').length;

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
      if (response.data?.whatsapp?.status === 'failed') await notify('El mensaje quedó guardado, pero no pudo entregarse por WhatsApp.');
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
    {!guardian ? <section className="grid gap-3 sm:grid-cols-3"><DirectorStat label="Conversaciones" value={conversations.length} detail="Historial de familias"/><DirectorStat label="Activas" value={activeCount} detail="Disponibles para responder" tone="lime"/><DirectorStat label="No leídos" value={unreadTotal} detail="Mensajes pendientes" tone="dark"/></section> : null}

    <DirectorPanel className="overflow-hidden">
      <section className="grid min-h-[620px] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`border-b border-[#e1e6df] bg-[#f8faf6] lg:border-b-0 lg:border-r ${selectedId ? 'hidden lg:block' : 'block'}`}>
          <div className="border-b border-[#e1e6df] p-4"><div className="flex gap-2"><div className="relative min-w-0 flex-1"><MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-[#879187]"/><input value={search} onChange={(event)=>setSearch(event.target.value)} placeholder="Buscar conversación" className={`${DIRECTOR_FIELD} pl-10`}/></div>{!guardian?<button type="button" title="Nueva conversación" onClick={()=>setShowNew(true)} className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#111711] text-[#b7ff00]"><PlusIcon className="h-5 w-5"/></button>:null}</div></div>
          <div className="max-h-[650px] overflow-y-auto p-2">{filtered.length?filtered.map((conversation)=><button key={conversation.id} onClick={()=>setSelectedId(conversation.id)} className={`mb-1 w-full rounded-[16px] border p-3 text-left transition ${conversation.id===selectedId?'border-[#9fcf00] bg-[#f3fadf]':'border-transparent hover:border-[#d9e0d6] hover:bg-white'}`}><div className="flex items-start gap-3"><div className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${conversation.id===selectedId?'bg-[#111711] text-[#b7ff00]':'bg-[#e9eee6] text-[#667066]'}`}><UserCircleIcon className="h-8 w-8"/></div><div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="truncate text-sm font-black text-[#111711]">{nameOf(conversation)}</p>{conversation.unread_count?<span className="grid min-w-5 place-items-center rounded-full bg-[#111711] px-1.5 py-0.5 text-[10px] font-black text-[#b7ff00]">{conversation.unread_count}</span>:null}</div><p className="mt-1 truncate text-xs font-semibold text-[#697468]">{conversation.last_message?.body||conversation.asunto}</p><div className="mt-1 flex items-center justify-between gap-2"><p className="text-[10px] text-[#899389]">{formatTime(conversation.last_message_at||conversation.created_at)}</p>{conversation.last_message?.origin_channel==='whatsapp'?<span className="text-[9px] font-black uppercase text-[#617b00]">WhatsApp</span>:null}</div></div></div></button>):<div className="px-5 py-14 text-center text-sm text-[#697468]">{guardian?'Aún no tienes conversaciones.':'Aún no hay conversaciones.'}</div>}</div>
        </aside>

        <div className={`${selectedId?'flex':'hidden lg:flex'} min-w-0 flex-col bg-white`}>
          {selected?<>
            <header className="flex items-center justify-between gap-3 border-b border-[#e1e6df] p-4"><div className="flex min-w-0 items-center gap-3"><button onClick={()=>setSelectedId(null)} className="rounded-xl border border-[#d9e0d6] p-2 text-[#697468] lg:hidden"><XMarkIcon className="h-5 w-5"/></button><div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#111711] text-[#b7ff00]"><UserCircleIcon className="h-7 w-7"/></div><div className="min-w-0"><h2 className="truncate font-black text-[#111711]">{nameOf(selected)}</h2><p className="truncate text-xs font-semibold text-[#697468]">{selected.asunto} · {selected.estado==='activa'?'Conversación activa':'Conversación cerrada'}{selected.tutores?.telefono?' · WhatsApp disponible':''}</p></div></div>{!guardian&&selected.estado==='activa'?<button onClick={()=>void closeConversation()} className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700">Cerrar</button>:null}</header>

            <div className="flex-1 space-y-3 overflow-y-auto bg-[#f6f8f4] p-4 sm:p-6">{messagesQuery.isLoading?<p className="py-12 text-center text-sm text-[#697468]">Cargando mensajes...</p>:messages.length?messages.map((message)=>{
              const mine=String(message.sender_user_id||'')===String(user?.id||'');
              const channelLabel=whatsappLabel(message);
              const failed=message.whatsapp_status==='failed';
              return <div key={message.id} className={`flex ${mine?'justify-end':'justify-start'}`}><div className={`max-w-[88%] rounded-[18px] px-4 py-3 shadow-sm sm:max-w-[72%] ${mine?'rounded-br-md bg-[#111711] text-white':'rounded-bl-md border border-[#dfe5dc] bg-white text-[#111711]'}`}><p className="whitespace-pre-wrap break-words text-sm leading-6">{message.deleted_at?'Mensaje eliminado':message.body}</p><div className={`mt-1 flex flex-wrap items-center justify-end gap-1.5 text-[10px] ${mine?'text-[#c7d0c8]':'text-[#899389]'}`}><span>{formatTime(message.created_at)}</span>{channelLabel?<span className={`inline-flex items-center gap-1 ${failed?'text-red-300':message.origin_channel==='whatsapp'||message.whatsapp_status?'text-[#9fcf00]':''}`}>{failed?<ExclamationTriangleIcon className="h-3.5 w-3.5"/>:message.origin_channel==='whatsapp'||message.whatsapp_status?<PhoneIcon className="h-3.5 w-3.5"/>:<CheckIcon className="h-3.5 w-3.5"/>}{channelLabel}</span>:null}</div>{failed&&message.whatsapp_error?<p className="mt-1 text-[10px] text-red-300">{message.whatsapp_error}</p>:null}</div></div>;
            }):<div className="grid min-h-[360px] place-items-center text-center"><div><ChatBubbleLeftRightIcon className="mx-auto h-14 w-14 text-[#b4bdb3]"/><p className="mt-4 font-black text-[#111711]">Comienza la conversación</p><p className="mt-1 text-sm text-[#697468]">El primer mensaje aparecerá aquí.</p></div></div>}<div ref={messagesEnd}/></div>

            <footer className="border-t border-[#e1e6df] p-3 sm:p-4">{selected.estado==='activa'?<><div className="flex items-end gap-2"><textarea value={draft} maxLength={4000} onChange={(event)=>setDraft(event.target.value)} onKeyDown={(event)=>{if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();void sendMessage();}}} placeholder={guardian?'Escribe un mensaje...':selected.tutores?.telefono?'Escribe un mensaje...':'Escribe un mensaje para el portal'} className={`${DIRECTOR_TEXTAREA} min-h-12 max-h-32 flex-1`}/><button disabled={!draft.trim()||sending} onClick={()=>void sendMessage()} className="grid h-12 w-12 shrink-0 place-items-center rounded-[14px] bg-[#111711] text-[#b7ff00] disabled:opacity-40"><PaperAirplaneIcon className="h-5 w-5"/></button></div>{!guardian&&selected.tutores?.telefono?<p className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-[#617b00]"><PhoneIcon className="h-4 w-4"/>El mensaje se enviará también por WhatsApp.</p>:null}</>:<p className="rounded-[14px] border border-[#dfe5dc] bg-[#f8faf6] p-3 text-center text-sm font-semibold text-[#697468]">Esta conversación está cerrada.</p>}</footer>
          </>:<div className="grid flex-1 place-items-center p-8 text-center"><div><ChatBubbleLeftRightIcon className="mx-auto h-16 w-16 text-[#b4bdb3]"/><p className="mt-4 font-black text-[#111711]">Selecciona una conversación</p><p className="mt-1 text-sm text-[#697468]">El historial aparecerá aquí.</p></div></div>}
        </div>
      </section>
    </DirectorPanel>

    {showNew&&!guardian?<div className="fixed inset-0 z-[100] grid place-items-center bg-[#0b100c]/70 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-[28px] border border-[#d9e0d6] bg-white p-5 shadow-[0_32px_90px_rgba(13,20,14,.28)] sm:p-6"><div className="flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Nueva conversación</p><h2 className="mt-1 text-2xl font-black text-[#111711]">Selecciona una familia</h2></div><button onClick={()=>setShowNew(false)} className="rounded-xl border border-[#d9e0d6] p-2 text-[#697468]"><XMarkIcon className="h-5 w-5"/></button></div><div className="mt-5 space-y-4"><Field label="Apoderado"><select value={newChat.tutor_id} onChange={(event)=>setNewChat({tutor_id:event.target.value,jugador_id:'',asunto:''})} className={DIRECTOR_FIELD}><option value="">Seleccionar</option>{(contactsQuery.data||[]).map((contact)=><option key={contact.id} value={contact.id} disabled={!contact.can_chat}>{contact.nombre_completo||contact.nombre||'Apoderado'}{contact.can_whatsapp?' · WhatsApp':contact.can_portal?' · Portal':' · sin canal disponible'}</option>)}</select></Field>{selectedContact?<div className="flex flex-wrap gap-2 text-[11px]">{selectedContact.can_whatsapp?<span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2 py-1 font-black text-[#4f6900]">WhatsApp disponible</span>:null}{selectedContact.can_portal?<span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-black text-sky-700">Portal activo</span>:null}</div>:null}{selectedContact?.jugadores?.length?<Field label="Alumno relacionado (opcional)"><select value={newChat.jugador_id} onChange={(event)=>setNewChat({...newChat,jugador_id:event.target.value})} className={DIRECTOR_FIELD}><option value="">Familia / tema general</option>{selectedContact.jugadores.map((player)=><option key={player.id} value={player.id}>{player.nombre}</option>)}</select></Field>:null}<Field label="Asunto"><input value={newChat.asunto} onChange={(event)=>setNewChat({...newChat,asunto:event.target.value})} placeholder="Ej. Seguimiento de Vicente" className={DIRECTOR_FIELD}/></Field></div><button disabled={sending||!newChat.tutor_id||!selectedContact?.can_chat} onClick={()=>void createConversation()} className={`${DIRECTOR_BUTTON} mt-6 w-full`}>{sending?'Creando...':'Iniciar conversación'}</button></div></div>:null}
  </div>;
};

function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;}

export default ChatCenterOmnichannel;

import { useEffect, useMemo, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ChatBubbleLeftRightIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  PaperAirplaneIcon,
  PhoneIcon,
  PlusIcon,
  UserCircleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useAppDialog } from '../contexts/DialogContext';
import { isGuardianRole } from '../utils/roles';
import { DIRECTOR_BUTTON, DIRECTOR_FIELD, DIRECTOR_TEXTAREA } from '../components/director/DirectorModule';

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

const guardianName = (conversation: Conversation) => conversation.tutores?.nombre_completo || conversation.tutores?.nombre || 'Familia';
const athleteName = (conversation: Conversation) => conversation.jugadores?.nombre || null;
const displayName = (conversation: Conversation) => athleteName(conversation) || guardianName(conversation);
const formatTime = (value?: string | null) => value ? new Date(value).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
const labelClass = 'mb-1.5 block text-[11px] font-black uppercase tracking-[.09em] text-[#697468]';

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
    return conversations.filter((item) => `${displayName(item)} ${guardianName(item)} ${item.asunto}`.toLowerCase().includes(term));
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

  return <div className={`family-touchpoint ${guardian ? 'is-guardian' : 'is-director'}`}>
    {!guardian ? <section className="family-touchpoint-command" aria-labelledby="family-touchpoint-title">
      <div className="family-touchpoint-command-copy">
        <p>Family Touchpoint</p>
        <h2 id="family-touchpoint-title">Prioridades de comunicación</h2>
        <span>La relación parte del deportista y su familia; WhatsApp y portal son canales, no módulos separados.</span>
      </div>
      <div className="family-touchpoint-command-rail" aria-label="Estado de comunicaciones">
        <span><small>No leídos</small><strong className={unreadTotal ? 'is-warning' : ''}>{unreadTotal}</strong></span>
        <span><small>Activas</small><strong>{activeCount}</strong></span>
        <span><small>Historial</small><strong>{conversations.length}</strong></span>
      </div>
      <button type="button" onClick={() => setShowNew(true)} className="family-touchpoint-new"><PlusIcon aria-hidden="true" /> Nueva conversación</button>
    </section> : null}

    <section className="family-touchpoint-workspace" aria-label="Conversaciones con familias">
      <aside className={`family-touchpoint-list ${selectedId ? 'has-selection' : ''}`}>
        <div className="family-touchpoint-search">
          <label>
            <span className="sr-only">Buscar conversación</span>
            <MagnifyingGlassIcon aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Deportista, familia o asunto" />
          </label>
          {!guardian ? <button type="button" aria-label="Nueva conversación" title="Nueva conversación" onClick={() => setShowNew(true)}><PlusIcon aria-hidden="true" /></button> : null}
        </div>

        <div className="family-touchpoint-thread-list">
          {conversationsQuery.isLoading ? <div className="family-touchpoint-empty">Verificando conversaciones…</div> : filtered.length ? filtered.map((conversation) => {
            const current = conversation.id === selectedId;
            const athlete = athleteName(conversation);
            const family = guardianName(conversation);
            return <button key={conversation.id} type="button" onClick={() => setSelectedId(conversation.id)} aria-current={current ? 'true' : undefined} className="family-touchpoint-thread">
              <span className="family-touchpoint-avatar"><UserCircleIcon aria-hidden="true" /></span>
              <span className="family-touchpoint-thread-copy">
                <span className="family-touchpoint-thread-heading">
                  <strong>{athlete || family}</strong>
                  {conversation.unread_count ? <b aria-label={`${conversation.unread_count} mensajes no leídos`}>{conversation.unread_count}</b> : null}
                </span>
                {athlete ? <small className="family-touchpoint-family">Familia · {family}</small> : <small className="family-touchpoint-family">Tema familiar general</small>}
                <span className="family-touchpoint-preview">{conversation.last_message?.body || conversation.asunto}</span>
                <span className="family-touchpoint-thread-meta"><time>{formatTime(conversation.last_message_at || conversation.created_at)}</time>{conversation.last_message?.origin_channel === 'whatsapp' ? <em>WhatsApp</em> : <em>Portal</em>}</span>
              </span>
            </button>;
          }) : <div className="family-touchpoint-empty">{guardian ? 'Aún no tienes conversaciones.' : 'No hay conversaciones para este filtro.'}</div>}
        </div>
      </aside>

      <div className={`family-touchpoint-conversation ${selectedId ? 'has-selection' : ''}`}>
        {selected ? <>
          <header className="family-touchpoint-context">
            <div className="family-touchpoint-context-main">
              <button type="button" onClick={() => setSelectedId(null)} className="family-touchpoint-back" aria-label="Volver a conversaciones"><XMarkIcon aria-hidden="true" /></button>
              <span className="family-touchpoint-context-mark"><UserCircleIcon aria-hidden="true" /></span>
              <span className="family-touchpoint-context-copy">
                <small>{athleteName(selected) ? 'Deportista y familia' : 'Familia'}</small>
                <strong>{athleteName(selected) || guardianName(selected)}</strong>
                {athleteName(selected) ? <span>{guardianName(selected)}</span> : null}
              </span>
            </div>
            <div className="family-touchpoint-context-status">
              <span>{selected.asunto}</span>
              <small>{selected.estado === 'activa' ? 'Conversación activa' : 'Conversación cerrada'}{selected.tutores?.telefono ? ' · WhatsApp disponible' : ' · Portal'}</small>
            </div>
            {!guardian && selected.estado === 'activa' ? <button type="button" onClick={() => void closeConversation()} className="family-touchpoint-close">Cerrar</button> : null}
          </header>

          <div className="family-touchpoint-messages" aria-live="polite">
            {messagesQuery.isLoading ? <p className="family-touchpoint-loading">Cargando mensajes…</p> : messages.length ? messages.map((message) => {
              const mine = String(message.sender_user_id || '') === String(user?.id || '');
              const channelLabel = whatsappLabel(message);
              const failed = message.whatsapp_status === 'failed';
              return <div key={message.id} className={`family-touchpoint-message-row ${mine ? 'is-mine' : 'is-theirs'}`}>
                <article className="family-touchpoint-message">
                  <p>{message.deleted_at ? 'Mensaje eliminado' : message.body}</p>
                  <footer>
                    <time>{formatTime(message.created_at)}</time>
                    {channelLabel ? <span className={failed ? 'is-failed' : ''}>{failed ? <ExclamationTriangleIcon aria-hidden="true" /> : message.origin_channel === 'whatsapp' || message.whatsapp_status ? <PhoneIcon aria-hidden="true" /> : <CheckIcon aria-hidden="true" />}{channelLabel}</span> : null}
                  </footer>
                  {failed && message.whatsapp_error ? <small className="family-touchpoint-error">{message.whatsapp_error}</small> : null}
                </article>
              </div>;
            }) : <div className="family-touchpoint-empty is-large"><ChatBubbleLeftRightIcon aria-hidden="true" /><strong>Comienza la conversación</strong><span>El primer mensaje aparecerá dentro del contexto de esta familia.</span></div>}
            <div ref={messagesEnd} />
          </div>

          <footer className="family-touchpoint-composer">
            {selected.estado === 'activa' ? <>
              <div className="family-touchpoint-compose-row">
                <textarea value={draft} maxLength={4000} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void sendMessage(); } }} placeholder={guardian ? 'Escribe un mensaje…' : selected.tutores?.telefono ? 'Escribe para la familia…' : 'Escribe para el portal…'} />
                <button type="button" aria-label="Enviar mensaje" disabled={!draft.trim() || sending} onClick={() => void sendMessage()}><PaperAirplaneIcon aria-hidden="true" /></button>
              </div>
              {!guardian && selected.tutores?.telefono ? <p><PhoneIcon aria-hidden="true" />Este mensaje también se entregará por WhatsApp.</p> : <p>El mensaje quedará en el portal de la familia.</p>}
            </> : <p className="family-touchpoint-closed">Esta conversación está cerrada. El historial permanece disponible.</p>}
          </footer>
        </> : <div className="family-touchpoint-empty is-large"><ChatBubbleLeftRightIcon aria-hidden="true" /><strong>Selecciona una familia</strong><span>Verás su conversación y el deportista relacionado en un mismo contexto.</span></div>}
      </div>
    </section>

    {showNew && !guardian ? <div className="fixed inset-0 z-[100] grid place-items-center bg-[#0b100c]/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-[28px] border border-[#d9e0d6] bg-white p-5 shadow-[0_32px_90px_rgba(13,20,14,.28)] sm:p-6">
        <div className="flex items-center justify-between"><div><p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Family Touchpoint</p><h2 className="mt-1 text-2xl font-black text-[#111711]">Iniciar desde una familia</h2></div><button type="button" aria-label="Cerrar" onClick={() => setShowNew(false)} className="rounded-xl border border-[#d9e0d6] p-2 text-[#697468]"><XMarkIcon aria-hidden="true" className="h-5 w-5" /></button></div>
        <p className="mt-2 text-sm leading-6 text-[#697468]">Relaciona la conversación con un deportista cuando corresponda. El canal disponible se resolverá entre portal y WhatsApp.</p>
        <div className="mt-5 space-y-4">
          <Field label="Apoderado"><select value={newChat.tutor_id} onChange={(event) => setNewChat({ tutor_id: event.target.value, jugador_id: '', asunto: '' })} className={DIRECTOR_FIELD}><option value="">Seleccionar</option>{(contactsQuery.data || []).map((contact) => <option key={contact.id} value={contact.id} disabled={!contact.can_chat}>{contact.nombre_completo || contact.nombre || 'Apoderado'}{contact.can_whatsapp ? ' · WhatsApp' : contact.can_portal ? ' · Portal' : ' · sin canal disponible'}</option>)}</select></Field>
          {selectedContact ? <div className="flex flex-wrap gap-2 text-[11px]">{selectedContact.can_whatsapp ? <span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-2 py-1 font-black text-[#4f6900]">WhatsApp disponible</span> : null}{selectedContact.can_portal ? <span className="rounded-full border border-sky-200 bg-sky-50 px-2 py-1 font-black text-sky-700">Portal activo</span> : null}</div> : null}
          {selectedContact?.jugadores?.length ? <Field label="Deportista relacionado"><select value={newChat.jugador_id} onChange={(event) => setNewChat({ ...newChat, jugador_id: event.target.value })} className={DIRECTOR_FIELD}><option value="">Tema familiar general</option>{selectedContact.jugadores.map((player) => <option key={player.id} value={player.id}>{player.nombre}</option>)}</select></Field> : null}
          <Field label="Situación / asunto"><input value={newChat.asunto} onChange={(event) => setNewChat({ ...newChat, asunto: event.target.value })} placeholder="Ej. Seguimiento de asistencia" className={DIRECTOR_FIELD} /></Field>
        </div>
        <button type="button" disabled={sending || !newChat.tutor_id || !selectedContact?.can_chat} onClick={() => void createConversation()} className={`${DIRECTOR_BUTTON} mt-6 w-full`}>{sending ? 'Creando…' : 'Abrir conversación'}</button>
      </div>
    </div> : null}
  </div>;
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className={labelClass}>{label}</span>{children}</label>;
}

export default ChatCenterOmnichannel;

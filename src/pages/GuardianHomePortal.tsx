import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDaysIcon, ChatBubbleLeftRightIcon, ChevronRightIcon, ExclamationTriangleIcon, ShieldCheckIcon, UserIcon } from '@heroicons/react/24/outline';
import api from '../api/axiosConfig';
import GuardianFinanceStatement from '../components/GuardianFinanceStatement';
import GuardianSportsResponses from '../components/GuardianSportsResponses';
import GuardianSportsRequests from '../components/GuardianSportsRequests';

type Portal = {
  apoderado: { nombre: string };
  academia: { nombre: string };
  jugadores: { id: string; nombre: string; foto_url?: string | null; avatar_url?: string | null; estado_financiero?: string | null; saldo_pendiente?: number | null }[];
  proximos_partidos: { id: string; rival: string; fecha: string; hora: string; hora_citacion?: string | null; ubicacion?: string | null; categorias?: { nombre: string } | null }[];
  asistencias_recientes: { id: string; jugador_id: string; estado: string; entrenamientos?: { fecha: string } | null }[];
  finanzas: { saldo_pendiente: number };
};

type PrivacyRequest = { id: string; tipo: string; estado: string; fecha_recepcion: string; jugadores?: { nombre?: string } | null };

const money = (value: number) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(Number(value) || 0);
const date = (value?: string | null) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' }) : 'Por definir';

export default function GuardianHomePortal() {
  const queryClient = useQueryClient();
  const [privacyForm, setPrivacyForm] = useState({ jugador_id: '', tipo: 'acceso', detalle: '', bloqueo_solicitado: false });
  const [privacyStatus, setPrivacyStatus] = useState('');
  const [privacySaving, setPrivacySaving] = useState(false);

  const portalQuery = useQuery({
    queryKey: ['apoderado-portal'],
    queryFn: async () => (await api.get('/api/apoderados/me')).data.data as Portal,
  });
  const privacyQuery = useQuery({
    queryKey: ['guardian-privacy'],
    queryFn: async () => (await api.get('/api/apoderados/me/solicitudes-privacidad')).data.data as PrivacyRequest[],
  });

  const data = portalQuery.data;
  const attendanceByPlayer = useMemo(() => {
    const map = new Map<string, { total: number; present: number }>();
    for (const row of data?.asistencias_recientes || []) {
      const current = map.get(String(row.jugador_id)) || { total: 0, present: 0 };
      current.total += 1;
      if (['Presente', 'Justificado'].includes(String(row.estado))) current.present += 1;
      map.set(String(row.jugador_id), current);
    }
    return map;
  }, [data?.asistencias_recientes]);

  const sendPrivacyRequest = async () => {
    if (!privacyForm.jugador_id || !privacyForm.detalle.trim()) {
      setPrivacyStatus('Selecciona un deportista y describe tu solicitud.');
      return;
    }
    setPrivacySaving(true);
    setPrivacyStatus('');
    try {
      await api.post('/api/apoderados/me/solicitudes-privacidad', privacyForm);
      setPrivacyForm({ jugador_id: '', tipo: 'acceso', detalle: '', bloqueo_solicitado: false });
      setPrivacyStatus('Solicitud registrada. La academia podrá revisar y responder su estado.');
      await queryClient.invalidateQueries({ queryKey: ['guardian-privacy'] });
    } catch (requestError: any) {
      setPrivacyStatus(requestError.response?.data?.error || 'No fue posible registrar la solicitud.');
    } finally { setPrivacySaving(false); }
  };

  if (portalQuery.isLoading) return <main className="guardian-home"><div className="guardian-loading">Preparando tu día en la academia…</div></main>;
  if (portalQuery.isError || !data) return <main className="guardian-home"><section className="guardian-error" role="alert"><ExclamationTriangleIcon aria-hidden="true" /><div><strong>No pudimos cargar tu información.</strong><p>Intenta nuevamente o contacta a la academia si el problema continúa.</p></div></section></main>;

  const nextMatch = data.proximos_partidos[0] || null;
  const familyDebt = Number(data.finanzas?.saldo_pendiente || 0);

  return (
    <main className="guardian-home">
      <header className="guardian-day-head">
        <div><p>Familia · {data.academia.nombre}</p><h1>Hola, {data.apoderado.nombre.split(' ')[0]}</h1><span>Lo importante de tus deportistas, sin ruido administrativo.</span></div>
        <Link to="/apoderado/mensajes"><ChatBubbleLeftRightIcon aria-hidden="true" />Mensajes</Link>
      </header>

      <section className="guardian-now" aria-labelledby="guardian-now-title">
        <div className="guardian-now-primary">
          <p id="guardian-now-title">Lo próximo</p>
          {nextMatch ? <><strong>{nextMatch.categorias?.nombre || 'Categoría'} · vs {nextMatch.rival}</strong><span>{date(nextMatch.fecha)} · Citación {nextMatch.hora_citacion?.slice(0, 5) || 'por definir'} · Inicio {nextMatch.hora?.slice(0, 5) || 'por definir'}</span><small>{nextMatch.ubicacion || 'Lugar por confirmar'}</small></> : <><strong>Sin eventos próximos</strong><span>La academia aún no ha publicado una nueva citación.</span></>}
        </div>
        <div className="guardian-now-side">
          <div><span>Saldo familiar</span><strong>{money(familyDebt)}</strong><small>{familyDebt > 0 ? 'Revisa el detalle de cobros más abajo.' : 'Sin saldo pendiente informado.'}</small></div>
          <div><span>Deportistas</span><strong>{data.jugadores.length}</strong><small>vinculados a tu cuenta</small></div>
        </div>
      </section>

      <section className="guardian-athletes" aria-labelledby="guardian-athletes-title">
        <div className="guardian-section-title"><div><p>Mi familia deportiva</p><h2 id="guardian-athletes-title">Tus deportistas</h2></div></div>
        <div className="guardian-athlete-rail">
          {data.jugadores.map((player) => {
            const attendance = attendanceByPlayer.get(String(player.id));
            const image = player.foto_url || player.avatar_url;
            return <article key={player.id} className="guardian-athlete-card">{image ? <img src={image} alt="" /> : <span className="guardian-athlete-avatar"><UserIcon aria-hidden="true" /></span>}<div><strong>{player.nombre}</strong><span>{attendance ? `Asistencia reciente ${attendance.present}/${attendance.total}` : 'Sin asistencia reciente'}</span><small>{player.estado_financiero || (Number(player.saldo_pendiente || 0) > 0 ? `Saldo ${money(Number(player.saldo_pendiente || 0))}` : 'Sin observaciones pendientes')}</small></div></article>;
          })}
        </div>
      </section>

      <div className="guardian-main-grid">
        <section className="guardian-agenda" aria-labelledby="guardian-agenda-title">
          <div className="guardian-section-title"><div><p>Agenda</p><h2 id="guardian-agenda-title">Próximos eventos</h2></div><CalendarDaysIcon aria-hidden="true" /></div>
          <div className="guardian-event-list">
            {data.proximos_partidos.length ? data.proximos_partidos.slice(0, 6).map((match) => <article key={match.id}><div className="guardian-event-date"><strong>{date(match.fecha)}</strong><span>{match.hora_citacion?.slice(0, 5) || '—'}</span></div><div className="guardian-event-body"><strong>vs {match.rival}</strong><span>{match.categorias?.nombre || 'Categoría'} · {match.ubicacion || 'Lugar por confirmar'}</span></div><ChevronRightIcon aria-hidden="true" /></article>) : <p className="guardian-empty">No hay eventos próximos.</p>}
          </div>
        </section>

        <section className="guardian-contact">
          <ChatBubbleLeftRightIcon aria-hidden="true" />
          <p>Necesitas hablar con la academia</p>
          <h2>Conversación con contexto</h2>
          <span>Tus mensajes quedan asociados a tu cuenta y disponibles para seguimiento.</span>
          <Link to="/apoderado/mensajes">Abrir mensajes<ChevronRightIcon aria-hidden="true" /></Link>
        </section>
      </div>

      <section className="guardian-finance-section" aria-label="Estado financiero familiar"><GuardianFinanceStatement /></section>
      <section className="guardian-response-section" aria-label="Confirmaciones deportivas"><GuardianSportsResponses /></section>
      <section className="guardian-request-section" aria-label="Solicitudes deportivas"><GuardianSportsRequests /></section>

      <section className="guardian-privacy" aria-labelledby="guardian-privacy-title">
        <div className="guardian-section-title"><div><p>Privacidad</p><h2 id="guardian-privacy-title">Tus derechos sobre los datos</h2></div><ShieldCheckIcon aria-hidden="true" /></div>
        <p className="guardian-privacy-copy">Puedes solicitar acceso, rectificación, supresión, oposición, portabilidad, bloqueo temporal o revocación de imágenes respecto de tus deportistas vinculados.</p>
        <div className="guardian-privacy-grid">
          <label><span>Deportista</span><select value={privacyForm.jugador_id} onChange={(event) => setPrivacyForm({ ...privacyForm, jugador_id: event.target.value })}><option value="">Seleccionar</option>{data.jugadores.map((player) => <option key={player.id} value={player.id}>{player.nombre}</option>)}</select></label>
          <label><span>Tipo</span><select value={privacyForm.tipo} onChange={(event) => setPrivacyForm({ ...privacyForm, tipo: event.target.value })}><option value="acceso">Acceso a datos</option><option value="rectificacion">Rectificación</option><option value="supresion">Supresión</option><option value="oposicion">Oposición</option><option value="portabilidad">Portabilidad</option><option value="bloqueo">Bloqueo temporal</option><option value="revocacion_imagen">Revocación de fotografías / imagen</option></select></label>
        </div>
        <label className="guardian-privacy-detail"><span>Detalle</span><textarea value={privacyForm.detalle} onChange={(event) => setPrivacyForm({ ...privacyForm, detalle: event.target.value })} placeholder="Describe qué necesitas y qué datos están involucrados." /></label>
        <label className="guardian-privacy-check"><input type="checkbox" checked={privacyForm.bloqueo_solicitado} onChange={(event) => setPrivacyForm({ ...privacyForm, bloqueo_solicitado: event.target.checked })} /><span>Solicitar también bloqueo temporal mientras se revisa, cuando corresponda.</span></label>
        <div className="guardian-privacy-actions"><button type="button" disabled={privacySaving} onClick={() => void sendPrivacyRequest()}>{privacySaving ? 'Enviando…' : 'Registrar solicitud'}</button>{privacyStatus ? <p role="status">{privacyStatus}</p> : null}</div>
        <div className="guardian-privacy-history">{(privacyQuery.data || []).slice(0, 5).map((item) => <article key={item.id}><div><strong>{item.jugadores?.nombre || 'Deportista'} · {String(item.tipo).split('_').join(' ')}</strong><span>{new Date(item.fecha_recepcion).toLocaleDateString('es-CL')}</span></div><small>{item.estado}</small></article>)}{privacyQuery.isSuccess && !privacyQuery.data?.length ? <p>No tienes solicitudes recientes.</p> : null}</div>
      </section>
    </main>
  );
}

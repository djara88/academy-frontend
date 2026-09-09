import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import { DIRECTOR_BUTTON, DIRECTOR_BUTTON_DARK, DIRECTOR_BUTTON_GHOST, DIRECTOR_FIELD, DirectorPage } from '../components/director/DirectorModule';

type Tournament = {
  id: string;
  nombre: string;
  fecha_inicio?: string | null;
  fecha_fin?: string | null;
  costo_inscripcion: number;
  permite_cuotas: boolean;
  max_cuotas: number;
  rama_id?: string | null;
  sede_id?: string | null;
  organizador?: string | null;
  ubicacion?: string | null;
  reglamento_url?: string | null;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
  sedes?: { id: string; nombre: string } | null;
};

type Category = {
  id: string;
  nombre: string;
  rama_id?: string | null;
  sede_id?: string | null;
  ramas?: { id: string; nombre: string; disciplina: string } | null;
};

type Student = {
  id: string;
  nombre: string;
  foto_url?: string | null;
  avatar_url?: string | null;
  foto_base64?: string | null;
  inscripcion?: { id: string; rama_id: string; categoria_id?: string | null; rol_especialidad?: string | null } | null;
};

type Participant = {
  id: string;
  jugador_id: string;
  categoria_id?: string | null;
  respuesta_participacion: string;
  estado_pago: string;
  numero_cuotas?: number | null;
  jugadores?: { id: string; nombre: string; foto_url?: string | null; foto_base64?: string | null } | null;
  categorias?: { id: string; nombre: string } | null;
};

type CompetitionEvent = {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
  estado: string;
  goles_favor?: number | null;
  goles_contra?: number | null;
  categorias?: { id?: string; nombre: string } | null;
  sport_profile?: { icon?: string; activityLabel?: string; scoreLabel?: string; usesHeadToHeadScore?: boolean } | null;
};

const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const photo = (student?: { foto_url?: string | null; foto_base64?: string | null } | null) => student?.foto_url || student?.foto_base64 || '';
const responseLabel = (value?: string | null) => value === 'Si' ? 'Confirmado' : value === 'No' ? 'No participa' : 'Pendiente';

export default function GestionarTorneoMultirama() {
  const { id } = useParams();
  const { notify, confirmAction } = useAppDialog();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [eligible, setEligible] = useState<Student[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [events, setEvents] = useState<CompetitionEvent[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingEligible, setLoadingEligible] = useState(false);
  const [sending, setSending] = useState(false);

  const reloadParticipants = async () => {
    if (!id) return;
    const response = await api.get(`/api/torneos/${id}/participantes`);
    setParticipants(response.data.data || []);
  };

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      setLoading(true);
      try {
        const tournamentResponse = await api.get(`/api/torneos/${id}`);
        const currentTournament = tournamentResponse.data.data as Tournament;
        setTournament(currentTournament);
        const requests: Promise<any>[] = [
          api.get(`/api/torneos/${id}/participantes`),
          api.get('/api/partidos', { params: { torneo_id: id } }),
        ];
        if (currentTournament.rama_id) requests.push(api.get('/api/jugadores/categorias', { params: { rama_id: currentTournament.rama_id } }));
        const responses = await Promise.all(requests);
        setParticipants(responses[0].data.data || []);
        setEvents(responses[1].data.data || []);
        if (currentTournament.rama_id) {
          const availableCategories = (responses[2]?.data?.data || []) as Category[];
          setCategories(availableCategories);
          setCategoryId((current) => current && availableCategories.some((category) => category.id === current) ? current : availableCategories[0]?.id || '');
        } else {
          setCategories([]);
          setCategoryId('');
        }
      } catch (error: any) {
        await notify(error.response?.data?.error || 'No fue posible cargar la competencia.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [id, notify]);

  useEffect(() => {
    const loadEligible = async () => {
      if (!id || !categoryId) {
        setEligible([]);
        setSelected([]);
        return;
      }
      setLoadingEligible(true);
      try {
        const response = await api.get(`/api/torneos/${id}/elegibles`, { params: { categoria_id: categoryId } });
        const students = (response.data.data || []) as Student[];
        setEligible(students);
        const already = new Set(participants.filter((item) => String(item.categoria_id || '') === String(categoryId)).map((item) => String(item.jugador_id)));
        setSelected(students.filter((student) => !already.has(String(student.id))).map((student) => student.id));
      } catch (error: any) {
        setEligible([]);
        setSelected([]);
        await notify(error.response?.data?.error || 'No fue posible cargar alumnos elegibles.');
      } finally {
        setLoadingEligible(false);
      }
    };
    void loadEligible();
  }, [id, categoryId, participants, notify]);

  const selectedCategory = categories.find((category) => category.id === categoryId) || null;
  const uniqueParticipants = useMemo(() => {
    const byPlayer = new Map<string, Participant[]>();
    for (const participant of participants) {
      const key = String(participant.jugador_id);
      if (!byPlayer.has(key)) byPlayer.set(key, []);
      byPlayer.get(key)?.push(participant);
    }
    return byPlayer;
  }, [participants]);

  const stats = useMemo(() => {
    let confirmados = 0;
    let rechazados = 0;
    let pendientes = 0;
    let pagados = 0;
    for (const rows of uniqueParticipants.values()) {
      const responses = new Set(rows.map((row) => row.respuesta_participacion || 'Pendiente'));
      if (responses.has('Si')) confirmados += 1;
      else if (responses.has('No') && !responses.has('Pendiente')) rechazados += 1;
      else pendientes += 1;
      if (rows.some((row) => row.estado_pago === 'Pagado')) pagados += 1;
    }
    return { total: uniqueParticipants.size, confirmados, rechazados, pendientes, pagados };
  }, [uniqueParticipants]);

  const eventStats = useMemo(() => ({
    total: events.length,
    jugados: events.filter((item) => item.estado === 'Jugado').length,
    pendientes: events.filter((item) => item.estado !== 'Jugado').length,
  }), [events]);

  const availableForCategory = useMemo(() => {
    const already = new Set(participants.filter((item) => String(item.categoria_id || '') === String(categoryId)).map((item) => String(item.jugador_id)));
    return eligible.filter((student) => !already.has(String(student.id)));
  }, [eligible, participants, categoryId]);

  const nextEvent = useMemo(() => events.filter((event) => event.estado !== 'Jugado').sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`))[0] || null, [events]);
  const toggle = (studentId: string) => setSelected((current) => current.includes(studentId) ? current.filter((item) => item !== studentId) : [...current, studentId]);
  const selectAll = () => setSelected(availableForCategory.map((student) => student.id));
  const clearSelection = () => setSelected([]);

  const send = async () => {
    if (!id) return;
    if (!categories.length) return void notify('Esta rama todavía no tiene categorías. Créala primero en Estructura de la academia.');
    if (!categoryId) return void notify('Selecciona la categoría cuyos alumnos participarán en el torneo.');
    if (!eligible.length) return void notify('Esta categoría no tiene alumnos con inscripción activa disponibles para convocar.');
    if (!selected.length) return void notify('Selecciona al menos un alumno nuevo para enviar la convocatoria.');
    const accepted = await confirmAction(`Se convocará a ${selected.length} alumno(s) de ${selectedCategory?.nombre || 'la categoría'} a ${tournament?.nombre || 'esta competencia'}. Esta participación corresponde al torneo completo y no depende de que existan partidos programados.`, { confirmLabel: 'Enviar convocatoria' });
    if (!accepted) return;
    setSending(true);
    try {
      const response = await api.post(`/api/torneos/${id}/convocar`, { categoria_id: categoryId, jugadoresIds: selected });
      await notify(response.data.message || 'Convocatorias enviadas.');
      await reloadParticipants();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible convocar.');
    } finally {
      setSending(false);
    }
  };

  if (loading) return <div className="competition-record competition-control-room"><div className="competition-record-loading">Cargando Competition Control Room…</div></div>;
  if (!tournament) return <div className="competition-record"><div className="competition-record-error">Competencia no encontrada.</div></div>;

  const sendLabel = sending ? 'Enviando…' : !categories.length ? 'Falta crear categoría' : !categoryId ? 'Selecciona categoría' : loadingEligible ? 'Cargando plantel…' : !selected.length ? 'Selecciona deportistas' : `Enviar convocatoria · ${selected.length}`;

  return <DirectorPage className="max-w-[1500px]">
    <div className="competition-record competition-control-room">
      <header className="competition-record-command competition-control-command">
        <div className="competition-record-command-copy">
          <p className="competition-record-kicker">Competition Control Room · {tournament.ramas?.disciplina || 'Competencia'}</p>
          <h1>{tournament.nombre}</h1>
          <p>{tournament.ramas?.nombre || 'Sin rama'}{tournament.sedes?.nombre ? ` · ${tournament.sedes.nombre}` : ''} · {tournament.fecha_inicio || 'Fecha por definir'}{tournament.fecha_fin && tournament.fecha_fin !== tournament.fecha_inicio ? ` → ${tournament.fecha_fin}` : ''}{tournament.organizador ? ` · Organiza ${tournament.organizador}` : ''}</p>
        </div>
        <div className="competition-record-actions">
          <Link to="/torneos" className={DIRECTOR_BUTTON_DARK}>← Temporada</Link>
          <a href="#convocatoria" className={DIRECTOR_BUTTON_GHOST}>Convocatoria</a>
          <Link to={`/partidos?torneo_id=${tournament.id}`} className={DIRECTOR_BUTTON}>+ Evento</Link>
        </div>
      </header>

      <section className="competition-control-pulse" aria-label="Estado operativo de la competencia">
        <span><small>Plantel</small><strong>{stats.total}</strong><em>convocados</em></span>
        <span className="is-confirmed"><small>Confirmados</small><strong>{stats.confirmados}</strong><em>listos</em></span>
        <span className="is-pending"><small>Pendientes</small><strong>{stats.pendientes}</strong><em>por responder</em></span>
        <span><small>Pagados</small><strong>{stats.pagados}</strong><em>inscripciones</em></span>
        <span><small>Eventos</small><strong>{eventStats.total}</strong><em>{eventStats.pendientes} por jugar</em></span>
      </section>

      <section className="competition-control-grid">
        <div id="convocatoria" className="competition-control-workbench scroll-mt-6">
          <div className="competition-control-section-head">
            <div><p className="competition-record-kicker">Convocatoria de temporada</p><h2>Quién participa y qué falta</h2><p>La familia confirma la competencia completa. Las citaciones de fecha, hora y rival se manejan después por evento.</p></div>
            <div className="competition-control-status"><strong>{stats.total ? `${stats.confirmados}/${stats.total}` : '0'}</strong><span>confirmados</span></div>
          </div>

          {!categories.length ? <div className="competition-control-alert is-warning"><strong>Falta una categoría en esta rama.</strong><span>La competencia existe, pero para convocar Lestra necesita una categoría deportiva.</span><Link to="/configuracion/estructura" className={DIRECTOR_BUTTON}>Crear / revisar categorías</Link></div> : <>
            <div className="competition-control-selection-bar">
              <label><span>Categoría</span><select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={DIRECTOR_FIELD}>{categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}</select></label>
              <div><button type="button" onClick={selectAll} className={DIRECTOR_BUTTON_GHOST}>Seleccionar disponibles</button><button type="button" onClick={clearSelection} className={DIRECTOR_BUTTON_GHOST}>Limpiar</button><button type="button" disabled={sending || loadingEligible || !selected.length} onClick={() => void send()} className={DIRECTOR_BUTTON}>{sendLabel}</button></div>
            </div>

            {loadingEligible ? <div className="competition-record-loading">Cargando plantel de {selectedCategory?.nombre || 'la categoría'}…</div> : <div className="competition-control-roster" aria-label={`Plantel elegible de ${selectedCategory?.nombre || 'la categoría'}`}>
              {eligible.map((student) => {
                const checked = selected.includes(student.id);
                const already = participants.some((item) => String(item.categoria_id || '') === String(categoryId) && String(item.jugador_id) === String(student.id));
                return <button type="button" disabled={already} onClick={() => toggle(student.id)} key={student.id} aria-pressed={already || checked} className={`competition-control-player ${already ? 'is-already' : checked ? 'is-selected' : ''}`}>
                  <span className="competition-control-avatar">{photo(student) ? <img src={photo(student)} alt="" /> : student.nombre?.slice(0, 1) || 'A'}</span>
                  <span className="competition-control-player-copy"><strong>{student.nombre}</strong><small>{already ? 'Ya convocado' : student.inscripcion?.rol_especialidad || 'Disponible para convocar'}</small></span>
                  <span className="competition-control-check" aria-hidden="true">{already || checked ? '✓' : ''}</span>
                </button>;
              })}
              {!eligible.length ? <div className="competition-record-empty"><strong>No hay deportistas elegibles en {selectedCategory?.nombre || 'esta categoría'}.</strong><span>Revisa que tengan una inscripción deportiva activa.</span><Link to="/inscripciones" className={DIRECTOR_BUTTON_GHOST}>Revisar inscripciones</Link></div> : null}
            </div>}
          </>}

          <div className="competition-control-participants">
            <div className="competition-control-section-head compact"><div><p className="competition-record-kicker">Estado actual</p><h3>Plantel registrado</h3></div><div className="competition-control-response-strip"><span className="is-confirmed"><strong>{stats.confirmados}</strong><small>Confirmados</small></span><span className="is-pending"><strong>{stats.pendientes}</strong><small>Pendientes</small></span><span className="is-out"><strong>{stats.rechazados}</strong><small>No participan</small></span></div></div>
            <div className="competition-control-participant-list">
              {participants.map((participant) => <div key={participant.id} className="competition-control-participant-row">
                <span className="competition-control-avatar">{photo(participant.jugadores) ? <img src={photo(participant.jugadores)} alt="" /> : participant.jugadores?.nombre?.slice(0, 1) || 'A'}</span>
                <span className="competition-control-player-copy"><strong>{participant.jugadores?.nombre || 'Deportista'}</strong><small>{participant.categorias?.nombre || 'Categoría'}</small></span>
                <span className={`competition-control-state ${participant.respuesta_participacion === 'Si' ? 'is-confirmed' : participant.respuesta_participacion === 'No' ? 'is-out' : 'is-pending'}`}>{responseLabel(participant.respuesta_participacion)}</span>
                <span className="competition-control-payment">{participant.estado_pago || 'Pendiente'}</span>
              </div>)}
              {!participants.length ? <div className="competition-record-empty"><strong>Sin convocatoria todavía.</strong><span>Selecciona una categoría y envía el primer grupo.</span></div> : null}
            </div>
          </div>
        </div>

        <aside className="competition-control-side">
          <section className="competition-control-next">
            <p className="competition-record-kicker">Próximo paso</p>
            {nextEvent ? <><strong>{nextEvent.sport_profile?.icon || '🏅'} {nextEvent.rival}</strong><span>{nextEvent.categorias?.nombre || 'Sin categoría'} · {nextEvent.fecha} · {String(nextEvent.hora || '').slice(0, 5)}</span><Link to={`/partidos?torneo_id=${tournament.id}`} className={DIRECTOR_BUTTON}>Abrir Match Command</Link></> : <><strong>Programar el primer evento</strong><span>La convocatoria puede avanzar aunque todavía no exista programación.</span><Link to={`/partidos?torneo_id=${tournament.id}`} className={DIRECTOR_BUTTON}>Agregar evento</Link></>}
          </section>

          <section className="competition-control-money"><small>Inscripción por deportista</small><strong>{Number(tournament.costo_inscripcion) > 0 ? money(tournament.costo_inscripcion) : 'Gratuita'}</strong><span>{tournament.permite_cuotas ? `Hasta ${tournament.max_cuotas} cuotas` : 'Pago único'}</span></section>

          <section className="competition-control-events">
            <div className="competition-control-section-head compact"><div><p className="competition-record-kicker">Season Timeline</p><h3>Eventos de la competencia</h3></div><Link to={`/partidos?torneo_id=${tournament.id}`}>Ver todos →</Link></div>
            <div className="competition-control-event-list">{events.slice().sort((a, b) => `${a.fecha} ${a.hora}`.localeCompare(`${b.fecha} ${b.hora}`)).slice(0, 8).map((event) => <article key={event.id} className={`competition-control-event ${event.estado === 'Jugado' ? 'is-played' : ''}`}><span className="competition-control-event-dot"/><div><small>{event.fecha} · {String(event.hora || '').slice(0, 5)} · {event.categorias?.nombre || 'Sin categoría'}</small><strong>{event.sport_profile?.icon || '🏅'} {event.rival}</strong><span>{event.estado === 'Jugado' && event.sport_profile?.usesHeadToHeadScore ? `${event.goles_favor || 0} — ${event.goles_contra || 0} ${event.sport_profile?.scoreLabel || ''}` : event.estado}</span></div></article>)}</div>
            {!events.length ? <div className="competition-record-empty"><strong>Sin eventos programados.</strong><span>Esto no impide definir el plantel de la competencia.</span></div> : null}
          </section>

          {tournament.reglamento_url ? <section className="competition-control-rules"><small>Bases / reglamento</small><a href={tournament.reglamento_url} target="_blank" rel="noreferrer">Abrir documento ↗</a></section> : null}
        </aside>
      </section>
    </div>
  </DirectorPage>;
}

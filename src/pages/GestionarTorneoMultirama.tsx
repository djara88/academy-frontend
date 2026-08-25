import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../api/axiosConfig';
import { useAppDialog } from '../contexts/DialogContext';
import {
  DIRECTOR_BUTTON,
  DIRECTOR_BUTTON_DARK,
  DIRECTOR_BUTTON_GHOST,
  DIRECTOR_FIELD,
  DirectorHero,
  DirectorPage,
  DirectorPanel,
  DirectorStat,
} from '../components/director/DirectorModule';

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
  inscripcion?: {
    id: string;
    rama_id: string;
    categoria_id?: string | null;
    rol_especialidad?: string | null;
  } | null;
};

type Participant = {
  id: string;
  jugador_id: string;
  categoria_id?: string | null;
  respuesta_participacion: string;
  estado_pago: string;
  numero_cuotas?: number | null;
  jugadores?: {
    id: string;
    nombre: string;
    foto_url?: string | null;
    foto_base64?: string | null;
  } | null;
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
  sport_profile?: {
    icon?: string;
    activityLabel?: string;
    scoreLabel?: string;
    usesHeadToHeadScore?: boolean;
  } | null;
};

const money = (value: number) => `$${Math.round(Number(value) || 0).toLocaleString('es-CL')}`;
const photo = (student?: { foto_url?: string | null; foto_base64?: string | null } | null) =>
  student?.foto_url || student?.foto_base64 || '';

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
        if (currentTournament.rama_id) {
          requests.push(api.get('/api/jugadores/categorias', { params: { rama_id: currentTournament.rama_id } }));
        }

        const responses = await Promise.all(requests);
        setParticipants(responses[0].data.data || []);
        setEvents(responses[1].data.data || []);

        if (currentTournament.rama_id) {
          const availableCategories = (responses[2]?.data?.data || []) as Category[];
          setCategories(availableCategories);
          setCategoryId((current) => {
            if (current && availableCategories.some((category) => category.id === current)) return current;
            return availableCategories[0]?.id || '';
          });
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

        const already = new Set(
          participants
            .filter((item) => String(item.categoria_id || '') === String(categoryId))
            .map((item) => String(item.jugador_id)),
        );
        setSelected(
          students
            .filter((student) => !already.has(String(student.id)))
            .map((student) => student.id),
        );
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

    return {
      total: uniqueParticipants.size,
      confirmados,
      rechazados,
      pendientes,
      pagados,
    };
  }, [uniqueParticipants]);

  const eventStats = useMemo(
    () => ({
      total: events.length,
      jugados: events.filter((item) => item.estado === 'Jugado').length,
      pendientes: events.filter((item) => item.estado !== 'Jugado').length,
    }),
    [events],
  );

  const availableForCategory = useMemo(() => {
    const already = new Set(
      participants
        .filter((item) => String(item.categoria_id || '') === String(categoryId))
        .map((item) => String(item.jugador_id)),
    );
    return eligible.filter((student) => !already.has(String(student.id)));
  }, [eligible, participants, categoryId]);

  const toggle = (studentId: string) =>
    setSelected((current) =>
      current.includes(studentId) ? current.filter((item) => item !== studentId) : [...current, studentId],
    );

  const selectAll = () => setSelected(availableForCategory.map((student) => student.id));
  const clearSelection = () => setSelected([]);

  const send = async () => {
    if (!id) return;
    if (!categories.length) {
      return void notify('Esta rama todavía no tiene categorías. Créala primero en Estructura de la academia.');
    }
    if (!categoryId) {
      return void notify('Selecciona la categoría cuyos alumnos participarán en el torneo.');
    }
    if (!eligible.length) {
      return void notify('Esta categoría no tiene alumnos con inscripción activa disponibles para convocar.');
    }
    if (!selected.length) {
      return void notify('Selecciona al menos un alumno nuevo para enviar la convocatoria.');
    }

    const accepted = await confirmAction(
      `Se convocará a ${selected.length} alumno(s) de ${selectedCategory?.nombre || 'la categoría'} a ${tournament?.nombre || 'esta competencia'}. Esta participación corresponde al torneo completo y no depende de que existan partidos programados.`,
      { confirmLabel: 'Enviar convocatoria' },
    );
    if (!accepted) return;

    setSending(true);
    try {
      const response = await api.post(`/api/torneos/${id}/convocar`, {
        categoria_id: categoryId,
        jugadoresIds: selected,
      });
      await notify(response.data.message || 'Convocatorias enviadas.');
      await reloadParticipants();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'No fue posible convocar.');
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <DirectorPanel className="mx-auto max-w-6xl p-12 text-center text-sm font-bold text-[#697468]">Cargando competencia...</DirectorPanel>;
  }

  if (!tournament) {
    return <div className="rounded-[18px] border border-red-200 bg-red-50 p-5 text-red-700">Competencia no encontrada.</div>;
  }

  const sendLabel = sending
    ? 'Enviando...'
    : !categories.length
      ? 'Falta crear categoría'
      : !categoryId
        ? 'Selecciona categoría'
        : loadingEligible
          ? 'Cargando alumnos...'
          : !selected.length
            ? 'Selecciona alumnos'
            : `Enviar convocatoria · ${selected.length}`;

  return (
    <DirectorPage>
      <DirectorHero
        eyebrow={tournament.ramas?.disciplina || 'Competencia'}
        title={tournament.nombre}
        description={
          <>
            {tournament.ramas?.nombre || 'Sin rama'}
            {tournament.sedes?.nombre ? ` · ${tournament.sedes.nombre}` : ''}
            {' · '}
            {tournament.fecha_inicio || 'Fecha por definir'}
            {tournament.fecha_fin && tournament.fecha_fin !== tournament.fecha_inicio ? ` → ${tournament.fecha_fin}` : ''}
            {tournament.organizador ? <><br />Organiza: {tournament.organizador}</> : null}
          </>
        }
        actions={
          <>
            <Link to="/torneos" className={DIRECTOR_BUTTON_DARK}>← Competencias</Link>
            <a href="#participantes" className={DIRECTOR_BUTTON_GHOST}>Equipo del torneo</a>
            <Link to={`/partidos?torneo_id=${tournament.id}`} className={DIRECTOR_BUTTON}>+ Agregar evento</Link>
          </>
        }
        aside={
          <div className="rounded-[20px] border border-white/15 bg-white/[.055] p-5">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#b7ff00]">Inscripción por alumno</p>
            <p className="mt-2 text-xl font-black text-white">{Number(tournament.costo_inscripcion) > 0 ? money(tournament.costo_inscripcion) : 'Gratuita'}</p>
            <p className="mt-1 text-xs font-semibold text-[#c7d0c8]">{tournament.permite_cuotas ? `Hasta ${tournament.max_cuotas} cuotas` : 'Pago único'}</p>
          </div>
        }
      />

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <DirectorStat label="Participantes" value={stats.total} />
        <DirectorStat label="Confirmados" value={stats.confirmados} tone="lime" />
        <DirectorStat label="Pendientes" value={stats.pendientes} />
        <DirectorStat label="No participan" value={stats.rechazados} />
        <DirectorStat label="Eventos" value={eventStats.total} tone="dark" />
      </section>

      <DirectorPanel id="participantes" className="scroll-mt-6 border-[#cde995] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Paso principal · participación del torneo</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">¿Quiénes participarán?</h2>
            <p className="mt-2 text-sm leading-6 text-[#697468]">
              Define el equipo ahora. <strong className="text-[#111711]">No necesitas tener partidos programados.</strong> La familia confirma su participación en el torneo completo y las citaciones de fecha/hora se gestionan después por evento.
            </p>
          </div>
          <div className="rounded-[16px] border border-[#cde995] bg-[#f3fadf] px-4 py-3 text-xs font-bold text-[#4f6900]">
            {stats.total ? `${stats.confirmados} confirmados · ${stats.pendientes} pendientes · ${stats.rechazados} no participan` : 'Aún no hay participantes convocados'}
          </div>
        </div>

        {!categories.length ? (
          <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 p-5">
            <p className="font-black text-amber-900">Primero necesitas una categoría en esta rama.</p>
            <p className="mt-1 text-sm leading-5 text-amber-800">El torneo ya está creado correctamente, pero Lestra necesita saber desde qué categoría seleccionar a los alumnos.</p>
            <Link to="/configuracion/estructura" className={`${DIRECTOR_BUTTON} mt-4`}>Crear / revisar categorías</Link>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
              <label>
                <span className="mb-1.5 block text-[10px] font-black uppercase tracking-[.12em] text-[#687667]">Categoría</span>
                <select value={categoryId} onChange={(event) => setCategoryId(event.target.value)} className={DIRECTOR_FIELD}>
                  {categories.map((category) => <option key={category.id} value={category.id}>{category.nombre}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-end gap-2">
                <button type="button" onClick={selectAll} className={`${DIRECTOR_BUTTON_GHOST} min-h-11 px-4 text-xs`}>Seleccionar disponibles</button>
                <button type="button" onClick={clearSelection} className={`${DIRECTOR_BUTTON_GHOST} min-h-11 px-4 text-xs`}>Quitar selección</button>
                <button type="button" disabled={sending} onClick={() => void send()} className={`${DIRECTOR_BUTTON} min-h-11 px-5 text-xs`}>{sendLabel}</button>
              </div>
            </div>

            {loadingEligible ? (
              <div className="mt-4 rounded-[16px] border border-[#dfe5dc] bg-[#f8faf6] p-6 text-center text-sm font-bold text-[#697468]">Cargando alumnos de {selectedCategory?.nombre || 'la categoría'}...</div>
            ) : (
              <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                {eligible.map((student) => {
                  const checked = selected.includes(student.id);
                  const already = participants.some(
                    (item) => String(item.categoria_id || '') === String(categoryId) && String(item.jugador_id) === String(student.id),
                  );
                  return (
                    <button
                      type="button"
                      disabled={already}
                      onClick={() => toggle(student.id)}
                      key={student.id}
                      className={`flex items-center gap-3 rounded-[16px] border p-3 text-left transition ${already ? 'cursor-default border-[#cde995] bg-[#f3fadf]' : checked ? 'border-[#9fcf00] bg-[#f3fadf]' : 'border-[#dfe5dc] bg-[#f8faf6] hover:border-[#aebaa9]'}`}
                    >
                      {photo(student) ? (
                        <img src={photo(student)} alt="" className="h-10 w-10 rounded-xl object-cover" />
                      ) : (
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#111711] text-sm font-black text-white">{student.nombre?.slice(0, 1) || 'A'}</div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-[#111711]">{student.nombre}</p>
                        <p className="text-[10px] text-[#697468]">{already ? 'Ya está convocado en esta categoría' : student.inscripcion?.rol_especialidad || 'Disponible para convocar'}</p>
                      </div>
                      <span className={`grid h-6 w-6 place-items-center rounded-full border text-[10px] ${already || checked ? 'border-[#9fcf00] bg-[#b7ff00] text-[#111711]' : 'border-[#b8c1b6] bg-white'}`}>{already || checked ? '✓' : ''}</span>
                    </button>
                  );
                })}
                {!eligible.length ? (
                  <div className="col-span-full rounded-[16px] border border-dashed border-[#d9e0d6] p-6 text-center">
                    <p className="text-sm font-black text-[#111711]">No hay alumnos elegibles en {selectedCategory?.nombre || 'esta categoría'}.</p>
                    <p className="mt-1 text-xs text-[#697468]">Revisa que los alumnos tengan una inscripción deportiva activa en esta rama y categoría.</p>
                    <Link to="/inscripciones" className={`${DIRECTOR_BUTTON_GHOST} mt-4`}>Revisar inscripciones</Link>
                  </div>
                ) : null}
              </div>
            )}
          </>
        )}

        <div className="mt-6 border-t border-[#e3e8e0] pt-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#789600]">Estado actual</p>
              <h3 className="mt-1 text-lg font-black text-[#111711]">Participantes registrados</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-3 py-1 text-xs font-black text-[#5f7900]">{stats.confirmados} confirmados</span>
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-black text-amber-800">{stats.pendientes} pendientes</span>
              {stats.rechazados ? <span className="rounded-full border border-red-200 bg-red-50 px-3 py-1 text-xs font-black text-red-700">{stats.rechazados} no participan</span> : null}
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {participants.map((participant) => (
              <div key={participant.id} className="flex items-center gap-3 rounded-[16px] border border-[#dfe5dc] bg-[#f8faf6] p-3">
                {photo(participant.jugadores) ? (
                  <img src={photo(participant.jugadores)} alt="" className="h-10 w-10 rounded-xl object-cover" />
                ) : (
                  <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#111711] text-sm font-black text-white">{participant.jugadores?.nombre?.slice(0, 1) || 'A'}</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-black text-[#111711]">{participant.jugadores?.nombre || 'Alumno'}</p>
                  <p className="text-[10px] text-[#697468]">
                    {participant.categorias?.nombre || 'Categoría'} · {participant.respuesta_participacion === 'Si' ? 'Confirmado' : participant.respuesta_participacion === 'No' ? 'No participa' : 'Pendiente'} · {participant.estado_pago || 'Pendiente'}
                  </p>
                </div>
              </div>
            ))}
            {!participants.length ? (
              <div className="col-span-full rounded-[16px] border border-dashed border-[#d9e0d6] p-6 text-center text-sm text-[#697468]">Selecciona una categoría y envía la primera convocatoria.</div>
            ) : null}
          </div>
        </div>
      </DirectorPanel>

      <DirectorPanel className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[.14em] text-[#789600]">Después · eventos de esta competencia</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-.03em] text-[#111711]">Partidos, duelos, pruebas y presentaciones</h2>
            <p className="mt-1 text-sm text-[#697468]">Los eventos son independientes de la participación general del torneo. Puedes agregarlos cuando conozcas fechas, rivales u horarios.</p>
          </div>
          <div className="flex gap-2">
            <span className="rounded-full border border-[#cde995] bg-[#f3fadf] px-3 py-1 text-xs font-black text-[#5f7900]">{eventStats.jugados} finalizados</span>
            <span className="rounded-full border border-[#d9e0d6] bg-[#f5f7f3] px-3 py-1 text-xs font-black text-[#697468]">{eventStats.pendientes} pendientes</span>
          </div>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {events.slice(0, 9).map((event) => (
            <article key={event.id} className="rounded-[18px] border border-[#dfe5dc] bg-[#f8faf6] p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[.12em] text-[#789600]">{event.sport_profile?.icon || '🏅'} {event.sport_profile?.activityLabel || 'Evento'}</p>
                  <h3 className="mt-1 font-black text-[#111711]">{event.rival}</h3>
                  <p className="mt-1 text-xs text-[#697468]">{event.categorias?.nombre || 'Sin categoría'} · {event.fecha} · {String(event.hora || '').slice(0, 5)}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-[9px] font-black uppercase ${event.estado === 'Jugado' ? 'bg-[#e8f6d0] text-[#416400]' : 'bg-white text-[#697468]'}`}>{event.estado}</span>
              </div>
              {event.estado === 'Jugado' && event.sport_profile?.usesHeadToHeadScore ? (
                <p className="mt-3 rounded-xl bg-[#111711] p-2 text-center text-sm font-black text-white">{event.goles_favor || 0} — {event.goles_contra || 0} {event.sport_profile?.scoreLabel || ''}</p>
              ) : null}
            </article>
          ))}
          {!events.length ? (
            <div className="col-span-full rounded-[18px] border border-dashed border-[#d9e0d6] p-8 text-center">
              <p className="text-sm font-black text-[#111711]">Todavía no hay eventos. Eso no impide convocar al equipo.</p>
              <p className="mt-1 text-xs text-[#697468]">Cuando tengas la programación, agrega aquí el primer partido, duelo o prueba.</p>
              <Link to={`/partidos?torneo_id=${tournament.id}`} className={`${DIRECTOR_BUTTON} mt-4`}>Agregar evento</Link>
            </div>
          ) : null}
        </div>

        {events.length > 9 ? (
          <div className="mt-4 text-right"><Link to={`/partidos?torneo_id=${tournament.id}`} className="text-xs font-black text-[#5f7900]">Ver todos los eventos →</Link></div>
        ) : null}
      </DirectorPanel>

      {tournament.reglamento_url ? (
        <DirectorPanel className="border-[#cde995] bg-[#f3fadf] p-4">
          <p className="text-sm font-black text-[#435b00]">Bases o reglamento</p>
          <a href={tournament.reglamento_url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-xs font-semibold text-[#5f6900] underline">{tournament.reglamento_url}</a>
        </DirectorPanel>
      ) : null}
    </DirectorPage>
  );
}

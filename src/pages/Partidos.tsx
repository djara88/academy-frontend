// src/pages/Partidos.tsx
import React, { useEffect, useState } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAcademyMessages } from '../hooks/useAcademyMessages';

interface CompetitiveMetric {
  code: string;
  label: string;
  aggregate?: string;
  unit?: string | null;
  decimals?: number;
}

interface EventUiProfile {
  conditionMode: 'required' | 'optional' | 'hidden';
  equipmentMode: 'uniform' | 'freeform';
  equipmentLabel: string;
  equipmentPlaceholder?: string | null;
}

interface CompetitiveProfile {
  code: string;
  label: string;
  icon: string;
  activityLabel: string;
  opponentLabel: string;
  scoreLabel: string;
  usesHeadToHeadScore: boolean;
  eventUi?: EventUiProfile;
  metricVersion: number;
  metrics: CompetitiveMetric[];
}

interface Partido {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
  hora_citacion?: string | null;
  ubicacion: string;
  link_maps: string;
  color_uniforme: string;
  condicion: string;
  es_amistoso: boolean;
  cobra_arbitraje: boolean;
  monto_arbitraje_jugador: number;
  goles_favor?: number;
  goles_contra?: number;
  estado: string;
  categoria_id?: string;
  torneo_id?: string;
  categorias?: { nombre: string };
  torneos?: { nombre: string };
  sport_profile?: CompetitiveProfile;
}

interface StatJugador {
  jugador_id: string;
  nombre: string;
  foto_base64?: string;
  metricas_competitivas: Record<string, number>;
  es_mvp: boolean;
}

const FALLBACK_PROFILE: CompetitiveProfile = {
  code: 'generico',
  label: 'Deporte',
  icon: '🏅',
  activityLabel: 'Encuentro',
  opponentLabel: 'Rival / evento',
  scoreLabel: 'Puntos',
  usesHeadToHeadScore: true,
  eventUi: { conditionMode: 'optional', equipmentMode: 'freeform', equipmentLabel: 'Indumentaria / equipamiento', equipmentPlaceholder: 'Ej: equipamiento requerido' },
  metricVersion: 1,
  metrics: [
    { code: 'participaciones', label: 'Participaciones', decimals: 0 },
    { code: 'victorias', label: 'Victorias', decimals: 0 },
    { code: 'podios', label: 'Podios', decimals: 0 },
    { code: 'puntos', label: 'Puntos', decimals: 2 },
  ],
};

const toMinutes = (value: string) => {
  const [hours, minutes] = value.slice(0, 5).split(':').map(Number);
  return Number.isFinite(hours) && Number.isFinite(minutes) ? hours * 60 + minutes : 0;
};

const fromMinutes = (value: number) => {
  const normalized = (value + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
};

const shiftTime = (value: string, minutes: number) => fromMinutes(toMinutes(value) + minutes);

const LEGACY_UNIFORM_VALUES = new Set(['Titular', 'Visita', 'Ambas (Llevar ambos)', 'Indumentaria principal']);
const eventUiOf = (profile: CompetitiveProfile): EventUiProfile => profile.eventUi || FALLBACK_PROFILE.eventUi!;
const meaningfulEquipment = (profile: CompetitiveProfile, value?: string | null) => {
  const text = String(value || '').trim();
  if (!text) return '';
  if (eventUiOf(profile).equipmentMode === 'freeform' && LEGACY_UNIFORM_VALUES.has(text)) return '';
  return text;
};

const TimeSelector = ({ label, value, onChange, quickTimes, help }: { label: string; value: string; onChange: (value: string) => void; quickTimes: string[]; help?: string }) => (
  <div className="rounded-2xl border border-[#30363d] bg-[#0d1117] p-4">
    <div className="mb-3 flex items-start justify-between gap-3">
      <div><label className="block font-black text-white">{label}</label>{help ? <p className="mt-1 text-xs text-gray-500">{help}</p> : null}</div>
      <input required type="time" step="300" value={value} onChange={(event) => onChange(event.target.value)} className="w-32 rounded-xl border border-[#289E9D]/60 bg-[#161b22] px-3 py-2 text-center text-lg font-black text-white outline-none focus:border-[#48d8d0]" />
    </div>
    <div className="flex flex-wrap gap-2">
      {quickTimes.map((time) => <button key={time} type="button" onClick={() => onChange(time)} className={`min-h-10 rounded-lg border px-3 py-2 text-xs font-black transition ${value.slice(0, 5) === time ? 'border-[#48d8d0] bg-[#289E9D]/25 text-[#70e4df]' : 'border-[#30363d] bg-[#161b22] text-gray-300 hover:border-[#289E9D]'}`}>{time}</button>)}
      <button type="button" onClick={() => value && onChange(shiftTime(value, -15))} className="min-h-10 rounded-lg border border-[#30363d] px-3 text-xs font-bold text-gray-400">−15 min</button>
      <button type="button" onClick={() => value && onChange(shiftTime(value, 15))} className="min-h-10 rounded-lg border border-[#30363d] px-3 text-xs font-bold text-gray-400">+15 min</button>
    </div>
  </div>
);

const Partidos: React.FC = () => {
  const { user } = useAuth();
  const { confirmAction, notify } = useAcademyMessages();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModalPartido, setShowModalPartido] = useState(false);
  const [idPartidoEditando, setIdPartidoEditando] = useState<string | null>(null);
  const [showModalCitaciones, setShowModalCitaciones] = useState(false);
  const [showModalResultado, setShowModalResultado] = useState(false);

  const [partidoSeleccionado, setPartidoSeleccionado] = useState<Partido | null>(null);
  const [citados, setCitados] = useState<any[]>([]);
  const [statsJugadores, setStatsJugadores] = useState<StatJugador[]>([]);
  const [competitiveProfile, setCompetitiveProfile] = useState<CompetitiveProfile>(FALLBACK_PROFILE);
  const [formSportProfile, setFormSportProfile] = useState<CompetitiveProfile>(FALLBACK_PROFILE);

  const [resultadoFavor, setResultadoFavor] = useState<number>(0);
  const [resultadoContra, setResultadoContra] = useState<number>(0);
  const [enviarWhatsappResumen, setEnviarWhatsappResumen] = useState<boolean>(true);
  const [enviandoCitacion, setEnviandoCitacion] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    es_amistoso: false,
    torneo_id: '',
    categoria_id: '',
    rival: '',
    fecha: '',
    hora: '18:00',
    hora_citacion: '17:00',
    ubicacion: '',
    link_maps: '',
    color_uniforme: 'Titular',
    condicion: 'Local',
    cobra_arbitraje: false,
    monto_arbitraje_jugador: 0,
  });

  useEffect(() => { void cargarDatos(); }, []);

  const aplicarPerfilFormulario = (profile?: CompetitiveProfile | null) => {
    const nextProfile = profile || FALLBACK_PROFILE;
    const eventUi = eventUiOf(nextProfile);
    setFormSportProfile(nextProfile);
    setForm((current) => {
      const currentEquipment = String(current.color_uniforme || '');
      const nextEquipment = eventUi.equipmentMode === 'uniform'
        ? (LEGACY_UNIFORM_VALUES.has(currentEquipment) ? currentEquipment : 'Titular')
        : (LEGACY_UNIFORM_VALUES.has(currentEquipment) ? '' : currentEquipment);
      const nextCondition = eventUi.conditionMode === 'required'
        ? (['Local', 'Visita'].includes(current.condicion) ? current.condicion : 'Local')
        : eventUi.conditionMode === 'optional'
          ? (['Local', 'Visita', 'Evento'].includes(current.condicion) ? current.condicion : 'Evento')
          : 'Evento';
      return { ...current, color_uniforme: nextEquipment, condicion: nextCondition };
    });
  };

  const cargarPerfilCategoria = async (categoriaId: string) => {
    if (!categoriaId) return aplicarPerfilFormulario(FALLBACK_PROFILE);
    const category = categorias.find((item: any) => String(item.id) === String(categoriaId));
    if (!category?.rama_id) return aplicarPerfilFormulario(FALLBACK_PROFILE);
    try {
      const response = await api.get('/api/sport-profiles', { params: { rama_id: category.rama_id } });
      aplicarPerfilFormulario(response.data?.data?.competitive || FALLBACK_PROFILE);
    } catch (error) {
      console.error('No fue posible cargar el perfil competitivo de la categoría:', error);
      aplicarPerfilFormulario(FALLBACK_PROFILE);
    }
  };

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resP, resT, resC] = await Promise.all([
        api.get('/api/partidos'),
        api.get('/api/torneos'),
        api.get('/api/jugadores/categorias'),
      ]);
      setPartidos(resP.data.data || []);
      setTorneos(resT.data.data || []);
      setCategorias(resC.data.data || []);
    } catch (error) {
      console.error('Error cargando encuentros:', error);
    } finally {
      setLoading(false);
    }
  };

  const abrirModalCrear = () => {
    setIdPartidoEditando(null);
    setForm({
      es_amistoso: false,
      torneo_id: '',
      categoria_id: '',
      rival: '',
      fecha: '',
      hora: '18:00',
      hora_citacion: '17:00',
      ubicacion: '',
      link_maps: '',
      color_uniforme: 'Titular',
      condicion: 'Local',
      cobra_arbitraje: false,
      monto_arbitraje_jugador: 0,
    });
    setFormSportProfile(FALLBACK_PROFILE);
    setShowModalPartido(true);
  };

  const abrirModalEditar = (p: Partido) => {
    setIdPartidoEditando(p.id);
    setForm({
      es_amistoso: p.es_amistoso || false,
      torneo_id: p.torneo_id || '',
      categoria_id: p.categoria_id || '',
      rival: p.rival || '',
      fecha: p.fecha || '',
      hora: p.hora || '',
      hora_citacion: p.hora_citacion?.slice(0, 5) || (p.hora ? shiftTime(p.hora, -60) : '17:00'),
      ubicacion: p.ubicacion || '',
      link_maps: p.link_maps || '',
      color_uniforme: p.color_uniforme || 'Titular',
      condicion: p.condicion || 'Local',
      cobra_arbitraje: p.cobra_arbitraje || false,
      monto_arbitraje_jugador: p.monto_arbitraje_jugador || 0,
    });
    setFormSportProfile(p.sport_profile || FALLBACK_PROFILE);
    setShowModalPartido(true);
  };

  const handleEliminarPartido = async (partido: Partido) => {
    const conf = await confirmAction(`¿Estás seguro de eliminar este encuentro con "${partido.rival}"?`, 'danger');
    if (!conf) return;
    try {
      await api.delete(`/api/partidos/${partido.id}`);
      void cargarDatos();
    } catch (_error) {
      void notify('Error al eliminar el encuentro.');
    }
  };

  const handleEnviarCitacion = async (partido: Partido) => {
    if (!partido.categoria_id) return notify('Este encuentro no tiene una categoría asignada.');
    const conf = await confirmAction(`¿Deseas enviar la citación de WhatsApp a la categoría ${partido.categorias?.nombre || ''}?`);
    if (!conf) return;

    setEnviandoCitacion(true);
    try {
      await api.post(`/api/partidos/${partido.id}/citacion`);
      await notify('✅ Citaciones de WhatsApp enviadas con éxito.');
      void abrirCitaciones(partido);
    } catch (error: any) {
      await notify(error.response?.data?.error || 'Error enviando citaciones.');
    } finally {
      setEnviandoCitacion(false);
    }
  };

  const abrirCitaciones = async (partido: Partido) => {
    setPartidoSeleccionado(partido);
    setShowModalCitaciones(true);
    try {
      const res = await api.get(`/api/partidos/${partido.id}/citaciones`);
      setCitados(res.data.data || []);
    } catch (error) {
      console.error('Error cargando citados:', error);
    }
  };

  const abrirModalResultado = async (partido: Partido) => {
    setPartidoSeleccionado(partido);
    setResultadoFavor(partido.goles_favor || 0);
    setResultadoContra(partido.goles_contra || 0);
    setCompetitiveProfile(partido.sport_profile || FALLBACK_PROFILE);
    setShowModalResultado(true);

    try {
      const res = await api.get(`/api/partidos/${partido.id}/estadisticas`);
      const profile: CompetitiveProfile = res.data.profile || partido.sport_profile || FALLBACK_PROFILE;
      setCompetitiveProfile(profile);
      const players = (res.data.data || []).map((stat: StatJugador) => ({
        ...stat,
        metricas_competitivas: Object.fromEntries(profile.metrics.map((metric) => [
          metric.code,
          Number(stat.metricas_competitivas?.[metric.code] || 0),
        ])),
      }));
      setStatsJugadores(players);
    } catch (error) {
      console.error('Error al cargar estadísticas del encuentro:', error);
      setStatsJugadores([]);
    }
  };

  const handleMetricChange = (jugadorId: string, metricCode: string, value: number) => {
    setStatsJugadores((prev) => prev.map((stat) => stat.jugador_id === jugadorId
      ? { ...stat, metricas_competitivas: { ...stat.metricas_competitivas, [metricCode]: value } }
      : stat));
  };

  const handleMvpChange = (jugadorId: string, checked: boolean) => {
    setStatsJugadores((prev) => prev.map((stat) => ({
      ...stat,
      es_mvp: stat.jugador_id === jugadorId ? checked : (checked ? false : stat.es_mvp),
    })));
  };

  const guardarResultadoCompleto = async () => {
    if (!partidoSeleccionado) return;
    setGuardando(true);
    try {
      await api.post(`/api/partidos/${partidoSeleccionado.id}/guardar-resultado`, {
        resultado_favor: resultadoFavor,
        resultado_contra: resultadoContra,
        estadisticas: statsJugadores,
        enviarWhatsapp: enviarWhatsappResumen,
      });

      await notify(enviarWhatsappResumen ? '✅ Resultado guardado e informe enviado por WhatsApp.' : '✅ Resultado guardado correctamente.');
      setShowModalResultado(false);
      void cargarDatos();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'Error al guardar el resultado.');
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (idPartidoEditando) await api.put(`/api/partidos/${idPartidoEditando}`, form);
      else await api.post('/api/partidos', form);
      setShowModalPartido(false);
      void cargarDatos();
    } catch (error: any) {
      await notify(error.response?.data?.error || 'Error al procesar el encuentro.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#e6edf3]">🏆 Competencias y Resultados</h1>
          <p className="text-sm text-gray-400">Programación, citaciones y estadísticas específicas para cada disciplina.</p>
        </div>
        <button onClick={abrirModalCrear} className="rounded-lg bg-[#289E9D] px-5 py-2.5 font-bold text-white shadow-lg transition-colors hover:bg-[#207f7e]">+ Programar Encuentro</button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full py-10 text-center font-bold text-[#289E9D]">Cargando competencias...</div>
        ) : partidos.length === 0 ? (
          <div className="col-span-full rounded-xl border border-[#30363d] bg-[#0d1117] py-12 text-center text-gray-500">No hay encuentros programados.</div>
        ) : partidos.map((p) => {
          const profile = p.sport_profile || FALLBACK_PROFILE;
          return (
            <div key={p.id} className="relative flex flex-col justify-between space-y-4 rounded-xl border border-[#30363d] bg-[#0d1117] p-5 transition-colors hover:border-[#289E9D]">
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-[#289E9D]/35 bg-[#289E9D]/10 px-2.5 py-0.5 font-bold text-[#70e4df]">{profile.icon} {profile.label}</span>
                    {p.es_amistoso ? <span className="rounded-full border border-purple-500/30 bg-purple-500/20 px-2.5 py-0.5 font-bold text-purple-400">🤝 Amistoso</span> : <span className="max-w-[120px] truncate rounded-full border border-blue-500/30 bg-blue-500/20 px-2.5 py-0.5 font-bold text-blue-400">🏆 {p.torneos?.nombre}</span>}
                    {eventUiOf(profile).conditionMode !== 'hidden' && <span className={`rounded-full border px-2 py-0.5 font-bold ${p.condicion === 'Visita' ? 'border-orange-500/30 bg-orange-500/20 text-orange-400' : p.condicion === 'Local' ? 'border-green-500/30 bg-green-500/20 text-green-400' : 'border-gray-600 bg-gray-800 text-gray-300'}`}>{p.condicion === 'Visita' ? '✈️ Visita' : p.condicion === 'Local' ? '🏠 Local' : '📍 Evento'}</span>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-gray-700 bg-gray-800 px-2 py-0.5 font-bold text-gray-300">🏷️ {p.categorias?.nombre || 'Sin Cat.'}</span>
                    <button onClick={() => abrirModalEditar(p)} className="p-1 text-gray-400 hover:text-white" title="Editar">✏️</button>
                    <button onClick={() => void handleEliminarPartido(p)} className="p-1 text-red-400 hover:text-red-300" title="Eliminar">🗑️</button>
                  </div>
                </div>

                <div><span className="text-xs font-semibold uppercase text-gray-400">{profile.opponentLabel}</span><h3 className="text-xl font-bold text-white">{profile.usesHeadToHeadScore ? 'vs ' : ''}{p.rival}</h3></div>

                {p.estado === 'Jugado' && (
                  <div className="rounded-lg border border-[#289E9D]/40 bg-[#161b22] p-3 text-center">
                    <span className="mb-1 block text-xs text-gray-400">Resultado registrado</span>
                    {profile.usesHeadToHeadScore ? <span className="text-2xl font-black text-[#289E9D]">{p.goles_favor || 0} - {p.goles_contra || 0} <small className="text-xs font-bold text-gray-500">{profile.scoreLabel}</small></span> : <span className="text-sm font-black text-[#70e4df]">{profile.icon} Competencia completada</span>}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 rounded-lg border border-[#30363d]/50 bg-[#161b22] p-3 text-xs text-gray-300">
                  <div><span className="block text-gray-500">📅 Fecha:</span><strong className="text-white">{p.fecha}</strong></div>
                  <div><span className="block text-gray-500">📣 Citación:</span><strong className="text-[#70e4df]">{p.hora_citacion?.slice(0, 5) || 'Por definir'}</strong></div>
                  <div><span className="block text-gray-500">⏰ Inicio:</span><strong className="text-white">{p.hora?.slice(0, 5)} hrs</strong></div>
                  {meaningfulEquipment(profile, p.color_uniforme) && <div><span className="block text-gray-500">🎽 {eventUiOf(profile).equipmentLabel}:</span><strong className="text-white">{meaningfulEquipment(profile, p.color_uniforme)}</strong></div>}
                  <div><span className="block text-gray-500">🏟️ Lugar:</span><strong className="block truncate text-white">{p.ubicacion || 'Por confirmar'}</strong></div>
                </div>

                {p.link_maps && <a href={p.link_maps} target="_blank" rel="noreferrer" className="block rounded border border-[#289E9D]/30 bg-[#161b22] py-1.5 text-center text-xs font-bold text-[#289E9D] transition-colors hover:bg-[#21262d]">🗺️ Ver ubicación</a>}
              </div>

              <div className="grid grid-cols-3 gap-2 border-t border-[#30363d]/50 pt-3">
                <button onClick={() => void handleEnviarCitacion(p)} disabled={enviandoCitacion} className="flex items-center justify-center gap-1 rounded bg-[#289E9D] py-2 text-xs font-bold text-white shadow transition-colors hover:bg-[#207f7e] disabled:opacity-50">📢 Citación</button>
                <button onClick={() => void abrirCitaciones(p)} className="rounded border border-[#30363d] bg-[#21262d] py-2 text-xs font-bold text-white transition-colors hover:bg-[#30363d]">📋 Citados</button>
                <button onClick={() => void abrirModalResultado(p)} className="rounded bg-amber-600 py-2 text-xs font-bold text-white shadow transition-colors hover:bg-amber-500">🏆 Resultado</button>
              </div>
            </div>
          );
        })}
      </div>

      {showModalPartido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-xl border border-[#30363d] bg-[#161b22] p-6">
            <h2 className="text-2xl font-bold text-white">{idPartidoEditando ? '✏️ Editar Encuentro' : '🏅 Programar Encuentro'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><label className="mb-1 block font-semibold text-gray-400">Categoría *</label><select required value={form.categoria_id} onChange={(e) => { const categoria_id = e.target.value; setForm({ ...form, categoria_id }); void cargarPerfilCategoria(categoria_id); }} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]"><option value="">-- Seleccionar --</option>{categorias.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
                <div><label className="mb-1 block font-semibold text-gray-400">Tipo *</label><select value={form.es_amistoso ? 'amistoso' : 'torneo'} onChange={(e) => setForm({ ...form, es_amistoso: e.target.value === 'amistoso' })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]"><option value="torneo">🏆 Torneo / competencia</option><option value="amistoso">🤝 Amistoso</option></select></div>
              </div>

              {!form.es_amistoso && <div><label className="mb-1 block font-semibold text-gray-400">Torneo *</label><select required={!form.es_amistoso} value={form.torneo_id} onChange={(e) => setForm({ ...form, torneo_id: e.target.value })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]"><option value="">-- Seleccionar Torneo --</option>{torneos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select></div>}

              {form.categoria_id && <div className="rounded-xl border border-[#289E9D]/30 bg-[#289E9D]/10 p-3"><p className="text-xs font-black uppercase tracking-[.15em] text-[#70e4df]">{formSportProfile.icon} {formSportProfile.label}</p><p className="mt-1 text-xs text-gray-400">Lestra adaptó los datos del encuentro a esta disciplina.</p></div>}

              <div><label className="mb-1 block font-semibold text-gray-400">{formSportProfile.opponentLabel} *</label><input required type="text" placeholder={`Ej: ${formSportProfile.opponentLabel === 'Rival' ? 'Club rival' : 'evento, rival o prueba'}`} value={form.rival} onChange={(e) => setForm({ ...form, rival: e.target.value })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]" /></div>

              <div className={`grid gap-3 ${eventUiOf(formSportProfile).conditionMode === 'hidden' ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'}`}>
                {eventUiOf(formSportProfile).conditionMode !== 'hidden' && (
                  <div><label className="mb-1 block font-semibold text-gray-400">Condición {eventUiOf(formSportProfile).conditionMode === 'required' ? '*' : '(opcional)'}</label><select value={form.condicion} onChange={(e) => setForm({ ...form, condicion: e.target.value })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]">{eventUiOf(formSportProfile).conditionMode === 'optional' && <option value="Evento">📍 Evento / sede neutral</option>}<option value="Local">🏠 Local</option><option value="Visita">✈️ Visita</option></select></div>
                )}
                {eventUiOf(formSportProfile).equipmentMode === 'uniform' ? (
                  <div><label className="mb-1 block font-semibold text-gray-400">{eventUiOf(formSportProfile).equipmentLabel} *</label><select value={form.color_uniforme} onChange={(e) => setForm({ ...form, color_uniforme: e.target.value })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]"><option value="Titular">Titular</option><option value="Visita">Visita</option><option value="Ambas (Llevar ambos)">Ambas</option></select></div>
                ) : (
                  <div><label className="mb-1 block font-semibold text-gray-400">{eventUiOf(formSportProfile).equipmentLabel} <span className="font-normal text-gray-600">(opcional)</span></label><input type="text" value={form.color_uniforme} placeholder={eventUiOf(formSportProfile).equipmentPlaceholder || 'Equipamiento requerido'} onChange={(e) => setForm({ ...form, color_uniforme: e.target.value })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]" /></div>
                )}
              </div>

              <div><label className="mb-1 block font-semibold text-gray-400">Fecha *</label><input required type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]" /></div>

              <TimeSelector label="Hora de inicio" value={form.hora} onChange={(hora) => setForm((current) => ({ ...current, hora, hora_citacion: shiftTime(hora, -60) }))} quickTimes={['09:00', '10:00', '11:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00']} help="Selecciona una hora común o ajústala de 15 en 15 minutos." />
              <TimeSelector label="Hora de citación" value={form.hora_citacion} onChange={(hora_citacion) => setForm((current) => ({ ...current, hora_citacion }))} quickTimes={[shiftTime(form.hora, -120), shiftTime(form.hora, -90), shiftTime(form.hora, -60), shiftTime(form.hora, -45)]} help="Se propone 60 minutos antes del inicio." />

              <div><label className="mb-1 block font-semibold text-gray-400">Lugar / recinto</label><input type="text" placeholder="Ej: Complejo Deportivo / Piscina / Estadio" value={form.ubicacion} onChange={(e) => setForm({ ...form, ubicacion: e.target.value })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]" /></div>
              <div><label className="mb-1 block font-semibold text-gray-400">Link de ubicación</label><input type="url" placeholder="https://maps.app.goo.gl/..." value={form.link_maps} onChange={(e) => setForm({ ...form, link_maps: e.target.value })} className="w-full rounded border border-[#30363d] bg-[#0d1117] p-2.5 text-white outline-none focus:border-[#289E9D]" /></div>

              <div className="space-y-3 rounded-lg border border-[#30363d] bg-[#0d1117] p-3">
      <label className="flex cursor-pointer items-center justify-between gap-4 font-semibold text-white">
        <span>⚖️ ¿Cobrar cuota de arbitraje / jueces a los convocados?</span>
        <input type="checkbox" checked={form.cobra_arbitraje} onChange={(e) => setForm({ ...form, cobra_arbitraje: e.target.checked })} className="accent-[#289E9D]" />
      </label>
      <p className="text-xs leading-5 text-gray-500">Opcional. Actívalo solo cuando cada deportista deba aportar una parte del arbitraje, jueces u oficiales. Lestra generará ese cobro individual al enviar la citación.</p>
      {form.cobra_arbitraje && (
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-300">Monto a cobrar por deportista</label>
          <input type="number" min="0" placeholder="Ej: 3000" value={form.monto_arbitraje_jugador} onChange={(e) => setForm({ ...form, monto_arbitraje_jugador: Number(e.target.value) })} className="w-full rounded border border-[#30363d] bg-[#161b22] p-2 text-white outline-none focus:border-[#289E9D]" />
          <p className="text-xs text-gray-500">Es el valor por alumno convocado, no el costo total del arbitraje.</p>
        </div>
      )}
    </div>

              <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={() => setShowModalPartido(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button><button type="submit" disabled={guardando} className="rounded-lg bg-[#289E9D] px-6 py-2 font-bold text-white disabled:opacity-50">{idPartidoEditando ? 'Actualizar Encuentro' : 'Guardar'}</button></div>
            </form>
          </div>
        </div>
      )}

      {showModalCitaciones && partidoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-2xl space-y-4 rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3"><div><h2 className="text-xl font-bold text-white">📋 Nómina de Citados</h2><p className="text-xs text-gray-400">{partidoSeleccionado.rival} · Categoría: {partidoSeleccionado.categorias?.nombre}</p></div><button onClick={() => setShowModalCitaciones(false)} className="font-bold text-gray-400 hover:text-white">✕</button></div>
            <div className="max-h-[60vh] overflow-y-auto">
              {citados.length === 0 ? <p className="py-8 text-center text-gray-500">Aún no se han enviado citaciones para este encuentro.</p> : (
                <table className="w-full text-left text-sm"><thead className="bg-[#0d1117] text-gray-400"><tr><th className="p-3">Deportista</th><th className="p-3 text-center">Estado</th><th className="p-3">Motivo ausencia</th></tr></thead><tbody className="divide-y divide-[#30363d]">{citados.map((c) => <tr key={c.id} className="hover:bg-[#0d1117]/50"><td className="flex items-center gap-2 p-3 font-bold text-white"><img src={c.jugadores?.foto_base64 || 'https://via.placeholder.com/150'} className="h-7 w-7 rounded-full object-cover" alt=""/>{c.jugadores?.nombre}</td><td className="p-3 text-center">{c.respuesta === 'Si' && <span className="rounded-full border border-green-500/40 bg-green-500/20 px-2.5 py-1 text-xs font-bold text-green-400">✔️ Confirmado</span>}{c.respuesta === 'No' && <span className="rounded-full border border-red-500/40 bg-red-500/20 px-2.5 py-1 text-xs font-bold text-red-400">❌ Ausente</span>}{c.respuesta === 'Pendiente' && <span className="rounded-full border border-yellow-500/40 bg-yellow-500/20 px-2.5 py-1 text-xs font-bold text-yellow-400">⏳ Pendiente</span>}</td><td className="p-3 text-xs italic text-gray-300">{c.motivo_ausencia || (c.respuesta === 'No' ? 'Sin motivo especificado' : '-')}</td></tr>)}</tbody></table>
              )}
            </div>
          </div>
        </div>
      )}

      {showModalResultado && partidoSeleccionado && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="max-h-[90vh] w-full max-w-5xl space-y-5 overflow-y-auto rounded-xl border border-[#30363d] bg-[#161b22] p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#30363d] pb-3"><div><p className="text-xs font-black uppercase tracking-[.16em] text-[#70e4df]">{competitiveProfile.icon} {competitiveProfile.label}</p><h2 className="text-xl font-bold text-white">Resultado y estadísticas</h2><p className="text-xs text-gray-400">{competitiveProfile.usesHeadToHeadScore ? 'vs ' : ''}{partidoSeleccionado.rival} · {partidoSeleccionado.fecha}</p></div><button onClick={() => setShowModalResultado(false)} className="font-bold text-gray-400 hover:text-white">✕</button></div>

            {competitiveProfile.usesHeadToHeadScore ? (
              <div className="space-y-2 rounded-xl border border-[#30363d] bg-[#0d1117] p-4"><h3 className="text-center text-sm font-bold text-gray-300">Resultado final · {competitiveProfile.scoreLabel}</h3><div className="flex items-center justify-center gap-6"><div className="text-center"><span className="mb-1 block text-xs font-bold text-[#289E9D]">{user?.nombre_academia || 'Tu academia'}</span><input type="number" min="0" step="1" value={resultadoFavor} onChange={(e) => setResultadoFavor(Number(e.target.value))} className="w-20 rounded-lg border-2 border-[#289E9D] bg-[#161b22] py-2 text-center text-2xl font-black text-white outline-none" /></div><span className="mt-5 text-2xl font-black text-gray-500">-</span><div className="text-center"><span className="mb-1 block text-xs font-bold text-red-400">{partidoSeleccionado.rival}</span><input type="number" min="0" step="1" value={resultadoContra} onChange={(e) => setResultadoContra(Number(e.target.value))} className="w-20 rounded-lg border-2 border-red-500/50 bg-[#161b22] py-2 text-center text-2xl font-black text-white outline-none" /></div></div></div>
            ) : (
              <div className="rounded-xl border border-[#289E9D]/30 bg-[#0d1117] p-4"><p className="text-sm font-bold text-[#70e4df]">{competitiveProfile.icon} {competitiveProfile.activityLabel}: {partidoSeleccionado.rival}</p><p className="mt-1 text-xs text-gray-400">Esta disciplina se registra por métricas individuales; no se fuerza un marcador de dos equipos.</p></div>
            )}

            <div>
              <h3 className="mb-2 text-sm font-bold text-white">Desempeño individual · {competitiveProfile.label}</h3>
              {statsJugadores.length === 0 ? <p className="py-6 text-center text-sm text-gray-500">No hay deportistas confirmados para este encuentro.</p> : (
                <div className="overflow-x-auto rounded-lg border border-[#30363d]"><table className="min-w-full text-left text-xs"><thead className="bg-[#0d1117] text-gray-400"><tr><th className="sticky left-0 z-10 min-w-48 bg-[#0d1117] p-2.5">Deportista</th>{competitiveProfile.metrics.map((metric) => <th key={metric.code} className="min-w-24 p-2.5 text-center">{metric.label}{metric.unit ? <span className="ml-1 text-[9px] text-gray-600">({metric.unit})</span> : null}</th>)}<th className="min-w-20 p-2.5 text-center">🌟 Destacado</th></tr></thead><tbody className="divide-y divide-[#30363d] bg-[#161b22]">{statsJugadores.map((stat) => <tr key={stat.jugador_id}><td className="sticky left-0 flex items-center gap-2 bg-[#161b22] p-2.5 font-bold text-white"><img src={stat.foto_base64 || 'https://via.placeholder.com/150'} className="h-6 w-6 rounded-full object-cover" alt=""/>{stat.nombre}</td>{competitiveProfile.metrics.map((metric) => <td key={metric.code} className="p-2.5 text-center"><input type="number" min="0" step={(metric.decimals || 0) > 0 ? 0.01 : 1} value={stat.metricas_competitivas?.[metric.code] ?? 0} onChange={(e) => handleMetricChange(stat.jugador_id, metric.code, Number(e.target.value))} className="w-20 rounded border border-[#30363d] bg-[#0d1117] p-1.5 text-center text-white outline-none focus:border-[#289E9D]" /></td>)}<td className="p-2.5 text-center"><input type="checkbox" checked={stat.es_mvp} onChange={(e) => handleMvpChange(stat.jugador_id, e.target.checked)} className="h-4 w-4 accent-amber-500" /></td></tr>)}</tbody></table></div>
              )}
            </div>

            <div className="flex flex-col items-center justify-between gap-3 border-t border-[#30363d] pt-2 md:flex-row"><label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-gray-300"><input type="checkbox" checked={enviarWhatsappResumen} onChange={(e) => setEnviarWhatsappResumen(e.target.checked)} className="h-4 w-4 accent-[#289E9D]" />📲 Enviar resumen individual por WhatsApp a los apoderados</label><div className="flex gap-3"><button type="button" onClick={() => setShowModalResultado(false)} className="px-4 py-2 text-xs text-gray-400">Cancelar</button><button onClick={() => void guardarResultadoCompleto()} disabled={guardando} className="rounded-lg bg-[#289E9D] px-5 py-2 text-xs font-bold text-white disabled:opacity-50">{guardando ? 'Guardando...' : enviarWhatsappResumen ? '💾 Guardar y enviar' : '💾 Guardar resultado'}</button></div></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partidos;

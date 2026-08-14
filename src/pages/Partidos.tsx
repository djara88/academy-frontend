// src/pages/Partidos.tsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../contexts/AuthContext';
import { useAcademyMessages } from '../hooks/useAcademyMessages';

interface Partido {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
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
}

interface StatJugador {
  jugador_id: string;
  nombre: string;
  foto_base64?: string;
  goles: number;
  asistencias: number;
  tarjetas_amarillas: number;
  tarjetas_rojas: number;
  es_mvp: boolean;
}

const Partidos: React.FC = () => {
  const { user } = useAuth();
  const { confirmAction, notify } = useAcademyMessages();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showModalPartido, setShowModalPartido] = useState(false);
  const [idPartidoEditando, setIdPartidoEditando] = useState<string | null>(null);
  const [showModalCitaciones, setShowModalCitaciones] = useState(false);
  const [showModalResultado, setShowModalResultado] = useState(false);
  
  const [partidoSeleccionado, setPartidoSeleccionado] = useState<Partido | null>(null);
  const [citados, setCitados] = useState<any[]>([]);
  const [statsJugadores, setStatsJugadores] = useState<StatJugador[]>([]);
  
  // Formulario Resultado
  const [golesFavor, setGolesFavor] = useState<number>(0);
  const [golesContra, setGolesContra] = useState<number>(0);
  const [enviarWhatsappResumen, setEnviarWhatsappResumen] = useState<boolean>(true);

  const [enviandoCitacion, setEnviandoCitacion] = useState(false);
  const [guardando, setGuardando] = useState(false);

  const [form, setForm] = useState({
    es_amistoso: false,
    torneo_id: '',
    categoria_id: '',
    rival: '',
    fecha: '',
    hora: '',
    ubicacion: '',
    link_maps: '',
    color_uniforme: 'Titular',
    condicion: 'Local',
    cobra_arbitraje: false,
    monto_arbitraje_jugador: 0
  });

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [resP, resT, resC] = await Promise.all([
        api.get('/api/partidos'),
        api.get('/api/torneos'),
        api.get('/api/jugadores/categorias')
      ]);

      setPartidos(resP.data.data || []);
      setTorneos(resT.data.data || []);
      setCategorias(resC.data.data || []);
    } catch (error) {
      console.error('Error cargando partidos:', error);
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
      hora: '',
      ubicacion: '',
      link_maps: '',
      color_uniforme: 'Titular',
      condicion: 'Local',
      cobra_arbitraje: false,
      monto_arbitraje_jugador: 0
    });
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
      ubicacion: p.ubicacion || '',
      link_maps: p.link_maps || '',
      color_uniforme: p.color_uniforme || 'Titular',
      condicion: p.condicion || 'Local',
      cobra_arbitraje: p.cobra_arbitraje || false,
      monto_arbitraje_jugador: p.monto_arbitraje_jugador || 0
    });
    setShowModalPartido(true);
  };

  const handleEliminarPartido = async (id: string, rival: string) => {
    const conf = await confirmAction(`¿Estás seguro de eliminar el partido vs "${rival}"?`, 'danger');
    if (!conf) return;

    try {
      await api.delete(`/api/partidos/${id}`);
      cargarDatos();
    } catch (error) {
      notify('Error al eliminar el partido.');
    }
  };

  const handleEnviarCitacion = async (partido: Partido) => {
    if (!partido.categoria_id) return notify('Este partido no tiene una categoría asignada.');
    
    const conf = await confirmAction(`¿Deseas enviar la citación de WhatsApp a todos los jugadores de la categoría ${partido.categorias?.nombre || ''}?`);
    if (!conf) return;

    setEnviandoCitacion(true);
    try {
      await api.post(`/api/partidos/${partido.id}/citacion`);
      notify('✅ ¡Citaciones de WhatsApp enviadas con éxito!');
      abrirCitaciones(partido);
    } catch (error: any) {
      notify(error.response?.data?.error || 'Error enviando citaciones.');
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
    setGolesFavor(partido.goles_favor || 0);
    setGolesContra(partido.goles_contra || 0);
    setShowModalResultado(true);

    try {
      const res = await api.get(`/api/partidos/${partido.id}/estadisticas`);
      setStatsJugadores(res.data.data || []);
    } catch (error) {
      console.error('Error al cargar estadísticas del partido:', error);
    }
  };

  const handleStatChange = (jugadorId: string, field: keyof StatJugador, value: any) => {
    setStatsJugadores(prev => prev.map(s => {
      if (s.jugador_id === jugadorId) {
        return { ...s, [field]: value };
      }
      // Si se marca un MVP, desmarcamos los demás
      if (field === 'es_mvp' && value === true) {
        return { ...s, es_mvp: false };
      }
      return s;
    }));
  };

  const guardarResultadoCompleto = async () => {
    if (!partidoSeleccionado) return;
    setGuardando(true);

    try {
      await api.post(`/api/partidos/${partidoSeleccionado.id}/guardar-resultado`, {
        goles_favor: golesFavor,
        goles_contra: golesContra,
        estadisticas: statsJugadores,
        enviarWhatsapp: enviarWhatsappResumen
      });

      notify('✅ ¡Resultado guardado e informe enviado por WhatsApp!');
      setShowModalResultado(false);
      cargarDatos();
    } catch (error: any) {
      notify(error.response?.data?.error || 'Error al guardar el resultado.');
    } finally {
      setGuardando(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      if (idPartidoEditando) {
        await api.put(`/api/partidos/${idPartidoEditando}`, form);
      } else {
        await api.post('/api/partidos', form);
      }
      setShowModalPartido(false);
      cargarDatos();
    } catch (error) {
      notify('Error al procesar el partido.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#e6edf3]">⚽ Fixture y Resultados</h1>
          <p className="text-sm text-gray-400">Programación de encuentros, citaciones y registro de estadísticas.</p>
        </div>
        <button 
          onClick={abrirModalCrear}
          className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-5 py-2.5 rounded-lg font-bold shadow-lg transition-colors cursor-pointer"
        >
          + Programar Partido
        </button>
      </div>

      {/* LISTA DE PARTIDOS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-10 text-[#289E9D] font-bold">Cargando partidos...</div>
        ) : partidos.length === 0 ? (
          <div className="col-span-full text-center py-12 bg-[#0d1117] rounded-xl border border-[#30363d] text-gray-500">
            No hay partidos programados.
          </div>
        ) : (
          partidos.map(p => (
            <div key={p.id} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4 relative hover:border-[#289E9D] transition-colors flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-1.5">
                    {p.es_amistoso ? (
                      <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">🤝 Amistoso</span>
                    ) : (
                      <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold truncate max-w-[120px]">🏆 {p.torneos?.nombre}</span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full font-bold border ${p.condicion === 'Visita' ? 'bg-orange-500/20 text-orange-400 border-orange-500/30' : 'bg-green-500/20 text-green-400 border-green-500/30'}`}>
                      {p.condicion === 'Visita' ? '✈️ Visita' : '🏠 Local'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2 py-0.5 rounded-full font-bold">🏷️ {p.categorias?.nombre || 'Sin Cat.'}</span>
                    <button onClick={() => abrirModalEditar(p)} className="text-gray-400 hover:text-white p-1" title="Editar">✏️</button>
                    <button onClick={() => handleEliminarPartido(p.id, p.rival)} className="text-red-400 hover:text-red-300 p-1" title="Eliminar">🗑️</button>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-gray-400 uppercase font-semibold">Rival</span>
                  <h3 className="text-xl font-bold text-white">vs {p.rival}</h3>
                </div>

                {/* MARCADOR SI EL PARTIDO YA SE JUGÓ */}
                {p.estado === 'Jugado' && (
                  <div className="bg-[#161b22] border border-[#289E9D]/40 p-3 rounded-lg text-center">
                    <span className="text-xs text-gray-400 block mb-1">Resultado Final</span>
                    <span className="text-2xl font-black text-[#289E9D]">
                      {p.goles_favor} - {p.goles_contra}
                    </span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 text-xs bg-[#161b22] p-3 rounded-lg border border-[#30363d]/50 text-gray-300">
                  <div><span className="text-gray-500 block">📅 Fecha:</span> <strong className="text-white">{p.fecha}</strong></div>
                  <div><span className="text-gray-500 block">⏰ Hora:</span> <strong className="text-white">{p.hora} hrs</strong></div>
                  <div><span className="text-gray-500 block">👕 Uniforme:</span> <strong className="text-white">{p.color_uniforme}</strong></div>
                  <div><span className="text-gray-500 block">🏟️ Lugar:</span> <strong className="text-white truncate block">{p.ubicacion || 'Por confirmar'}</strong></div>
                </div>

                {p.link_maps && (
                  <a 
                    href={p.link_maps} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block text-center bg-[#161b22] hover:bg-[#21262d] text-[#289E9D] border border-[#289E9D]/30 py-1.5 rounded text-xs font-bold transition-colors"
                  >
                    🗺️ Ver Ubicación en Mapas
                  </a>
                )}
              </div>

              <div className="pt-3 grid grid-cols-3 gap-2 border-t border-[#30363d]/50">
                <button 
                  onClick={() => handleEnviarCitacion(p)}
                  disabled={enviandoCitacion}
                  className="bg-[#289E9D] hover:bg-[#207f7e] text-white py-2 rounded text-xs font-bold transition-colors shadow flex justify-center items-center gap-1"
                >
                  📢 Citación
                </button>
                <button 
                  onClick={() => abrirCitaciones(p)}
                  className="bg-[#21262d] hover:bg-[#30363d] text-white py-2 rounded text-xs font-bold border border-[#30363d] transition-colors"
                >
                  📋 Citados
                </button>
                <button 
                  onClick={() => abrirModalResultado(p)}
                  className="bg-amber-600 hover:bg-amber-500 text-white py-2 rounded text-xs font-bold transition-colors shadow"
                >
                  🏆 Resultado
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL PROGRAMAR O EDITAR PARTIDO */}
      {showModalPartido && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold text-white">
              {idPartidoEditando ? '✏️ Editar Partido' : '⚽ Programar Partido'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Categoría *</label>
                  <select 
                    required 
                    value={form.categoria_id} 
                    onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                  >
                    <option value="">-- Seleccionar --</option>
                    {categorias.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Tipo *</label>
                  <select 
                    value={form.es_amistoso ? 'amistoso' : 'torneo'} 
                    onChange={e => setForm({ ...form, es_amistoso: e.target.value === 'amistoso' })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                  >
                    <option value="torneo">🏆 Torneo</option>
                    <option value="amistoso">🤝 Amistoso</option>
                  </select>
                </div>
              </div>

              {!form.es_amistoso && (
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Torneo *</label>
                  <select 
                    required={!form.es_amistoso} 
                    value={form.torneo_id} 
                    onChange={e => setForm({ ...form, torneo_id: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                  >
                    <option value="">-- Seleccionar Torneo --</option>
                    {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Rival *</label>
                <input required type="text" placeholder="Ej: Colo Colo Filial Sur" value={form.rival} onChange={e => setForm({ ...form, rival: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Condición *</label>
                  <select 
                    value={form.condicion} 
                    onChange={e => setForm({ ...form, condicion: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                  >
                    <option value="Local">🏠 Local</option>
                    <option value="Visita">✈️ Visita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Uniforme *</label>
                  <select 
                    value={form.color_uniforme} 
                    onChange={e => setForm({ ...form, color_uniforme: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]"
                  >
                    <option value="Titular">Titular</option>
                    <option value="Visita">Visita</option>
                    <option value="Ambas (Llevar ambos)">Ambas (Llevar ambos)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Fecha *</label>
                  <input required type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Hora *</label>
                  <input required type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]" />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Lugar / Cancha</label>
                <input type="text" placeholder="Ej: Complejo Deportivo Cordillera" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]" />
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Link de Ubicación (Waze / Google Maps)</label>
                <input 
                  type="url" 
                  placeholder="https://maps.app.goo.gl/..." 
                  value={form.link_maps} 
                  onChange={e => setForm({ ...form, link_maps: e.target.value })} 
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none focus:border-[#289E9D]" 
                />
              </div>

              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2">
                <label className="flex items-center justify-between cursor-pointer text-white font-semibold">
                  <span>⚖️ ¿Aplica cuota de arbitraje?</span>
                  <input type="checkbox" checked={form.cobra_arbitraje} onChange={e => setForm({ ...form, cobra_arbitraje: e.target.checked })} className="accent-[#289E9D]" />
                </label>
                {form.cobra_arbitraje && (
                  <input type="number" placeholder="Monto por jugador ($)" value={form.monto_arbitraje_jugador} onChange={e => setForm({ ...form, monto_arbitraje_jugador: Number(e.target.value) })} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none focus:border-[#289E9D]" />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModalPartido(false)} className="px-4 py-2 text-gray-400 hover:text-white">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-6 py-2 rounded-lg font-bold">
                  {idPartidoEditando ? 'Actualizar Partido' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER CITADOS */}
      {showModalCitaciones && partidoSeleccionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#30363d] pb-3">
              <div>
                <h2 className="text-xl font-bold text-white">📋 Nómina de Citados</h2>
                <p className="text-xs text-gray-400">vs {partidoSeleccionado.rival} | Categoría: {partidoSeleccionado.categorias?.nombre}</p>
              </div>
              <button onClick={() => setShowModalCitaciones(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {citados.length === 0 ? (
                <p className="text-center text-gray-500 py-8">Aún no se han enviado citaciones para este partido.</p>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#0d1117] text-gray-400">
                    <tr>
                      <th className="p-3">Jugador</th>
                      <th className="p-3 text-center">Estado</th>
                      <th className="p-3">Motivo Ausencia</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d]">
                    {citados.map(c => (
                      <tr key={c.id} className="hover:bg-[#0d1117]/50">
                        <td className="p-3 font-bold text-white flex items-center gap-2">
                          <img src={c.jugadores?.foto_base64 || 'https://via.placeholder.com/150'} className="w-7 h-7 rounded-full object-cover" alt="img"/>
                          {c.jugadores?.nombre}
                        </td>
                        <td className="p-3 text-center">
                          {c.respuesta === 'Si' && <span className="bg-green-500/20 text-green-400 border border-green-500/40 px-2.5 py-1 rounded-full text-xs font-bold">✔️ Confirmado</span>}
                          {c.respuesta === 'No' && <span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2.5 py-1 rounded-full text-xs font-bold">❌ Ausente</span>}
                          {c.respuesta === 'Pendiente' && <span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-2.5 py-1 rounded-full text-xs font-bold">⏳ Pendiente</span>}
                        </td>
                        <td className="p-3 text-gray-300 italic text-xs">
                          {c.motivo_ausencia || (c.respuesta === 'No' ? 'Sin motivo especificado' : '-')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL REGISTRAR RESULTADO Y ESTADÍSTICAS INDIVIDUALES */}
      {showModalResultado && partidoSeleccionado && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-3xl p-6 space-y-5 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b border-[#30363d] pb-3">
              <div>
                <h2 className="text-xl font-bold text-white">🏆 Resultado y Estadísticas</h2>
                <p className="text-xs text-gray-400">vs {partidoSeleccionado.rival} | {partidoSeleccionado.fecha}</p>
              </div>
              <button onClick={() => setShowModalResultado(false)} className="text-gray-400 hover:text-white font-bold">✕</button>
            </div>

            {/* MARCADOR FINAL */}
            <div className="bg-[#0d1117] p-4 rounded-xl border border-[#30363d] space-y-2">
              <h3 className="text-sm font-bold text-gray-300 text-center">Marcador Final del Encuentro</h3>
              <div className="flex justify-center items-center gap-6">
                <div className="text-center">
                  <span className="text-xs text-[#289E9D] font-bold block mb-1">{user?.nombre_academia || 'Tu academia'}</span>
                  <input 
                    type="number" 
                    min="0"
                    value={golesFavor} 
                    onChange={e => setGolesFavor(Number(e.target.value))}
                    className="w-20 bg-[#161b22] border-2 border-[#289E9D] rounded-lg py-2 text-center text-2xl font-black text-white outline-none"
                  />
                </div>
                <span className="text-2xl font-black text-gray-500 mt-5">-</span>
                <div className="text-center">
                  <span className="text-xs text-red-400 font-bold block mb-1">vs {partidoSeleccionado.rival}</span>
                  <input 
                    type="number" 
                    min="0"
                    value={golesContra} 
                    onChange={e => setGolesContra(Number(e.target.value))}
                    className="w-20 bg-[#161b22] border-2 border-red-500/50 rounded-lg py-2 text-center text-2xl font-black text-white outline-none"
                  />
                </div>
              </div>
            </div>

            {/* TABLA DE ESTADÍSTICAS INDIVIDUALES DE JUGADORES CONFIRMADOS */}
            <div>
              <h3 className="text-sm font-bold text-white mb-2">Desempeño Individual de Alumnos Confirmados</h3>
              {statsJugadores.length === 0 ? (
                <p className="text-center text-gray-500 py-6 text-sm">No hay jugadores confirmados para este partido.</p>
              ) : (
                <div className="overflow-x-auto border border-[#30363d] rounded-lg">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-[#0d1117] text-gray-400">
                      <tr>
                        <th className="p-2.5">Jugador</th>
                        <th className="p-2.5 text-center">Goles</th>
                        <th className="p-2.5 text-center">Asist.</th>
                        <th className="p-2.5 text-center">🟨 Amarillas</th>
                        <th className="p-2.5 text-center">🟥 Rojas</th>
                        <th className="p-2.5 text-center">🌟 MVP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#30363d] bg-[#161b22]">
                      {statsJugadores.map(s => (
                        <tr key={s.jugador_id}>
                          <td className="p-2.5 font-bold text-white flex items-center gap-2">
                            <img src={s.foto_base64 || 'https://via.placeholder.com/150'} className="w-6 h-6 rounded-full object-cover" alt="img"/>
                            {s.nombre}
                          </td>
                          <td className="p-2.5 text-center">
                            <input type="number" min="0" value={s.goles} onChange={e => handleStatChange(s.jugador_id, 'goles', Number(e.target.value))} className="w-12 bg-[#0d1117] border border-[#30363d] rounded text-center p-1 text-white" />
                          </td>
                          <td className="p-2.5 text-center">
                            <input type="number" min="0" value={s.asistencias} onChange={e => handleStatChange(s.jugador_id, 'asistencias', Number(e.target.value))} className="w-12 bg-[#0d1117] border border-[#30363d] rounded text-center p-1 text-white" />
                          </td>
                          <td className="p-2.5 text-center">
                            <input type="number" min="0" value={s.tarjetas_amarillas} onChange={e => handleStatChange(s.jugador_id, 'tarjetas_amarillas', Number(e.target.value))} className="w-12 bg-[#0d1117] border border-[#30363d] rounded text-center p-1 text-white" />
                          </td>
                          <td className="p-2.5 text-center">
                            <input type="number" min="0" value={s.tarjetas_rojas} onChange={e => handleStatChange(s.jugador_id, 'tarjetas_rojas', Number(e.target.value))} className="w-12 bg-[#0d1117] border border-[#30363d] rounded text-center p-1 text-white" />
                          </td>
                          <td className="p-2.5 text-center">
                            <input type="checkbox" checked={s.es_mvp} onChange={e => handleStatChange(s.jugador_id, 'es_mvp', e.target.checked)} className="accent-amber-500 w-4 h-4" />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* OPCIÓN WHATSAPP Y ACCIONES */}
            <div className="pt-2 border-t border-[#30363d] flex flex-col md:flex-row items-center justify-between gap-3">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-gray-300 font-semibold">
                <input 
                  type="checkbox" 
                  checked={enviarWhatsappResumen} 
                  onChange={e => setEnviarWhatsappResumen(e.target.checked)}
                  className="accent-[#289E9D] w-4 h-4" 
                />
                📲 Enviar informe detallado por WhatsApp a los apoderados confirmados
              </label>

              <div className="flex gap-3">
                <button type="button" onClick={() => setShowModalResultado(false)} className="px-4 py-2 text-xs text-gray-400">Cancelar</button>
                <button 
                  onClick={guardarResultadoCompleto} 
                  disabled={guardando} 
                  className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-5 py-2 rounded-lg text-xs font-bold"
                >
                  {guardando ? 'Guardando...' : '💾 Guardar y Enviar Informe'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Partidos;

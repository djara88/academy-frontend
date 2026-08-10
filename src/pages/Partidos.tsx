// src/pages/Partidos.tsx
import React, { useState, useEffect } from 'react';
import api from '../api/axiosConfig';

interface Partido {
  id: string;
  rival: string;
  fecha: string;
  hora: string;
  ubicacion: string;
  link_maps: string;
  color_uniforme: string;
  es_amistoso: boolean;
  cobra_arbitraje: boolean;
  monto_arbitraje_jugador: number;
  estado: string;
  categoria_id?: string;
  categorias?: { nombre: string };
  torneos?: { nombre: string };
}

const Partidos: React.FC = () => {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [torneos, setTorneos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modales
  const [showModalPartido, setShowModalPartido] = useState(false);
  const [showModalCitaciones, setShowModalCitaciones] = useState(false);
  const [partidoSeleccionado, setPartidoSeleccionado] = useState<Partido | null>(null);
  const [citados, setCitados] = useState<any[]>([]);
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

  const handleEnviarCitacion = async (partido: Partido) => {
    if (!partido.categoria_id) return alert('Este partido no tiene una categoría asignada.');
    
    const conf = window.confirm(`¿Deseas enviar la citación de WhatsApp a todos los jugadores de la categoría ${partido.categorias?.nombre || ''}?`);
    if (!conf) return;

    setEnviandoCitacion(true);
    try {
      await api.post(`/api/partidos/${partido.id}/citacion`);
      alert('✅ ¡Citaciones de WhatsApp enviadas con éxito!');
      abrirCitaciones(partido);
    } catch (error: any) {
      alert(error.response?.data?.error || 'Error enviando citaciones.');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.post('/api/partidos', form);
      setShowModalPartido(false);
      cargarDatos();
    } catch (error) {
      alert('Error al programar el partido.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#e6edf3]">⚽ Fixture y Citaciones</h1>
          <p className="text-sm text-gray-400">Programación de partidos y control de asistencia con motivos de inasistencia.</p>
        </div>
        <button 
          onClick={() => setShowModalPartido(true)}
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
            <div key={p.id} className="bg-[#0d1117] border border-[#30363d] rounded-xl p-5 space-y-4 relative hover:border-[#289E9D] transition-colors">
              <div className="flex justify-between items-center text-xs">
                {p.es_amistoso ? (
                  <span className="bg-purple-500/20 text-purple-400 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">🤝 Amistoso</span>
                ) : (
                  <span className="bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2.5 py-0.5 rounded-full font-bold truncate max-w-[150px]">🏆 {p.torneos?.nombre}</span>
                )}
                <span className="bg-gray-800 text-gray-300 border border-gray-700 px-2.5 py-0.5 rounded-full font-bold">🏷️ {p.categorias?.nombre || 'Sin Cat.'}</span>
              </div>

              <div>
                <span className="text-xs text-gray-400 uppercase font-semibold">Rival</span>
                <h3 className="text-xl font-bold text-white">vs {p.rival}</h3>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-[#161b22] p-3 rounded-lg border border-[#30363d]/50 text-gray-300">
                <div><span className="text-gray-500 block">📅 Fecha:</span> <strong className="text-white">{p.fecha}</strong></div>
                <div><span className="text-gray-500 block">⏰ Hora:</span> <strong className="text-white">{p.hora} hrs</strong></div>
                <div className="col-span-2"><span className="text-gray-500 block">🏟️ Lugar:</span> <strong className="text-white">{p.ubicacion || 'Por confirmar'}</strong></div>
              </div>

              {p.cobra_arbitraje && (
                <div className="bg-amber-900/20 border border-amber-500/30 p-2.5 rounded-lg flex justify-between items-center text-xs text-amber-300">
                  <span>⚖️ Arbitraje:</span>
                  <strong className="text-amber-400 text-sm">${Number(p.monto_arbitraje_jugador).toLocaleString('es-CL')} / jug.</strong>
                </div>
              )}

              <div className="pt-2 grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleEnviarCitacion(p)}
                  disabled={enviandoCitacion}
                  className="bg-[#289E9D] hover:bg-[#207f7e] text-white py-2 rounded text-xs font-bold transition-colors shadow flex justify-center items-center gap-1"
                >
                  📢 Enviar Citación
                </button>
                <button 
                  onClick={() => abrirCitaciones(p)}
                  className="bg-[#21262d] hover:bg-[#30363d] text-white py-2 rounded text-xs font-bold border border-[#30363d] transition-colors"
                >
                  📋 Ver Citados
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* MODAL PROGRAMAR PARTIDO */}
      {showModalPartido && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl w-full max-w-lg p-6 space-y-4">
            <h2 className="text-2xl font-bold text-white">⚽ Programar Partido</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Categoría *</label>
                  <select 
                    required 
                    value={form.categoria_id} 
                    onChange={e => setForm({ ...form, categoria_id: e.target.value })}
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none"
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
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none"
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
                    className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none"
                  >
                    <option value="">-- Seleccionar Torneo --</option>
                    {torneos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Rival *</label>
                <input required type="text" value={form.rival} onChange={e => setForm({ ...form, rival: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Fecha *</label>
                  <input required type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none" />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1 font-semibold">Hora *</label>
                  <input required type="time" value={form.hora} onChange={e => setForm({ ...form, hora: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none" />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 mb-1 font-semibold">Lugar / Cancha</label>
                <input type="text" value={form.ubicacion} onChange={e => setForm({ ...form, ubicacion: e.target.value })} className="w-full bg-[#0d1117] border border-[#30363d] rounded p-2.5 text-white outline-none" />
              </div>

              <div className="p-3 bg-[#0d1117] border border-[#30363d] rounded-lg space-y-2">
                <label className="flex items-center justify-between cursor-pointer text-white font-semibold">
                  <span>⚖️ ¿Aplica cuota de arbitraje?</span>
                  <input type="checkbox" checked={form.cobra_arbitraje} onChange={e => setForm({ ...form, cobra_arbitraje: e.target.checked })} className="accent-[#289E9D]" />
                </label>
                {form.cobra_arbitraje && (
                  <input type="number" placeholder="Monto por jugador ($)" value={form.monto_arbitraje_jugador} onChange={e => setForm({ ...form, monto_arbitraje_jugador: Number(e.target.value) })} className="w-full bg-[#161b22] border border-[#30363d] rounded p-2 text-white outline-none" />
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowModalPartido(false)} className="px-4 py-2 text-gray-400">Cancelar</button>
                <button type="submit" disabled={guardando} className="bg-[#289E9D] text-white px-6 py-2 rounded-lg font-bold">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL VER CITADOS Y MOTIVOS DE INASISTENCIA */}
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
    </div>
  );
};

export default Partidos;

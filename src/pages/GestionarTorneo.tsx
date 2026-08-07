// src/pages/GestionarTorneo.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

const GestionarTorneo: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [torneo, setTorneo] = useState<any>(null);
  const [participantes, setParticipantes] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<any[]>([]);
  const [jugadoresTotales, setJugadoresTotales] = useState<any[]>([]);
  
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    cargarDatos();
  }, [id]);

  const cargarDatos = async () => {
    try {
      // Cargamos Todo en paralelo: El torneo, sus participantes actuales, las categorías y los jugadores
      const [resTorneo, resPart, resCat, resJug] = await Promise.all([
        api.get(`/api/torneos/${id}`),
        api.get(`/api/torneos/${id}/participantes`),
        api.get('/api/jugadores/categorias'),
        api.get('/api/jugadores')
      ]);

      setTorneo(resTorneo.data.data);
      setParticipantes(resPart.data.data);
      setCategorias(resCat.data.data);
      setJugadoresTotales(resJug.data.data);
    } catch (error) {
      console.error("Error cargando datos del torneo", error);
    }
  };

  // Filtramos cuántos niños hay en la categoría seleccionada
  const jugadoresDeLaCategoria = categoriaSeleccionada 
    ? jugadoresTotales.filter(j => j.categorias?.some((c: any) => c.id === categoriaSeleccionada))
    : [];

  const handleConvocar = async () => {
    if (jugadoresDeLaCategoria.length === 0) return alert('No hay jugadores en esta categoría.');
    
    const confirmar = window.confirm(`¿Estás seguro de enviar un mensaje de WhatsApp a los ${jugadoresDeLaCategoria.length} jugadores de esta categoría?`);
    if (!confirmar) return;

    setEnviando(true);
    try {
      const jugadoresIds = jugadoresDeLaCategoria.map(j => j.id);
      await api.post(`/api/torneos/${id}/convocar`, { jugadoresIds });
      
      alert('✅ ¡Mensajes de WhatsApp enviados con éxito!');
      setCategoriaSeleccionada('');
      cargarDatos(); // Recargamos para verlos en la tabla de abajo
    } catch (error) {
      console.error('Error al convocar', error);
      alert('Ocurrió un error al enviar las convocatorias.');
    } finally {
      setEnviando(false);
    }
  };

  if (!torneo) return <div className="text-[#289E9D] text-center mt-10">Cargando gestión del torneo...</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/torneos')} className="text-gray-400 hover:text-white transition-colors">
            ← Volver
          </button>
          <h1 className="text-3xl font-bold text-[#e6edf3]">Gestión: {torneo.nombre}</h1>
        </div>
        <div className="bg-[#161b22] border border-[#30363d] px-4 py-2 rounded-lg text-sm text-gray-300">
          Costo Inscripción: <strong className="text-[#289E9D] text-lg">${torneo.costo_inscripcion.toLocaleString('es-CL')}</strong>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* PANEL IZQUIERDO: EL DISPARADOR DE WHATSAPP */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-2xl">📢</span> Invitar por Categoría
            </h3>
            <p className="text-xs text-gray-400 mb-6">Selecciona una categoría. El bot enviará la invitación por WhatsApp a todos los jugadores que pertenezcan a ella.</p>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-400 mb-1">Seleccionar Categoría</label>
                <select 
                  value={categoriaSeleccionada}
                  onChange={(e) => setCategoriaSeleccionada(e.target.value)}
                  className="w-full bg-[#161b22] border border-[#30363d] rounded-lg p-3 text-white focus:border-[#289E9D] outline-none"
                >
                  <option value="">-- Elige una categoría --</option>
                  {categorias.map(c => (
                    <option key={c.id} value={c.id}>{c.nombre}</option>
                  ))}
                </select>
              </div>

              {categoriaSeleccionada && (
                <div className="bg-blue-900/20 border border-blue-500/30 p-3 rounded-lg text-center">
                  <span className="block text-sm text-blue-300">Jugadores a convocar:</span>
                  <span className="text-3xl font-black text-blue-400">{jugadoresDeLaCategoria.length}</span>
                </div>
              )}

              <button 
                onClick={handleConvocar}
                disabled={!categoriaSeleccionada || enviando || jugadoresDeLaCategoria.length === 0}
                className="w-full bg-[#289E9D] hover:bg-[#207f7e] text-white px-4 py-3 rounded-lg font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex justify-center items-center gap-2"
              >
                {enviando ? 'Enviando mensajes...' : (
                  <><span>📲</span> Enviar WhatsApp Masivo</>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: RESPUESTAS EN VIVO */}
        <div className="lg:col-span-2">
          <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6 h-full">
            <h3 className="text-xl font-bold text-white mb-4">✅ Respuestas de Apoderados en Vivo</h3>
            
            {participantes.length === 0 ? (
              <div className="text-center text-gray-500 mt-20">
                Aún no has enviado convocatorias para este torneo.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]">
                    <tr>
                      <th className="p-3">Jugador</th>
                      <th className="p-3 text-center">Respuesta Bot</th>
                      <th className="p-3 text-center">Finanzas (Cuotas)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#30363d]">
                    {participantes.map(p => (
                      <tr key={p.id} className="hover:bg-[#161b22] transition-colors">
                        <td className="p-3 flex items-center gap-3">
                          <img src={p.jugadores?.foto_base64 || 'https://via.placeholder.com/150'} className="w-8 h-8 rounded-full object-cover" alt="jugador"/>
                          <span className="font-bold text-white">{p.jugadores?.nombre}</span>
                        </td>
                        <td className="p-3 text-center">
                          {p.respuesta_participacion === 'Pendiente' && <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 px-2 py-1 rounded text-xs font-bold">⏳ Pendiente</span>}
                          {p.respuesta_participacion === 'Si' && <span className="bg-green-500/20 text-green-400 border border-green-500/50 px-2 py-1 rounded text-xs font-bold">✔️ Confirmado</span>}
                          {p.respuesta_participacion === 'No' && <span className="bg-red-500/20 text-red-400 border border-red-500/50 px-2 py-1 rounded text-xs font-bold">❌ Rechazado</span>}
                        </td>
                        <td className="p-3 text-center text-gray-300">
                          {p.respuesta_participacion === 'Si' ? (
                            p.pago_en_cuotas ? `${p.numero_cuotas} Cuotas` : 'Pago Contado'
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default GestionarTorneo;

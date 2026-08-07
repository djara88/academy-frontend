// src/pages/Torneos.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

interface Torneo {
  id: string;
  nombre: string;
  fecha_inicio: string;
  fecha_fin: string;
  costo_inscripcion: number;
  permite_cuotas: boolean;
  max_cuotas: number;
  estado: string;
}

const Torneos: React.FC = () => {
  const navigate = useNavigate();
  const [torneos, setTorneos] = useState<Torneo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarTorneos();
  }, []);

  const cargarTorneos = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/torneos');
      setTorneos(response.data.data || []);
      setError('');
    } catch (err: any) {
      console.error('Error al cargar torneos:', err);
      setError(err.response?.data?.error || 'Error al cargar torneos');
    } finally {
      setLoading(false);
    }
  };

  const irANuevoTorneo = () => {
    navigate('/nuevo-torneo');
  };

  const gestionarTorneo = (torneoId: string) => {
    navigate(`/torneos/${torneoId}`);
  };

  const verPartidos = (torneoId: string) => {
    navigate(`/partidos?torneo_id=${torneoId}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-extrabold text-[#e6edf3]">🏆 Torneos y Campeonatos</h1>
        <button 
          onClick={irANuevoTorneo} 
          className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-5 py-2.5 rounded-lg font-bold transition-colors shadow-lg shadow-[#289E9D]/20 cursor-pointer"
        >
          + Nuevo Torneo
        </button>
      </div>

      {error && (
        <div className="bg-red-900/50 border border-red-500/50 text-red-300 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="bg-[#0d1117] border border-[#30363d] rounded-xl p-6">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-[#289E9D] font-bold">Cargando torneos...</div>
          </div>
        ) : torneos.length === 0 ? (
          <div className="text-center py-10 space-y-3">
            <span className="text-4xl">⚽</span>
            <p className="text-gray-400">No hay torneos registrados en tu academia.</p>
            <button onClick={irANuevoTorneo} className="text-[#289E9D] underline font-bold text-sm">
              Crear el primer torneo
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-[#161b22] text-[#8b949e] border-b border-[#30363d]">
                <tr>
                  <th className="p-4">Nombre</th>
                  <th className="p-4">Costo Inscripción</th>
                  <th className="p-4">Cuotas</th>
                  <th className="p-4">Estado</th>
                  <th className="p-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]">
                {torneos.map((torneo) => (
                  <tr key={torneo.id} className="hover:bg-[#161b22] transition-colors">
                    <td className="p-4 font-bold text-white">{torneo.nombre}</td>
                    <td className="p-4 text-gray-300">
                      {torneo.costo_inscripcion > 0 ? `$${torneo.costo_inscripcion.toLocaleString('es-CL')}` : 'Gratuito'}
                    </td>
                    <td className="p-4 text-gray-300">
                      {torneo.permite_cuotas ? `Hasta ${torneo.max_cuotas} cuotas` : 'Pago único'}
                    </td>
                    <td className="p-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        torneo.estado === 'Activo'
                          ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                          : 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                      }`}>
                        {torneo.estado}
                      </span>
                    </td>
                    <td className="p-4 flex justify-center gap-2">
                      <button
                        onClick={() => gestionarTorneo(torneo.id)}
                        className="bg-[#289E9D] hover:bg-[#207f7e] text-white px-3 py-1.5 rounded text-xs font-bold transition-colors shadow-sm"
                      >
                        ⚙️ Convocatorias y Bot
                      </button>
                      <button
                        onClick={() => verPartidos(torneo.id)}
                        className="bg-[#21262d] hover:bg-[#30363d] text-white px-3 py-1.5 rounded text-xs font-semibold border border-[#30363d] transition-colors"
                      >
                        ⚽ Partidos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Torneos;

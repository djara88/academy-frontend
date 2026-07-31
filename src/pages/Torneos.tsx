import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

interface Torneo {
  id: string;
  nombre_torneo: string;
  temporada: string;
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
    navigate('/torneos/nuevo');
  };

  const verPartidos = (torneoId: string) => {
    navigate(`/torneos/${torneoId}/partidos`);
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-[#e6edf3] mb-6">🏆 Torneos</h1>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#e6edf3]">Lista de Torneos</h2>
          <button onClick={irANuevoTorneo} className="btn-primary">
            + Nuevo Torneo
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-[#8b949e]">Cargando torneos...</div>
          </div>
        ) : torneos.length === 0 ? (
          <p className="text-[#8b949e]">No hay torneos registrados.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1c2331] text-[#8b949e]">
                <tr>
                  <th className="text-left p-3 rounded-tl-lg">Nombre</th>
                  <th className="text-left p-3">Temporada</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3 rounded-tr-lg">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {torneos.map((torneo) => (
                  <tr key={torneo.id} className="border-t border-[#2d3a4f] hover:bg-[#1c2331] transition-colors">
                    <td className="p-3 font-medium">{torneo.nombre_torneo}</td>
                    <td className="p-3">{torneo.temporada}</td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        torneo.estado === 'Activo'
                          ? 'bg-[#00e676] text-[#0d1117]'
                          : 'bg-[#e74c3c] text-white'
                      }`}>
                        {torneo.estado}
                      </span>
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => verPartidos(torneo.id)}
                        className="btn-secondary text-xs mr-2"
                      >
                        Ver Partidos
                      </button>
                      <button className="btn-secondary text-xs">Editar</button>
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

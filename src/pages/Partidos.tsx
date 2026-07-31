import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../api/axiosConfig';

interface Partido {
  id: string;
  rival: string;
  fecha_partido: string;
  categoria_jugando: string;
  goles_axf: number;
  goles_rival: number;
  estado: string;
  direccion: string;
}

const Partidos: React.FC = () => {
  const navigate = useNavigate();
  const { torneoId } = useParams<{ torneoId: string }>();
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (torneoId) {
      cargarPartidos();
    }
  }, [torneoId]);

  const cargarPartidos = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/partidos/torneo/${torneoId}`);
      setPartidos(response.data.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar partidos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-[#e6edf3] mb-6">⚽ Partidos</h1>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#e6edf3]">Lista de Partidos</h2>
          <button
            onClick={() => navigate(`/torneos/${torneoId}/partidos/nuevo`)}
            className="btn-primary"
          >
            + Programar Partido
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-[#8b949e]">Cargando partidos...</div>
          </div>
        ) : partidos.length === 0 ? (
          <p className="text-[#8b949e]">No hay partidos programados para este torneo.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1c2331] text-[#8b949e]">
                <tr>
                  <th className="text-left p-3 rounded-tl-lg">Rival</th>
                  <th className="text-left p-3">Fecha</th>
                  <th className="text-left p-3">Categoría</th>
                  <th className="text-left p-3">Resultado</th>
                  <th className="text-left p-3">Estado</th>
                  <th className="text-left p-3 rounded-tr-lg">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {partidos.map((partido) => (
                  <tr key={partido.id} className="border-t border-[#2d3a4f] hover:bg-[#1c2331] transition-colors">
                    <td className="p-3 font-medium">{partido.rival}</td>
                    <td className="p-3">{partido.fecha_partido}</td>
                    <td className="p-3">{partido.categoria_jugando}</td>
                    <td className="p-3">
                      {partido.estado === 'Jugado' ? (
                        <span className="font-bold">
                          {partido.goles_axf} - {partido.goles_rival}
                        </span>
                      ) : (
                        <span className="text-[#8b949e]">Por jugar</span>
                      )}
                    </td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        partido.estado === 'Jugado'
                          ? 'bg-[#00e676] text-[#0d1117]'
                          : partido.estado === 'Programado'
                          ? 'bg-[#f39c12] text-[#0d1117]'
                          : 'bg-[#e74c3c] text-white'
                      }`}>
                        {partido.estado}
                      </span>
                    </td>
                    <td className="p-3">
                      <button className="btn-secondary text-xs mr-2">Ver</button>
                      {partido.estado !== 'Jugado' && (
                        <button className="btn-secondary text-xs">Editar</button>
                      )}
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

export default Partidos;

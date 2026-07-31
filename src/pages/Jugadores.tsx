import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import { PencilIcon, TrashIcon, EyeIcon, UserPlusIcon } from '@heroicons/react/24/outline';

interface Jugador {
  id: string;
  nombre: string;
  posicion_cancha: string;
  talla_uniforme: string;
  numero_camiseta: number;
  estado_uniforme: string;
  tutor: { nombre_completo: string };
}

const Jugadores: React.FC = () => {
  const navigate = useNavigate();
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    cargarJugadores();
  }, []);

  const cargarJugadores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/jugadores');
      setJugadores(response.data.data || []);
    } catch (err: any) {
      console.error('Error al cargar jugadores:', err);
      setError(err.response?.data?.error || 'Error al cargar jugadores');
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (id: string) => {
    if (!confirm('¿Seguro que deseas eliminar este jugador?')) return;
    try {
      await api.delete(`/api/jugadores/${id}`);
      cargarJugadores();
    } catch (err: any) {
      console.error('Error al eliminar jugador:', err);
      setError(err.response?.data?.error || 'Error al eliminar jugador');
    }
  };

  const jugadoresFiltrados = jugadores.filter(j =>
    j.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-extrabold text-[#e6edf3]">👥 Jugadores</h1>
        <button
          onClick={() => navigate('/matricula')}
          className="btn-primary flex items-center gap-2"
        >
          <UserPlusIcon className="w-5 h-5" />
          Nueva Matrícula
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="🔍 Buscar jugador por nombre..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full max-w-md"
        />
      </div>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="text-[#8b949e]">Cargando jugadores...</div>
        </div>
      ) : (
        <div className="card p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#1c2331] text-[#8b949e]">
                <tr>
                  <th className="text-left p-3 rounded-tl-lg">Nombre</th>
                  <th className="text-left p-3">Posición</th>
                  <th className="text-left p-3">Talla</th>
                  <th className="text-left p-3">N° Camiseta</th>
                  <th className="text-left p-3">Apoderado</th>
                  <th className="text-left p-3">Uniforme</th>
                  <th className="text-left p-3 rounded-tr-lg">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {jugadoresFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center p-4 text-[#8b949e]">
                      No hay jugadores registrados.
                    </td>
                  </tr>
                ) : (
                  jugadoresFiltrados.map((jugador) => (
                    <tr key={jugador.id} className="border-t border-[#2d3a4f] hover:bg-[#1c2331] transition-colors">
                      <td className="p-3 font-medium">{jugador.nombre}</td>
                      <td className="p-3">{jugador.posicion_cancha}</td>
                      <td className="p-3">{jugador.talla_uniforme}</td>
                      <td className="p-3">#{jugador.numero_camiseta}</td>
                      <td className="p-3">{jugador.tutor?.nombre_completo || 'N/A'}</td>
                      <td className="p-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            jugador.estado_uniforme === 'Entregado'
                              ? 'bg-[#00e676] text-[#0d1117]'
                              : 'bg-[#e74c3c] text-white'
                          }`}
                        >
                          {jugador.estado_uniforme}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => navigate(`/jugadores/${jugador.id}`)}
                            className="btn-secondary flex items-center gap-1 text-xs"
                          >
                            <EyeIcon className="w-4 h-4" />
                            Ver
                          </button>
                          <button
                            onClick={() => navigate(`/jugadores/${jugador.id}/editar`)}
                            className="btn-secondary flex items-center gap-1 text-xs"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Editar
                          </button>
                          <button
                            onClick={() => handleEliminar(jugador.id)}
                            className="btn-danger flex items-center gap-1 text-xs"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Jugadores;

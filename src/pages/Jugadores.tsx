import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';

interface Jugador {
  id: string;
  nombre: string;
  posicion_cancha: string;
  talla_uniforme: string;
  numero_camiseta: number;
  estado_uniforme: string;
  tutor: {
    nombre_completo: string;
    telefono: string;
    email: string;
  };
}

const Jugadores: React.FC = () => {
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarJugadores();
  }, []);

  const cargarJugadores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/jugadores');
      setJugadores(response.data.data || []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Error al cargar jugadores');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-[#e6edf3] mb-6">👥 Jugadores</h1>

      {error && (
        <div className="bg-[#2c1a1a] border border-[#e74c3c] text-[#e74c3c] px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      <div className="card p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-[#e6edf3]">Lista de Jugadores</h2>
          <Link to="/matricula" className="btn-primary">
            + Nueva Matrícula
          </Link>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <div className="text-[#8b949e]">Cargando jugadores...</div>
          </div>
        ) : jugadores.length === 0 ? (
          <p className="text-[#8b949e]">No hay jugadores registrados.</p>
        ) : (
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
                {jugadores.map((jugador) => (
                  <tr key={jugador.id} className="border-t border-[#2d3a4f] hover:bg-[#1c2331] transition-colors">
                    <td className="p-3 font-medium">{jugador.nombre}</td>
                    <td className="p-3">{jugador.posicion_cancha}</td>
                    <td className="p-3">{jugador.talla_uniforme}</td>
                    <td className="p-3">#{jugador.numero_camiseta}</td>
                    <td className="p-3">
                      <div className="text-sm">
                        <div>{jugador.tutor?.nombre_completo || 'Sin tutor'}</div>
                        <div className="text-[#8b949e] text-xs">{jugador.tutor?.telefono}</div>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        jugador.estado_uniforme === 'Entregado'
                          ? 'bg-[#00e676] text-[#0d1117]'
                          : 'bg-[#e74c3c] text-white'
                      }`}>
                        {jugador.estado_uniforme}
                      </span>
                    </td>
                    <td className="p-3">
                      <Link to={`/jugadores/${jugador.id}`} className="btn-secondary text-xs mr-2">
                        Ver
                      </Link>
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

export default Jugadores;

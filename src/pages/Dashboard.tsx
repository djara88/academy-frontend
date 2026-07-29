import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import api from '../api/axiosConfig';

interface Jugador {
  id: string;
  nombre: string;
  posicion_cancha: string;
  talla_uniforme: string;
  numero_camiseta: number;
  estado_uniforme: string;
}

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

  const { data: jugadores, isLoading, error } = useQuery({
    queryKey: ['jugadores'],
    queryFn: async () => {
      const response = await api.get('/api/jugadores');
      return response.data.data as Jugador[];
    },
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          Dashboard - {user?.nombre_completo}
        </h1>
        <button
          onClick={logout}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
        >
          Cerrar Sesión
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-blue-500">
          <div className="text-sm text-gray-500">Total Alumnos</div>
          <div className="text-2xl font-bold">{jugadores?.length || 0}</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-green-500">
          <div className="text-sm text-gray-500">Uniforme Pendiente</div>
          <div className="text-2xl font-bold">
            {jugadores?.filter(j => j.estado_uniforme === 'Pendiente').length || 0}
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="text-sm text-gray-500">Próximos Partidos</div>
          <div className="text-2xl font-bold">0</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border-l-4 border-purple-500">
          <div className="text-sm text-gray-500">Cumpleaños del Mes</div>
          <div className="text-2xl font-bold">0</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Lista de Jugadores</h2>
        {isLoading && <p>Cargando jugadores...</p>}
        {error && <p className="text-red-600">Error al cargar jugadores</p>}
        {jugadores && jugadores.length === 0 && (
          <p className="text-gray-500">No hay jugadores registrados.</p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Nombre</th>
                <th className="text-left p-2">Posición</th>
                <th className="text-left p-2">Talla</th>
                <th className="text-left p-2">N° Camiseta</th>
                <th className="text-left p-2">Uniforme</th>
              </tr>
            </thead>
            <tbody>
              {jugadores?.map((jugador) => (
                <tr key={jugador.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="p-2 font-medium">{jugador.nombre}</td>
                  <td className="p-2">{jugador.posicion_cancha}</td>
                  <td className="p-2">{jugador.talla_uniforme}</td>
                  <td className="p-2">#{jugador.numero_camiseta}</td>
                  <td className="p-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      jugador.estado_uniforme === 'Entregado' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {jugador.estado_uniforme}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
